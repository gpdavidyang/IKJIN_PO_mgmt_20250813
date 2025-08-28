/**
 * Audit Logging Middleware
 * 시스템 전체 활동을 추적하고 기록하는 미들웨어
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { systemAuditLogs, auditSettings } from '@shared/schema';
import { eq, isNull } from 'drizzle-orm';

interface AuditRequest extends Request {
  auditLog?: {
    startTime: number;
    eventType?: string;
    eventCategory?: string;
    entityType?: string;
    entityId?: string;
    oldValue?: any;
    newValue?: any;
    details?: any;
  };
}

// 로그 레벨 우선순위
const LOG_LEVELS = {
  OFF: 0,
  ERROR: 1,
  WARNING: 2,
  INFO: 3,
  DEBUG: 4,
};

// 캐시된 설정
let cachedSettings: any = null;
let settingsCacheTime = 0;
const CACHE_TTL = 60000; // 1분

// 감사 설정 가져오기 (캐시 사용)
async function getAuditSettings() {
  const now = Date.now();
  if (cachedSettings && (now - settingsCacheTime) < CACHE_TTL) {
    return cachedSettings;
  }

  try {
    const settings = await db.select().from(auditSettings).limit(1);
    cachedSettings = settings[0] || {
      logLevel: 'INFO',
      enableAuth: true,
      enableData: true,
      enableSystem: true,
      enableSecurity: true,
      excludedPaths: [],
      excludedUsers: [],
      sensitiveDataMasking: true,
      performanceTracking: false,
      apiAccessLogging: false,
    };
    settingsCacheTime = now;
    return cachedSettings;
  } catch (error) {
    console.error('Failed to load audit settings:', error);
    return cachedSettings || { 
      logLevel: 'INFO', 
      enableAuth: true,
      enableData: true,
      enableSystem: true,
      enableSecurity: true,
      excludedPaths: [],
      excludedUsers: [],
      sensitiveDataMasking: true,
      performanceTracking: false,
      apiAccessLogging: false,
    };
  }
}

// 민감한 데이터 마스킹
function maskSensitiveData(data: any): any {
  if (!data) return data;
  
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'email', 'phone'];
  
  if (typeof data === 'string') {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item));
  }
  
  if (typeof data === 'object') {
    const masked = { ...data };
    for (const key of Object.keys(masked)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        masked[key] = '***MASKED***';
      } else if (typeof masked[key] === 'object') {
        masked[key] = maskSensitiveData(masked[key]);
      }
    }
    return masked;
  }
  
  return data;
}

// 이벤트 카테고리 결정
function determineEventCategory(path: string, method: string): string {
  if (path.includes('/auth') || path.includes('/login') || path.includes('/logout')) {
    return 'auth';
  }
  if (path.includes('/api/admin') || path.includes('/settings')) {
    return 'system';
  }
  if (method === 'GET') {
    return 'data';
  }
  if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
    return 'data';
  }
  return 'api';
}

// 이벤트 타입 결정
function determineEventType(path: string, method: string, statusCode: number): string {
  if (path.includes('/login')) {
    return statusCode === 200 ? 'login' : 'login_failed';
  }
  if (path.includes('/logout')) {
    return 'logout';
  }
  if (path.includes('/password')) {
    return 'password_change';
  }
  if (path.includes('/permission') || path.includes('/role')) {
    return 'permission_change';
  }
  if (path.includes('/approval')) {
    if (method === 'POST') return 'approval_request';
    if (method === 'PUT') return statusCode === 200 ? 'approval_grant' : 'approval_reject';
  }
  if (path.includes('/email')) {
    return 'email_send';
  }
  if (path.includes('/upload')) {
    return 'file_upload';
  }
  if (path.includes('/download')) {
    return 'file_download';
  }
  if (path.includes('/settings')) {
    return 'settings_change';
  }
  
  // CRUD operations
  switch (method) {
    case 'POST':
      return 'data_create';
    case 'GET':
      return 'data_read';
    case 'PUT':
    case 'PATCH':
      return 'data_update';
    case 'DELETE':
      return 'data_delete';
    default:
      return 'api_access';
  }
}

// 엔티티 정보 추출
function extractEntityInfo(path: string, body: any): { type?: string; id?: string } {
  const pathParts = path.split('/').filter(p => p);
  
  // 주요 엔티티 패턴
  const entities = ['orders', 'users', 'vendors', 'projects', 'items', 'companies'];
  
  for (let i = 0; i < pathParts.length; i++) {
    if (entities.includes(pathParts[i])) {
      return {
        type: pathParts[i].slice(0, -1), // Remove 's' from plural
        id: pathParts[i + 1] || body?.id
      };
    }
  }
  
  return {};
}

// Audit 로깅 미들웨어
export function auditLogger(req: AuditRequest, res: Response, next: NextFunction) {
  // 시작 시간 기록
  req.auditLog = {
    startTime: Date.now(),
  };
  
  // Response 완료 시 로그 기록
  const originalSend = res.send;
  res.send = function(data) {
    res.send = originalSend;
    
    // 비동기로 로그 기록 (성능 영향 최소화)
    setImmediate(async () => {
      try {
        const settings = await getAuditSettings();
        
        // 로그 레벨 확인
        if (settings.logLevel === 'OFF') return;
        
        // 제외 경로 확인
        if (settings.excludedPaths?.some((path: string) => req.path.includes(path))) {
          return;
        }
        
        // 제외 사용자 확인
        if (req.user && settings.excludedUsers?.includes(req.user.id)) {
          return;
        }
        
        const eventCategory = determineEventCategory(req.path, req.method);
        
        // 카테고리 활성화 확인
        const categoryEnabled = 
          (eventCategory === 'auth' && settings.enableAuth) ||
          (eventCategory === 'data' && settings.enableData) ||
          (eventCategory === 'system' && settings.enableSystem) ||
          (eventCategory === 'security' && settings.enableSecurity) ||
          (eventCategory === 'api' && settings.apiAccessLogging);
        
        if (!categoryEnabled) {
          return;
        }
        
        const eventType = determineEventType(req.path, req.method, res.statusCode);
        const { type: entityType, id: entityId } = extractEntityInfo(req.path, req.body);
        
        // 실행 시간 계산
        const executionTime = Date.now() - (req.auditLog?.startTime || Date.now());
        
        // 로그 레벨에 따른 필터링
        const currentLogLevel = LOG_LEVELS[settings.logLevel as keyof typeof LOG_LEVELS] || 3;
        const shouldLog = 
          (res.statusCode >= 400 && currentLogLevel >= LOG_LEVELS.ERROR) ||
          (res.statusCode >= 300 && currentLogLevel >= LOG_LEVELS.WARNING) ||
          (currentLogLevel >= LOG_LEVELS.INFO);
        
        if (!shouldLog) return;
        
        // 로그 데이터 준비
        const logData: any = {
          userId: req.user?.id || null,
          userName: req.user?.name || null,
          userRole: req.user?.role || null,
          eventType,
          eventCategory,
          entityType: entityType || req.auditLog?.entityType,
          entityId: entityId || req.auditLog?.entityId,
          action: `${req.method} ${req.path}`,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'],
          sessionId: req.sessionID,
          requestMethod: req.method,
          requestPath: req.path,
          responseStatus: res.statusCode,
          responseTime: executionTime,
        };
        
        // 세부 정보 추가 (민감 데이터 마스킹)
        if (currentLogLevel >= LOG_LEVELS.DEBUG || res.statusCode >= 400) {
          const details: any = {
            query: req.query,
            params: req.params,
          };
          
          // Body는 크기 제한
          if (req.body && JSON.stringify(req.body).length < 10000) {
            details.body = settings.sensitiveDataMasking ? maskSensitiveData(req.body) : req.body;
          }
          
          logData.additionalDetails = JSON.stringify(details);
          
          // 에러 정보
          if (res.statusCode >= 400) {
            const responseData = typeof data === 'string' ? { message: data } : data;
            logData.errorMessage = responseData?.message || responseData?.error;
          }
        }
        
        // 변경 전후 값 (UPDATE 작업의 경우)
        if (req.auditLog?.oldValue) {
          logData.oldData = JSON.stringify(
            settings.sensitiveDataMasking 
              ? maskSensitiveData(req.auditLog.oldValue) 
              : req.auditLog.oldValue
          );
        }
        if (req.auditLog?.newValue) {
          logData.newData = JSON.stringify(
            settings.sensitiveDataMasking 
              ? maskSensitiveData(req.auditLog.newValue) 
              : req.auditLog.newValue
          );
        }
        
        // 데이터베이스에 로그 저장
        await db.insert(systemAuditLogs).values(logData);
        
      } catch (error) {
        // 로깅 실패 시 에러만 출력 (시스템 중단 방지)
        console.error('Audit logging failed:', error);
      }
    });
    
    return originalSend.call(this, data);
  };
  
  next();
}

// 특정 이벤트 로깅 헬퍼 함수
export async function logAuditEvent(
  eventType: string,
  eventCategory: string,
  details: {
    userId?: string;
    userName?: string;
    userRole?: string;
    entityType?: string;
    entityId?: string;
    action: string;
    oldValue?: any;
    newValue?: any;
    additionalDetails?: any;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  }
) {
  try {
    const settings = await getAuditSettings();
    
    if (settings.logLevel === 'OFF') return;
    
    // Check if category is enabled
    const categoryEnabled = 
      (eventCategory === 'auth' && settings.enableAuth) ||
      (eventCategory === 'data' && settings.enableData) ||
      (eventCategory === 'system' && settings.enableSystem) ||
      (eventCategory === 'security' && settings.enableSecurity);
    
    if (!categoryEnabled) return;
    
    await db.insert(systemAuditLogs).values({
      userId: details.userId || null,
      userName: details.userName || null,
      userRole: details.userRole || null,
      eventType: eventType as any,
      eventCategory,
      entityType: details.entityType,
      entityId: details.entityId,
      action: details.action,
      additionalDetails: details.additionalDetails ? JSON.stringify(details.additionalDetails) : null,
      oldData: details.oldValue ? JSON.stringify(details.oldValue) : null,
      newData: details.newValue ? JSON.stringify(details.newValue) : null,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      sessionId: details.sessionId,
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}