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

// 엔티티 매핑 테이블
const entityMapping: Record<string, { type: string; tableName: string; displayName: string }> = {
  'orders': { type: 'purchase_order', tableName: 'purchase_orders', displayName: '발주서' },
  'vendors': { type: 'vendor', tableName: 'vendors', displayName: '거래처' },
  'items': { type: 'item', tableName: 'items', displayName: '품목' },
  'users': { type: 'user', tableName: 'users', displayName: '사용자' },
  'projects': { type: 'project', tableName: 'projects', displayName: '프로젝트' },
  'companies': { type: 'company', tableName: 'companies', displayName: '회사' },
  'approvals': { type: 'approval', tableName: 'approvals', displayName: '승인' },
  'templates': { type: 'template', tableName: 'order_templates', displayName: '템플릿' },
  'categories': { type: 'category', tableName: 'item_categories', displayName: '카테고리' },
  'positions': { type: 'position', tableName: 'positions', displayName: '직급' }
};

// 엔티티 정보 추출
function extractEntityInfo(path: string, body: any): { 
  type?: string; 
  id?: string; 
  tableName?: string;
  displayName?: string;
} {
  const pathParts = path.split('/').filter(p => p);
  
  for (let i = 0; i < pathParts.length; i++) {
    const mapping = entityMapping[pathParts[i]];
    if (mapping) {
      return {
        type: mapping.type,
        id: pathParts[i + 1] || body?.id,
        tableName: mapping.tableName,
        displayName: mapping.displayName
      };
    }
  }
  
  return {};
}

// 의미 있는 action 설명 생성
function generateActionDescription(
  method: string, 
  path: string, 
  entityInfo: any,
  body?: any,
  statusCode?: number
): string {
  const { displayName, id } = entityInfo;
  
  if (!displayName) {
    return `${method} ${path}`;
  }
  
  // 엔티티별 특별 처리
  if (path.includes('/orders')) {
    if (method === 'POST') {
      return `${displayName} 생성 (${body?.orderNumber || '신규'})`;
    } else if (method === 'PUT' || method === 'PATCH') {
      const changes = [];
      if (body?.orderStatus) changes.push(`상태: ${body.orderStatus}`);
      if (body?.approvalStatus) changes.push(`승인: ${body.approvalStatus}`);
      return `${displayName} ${body?.orderNumber || id} 수정${changes.length ? ` (${changes.join(', ')})` : ''}`;
    } else if (method === 'DELETE') {
      return `${displayName} ${body?.orderNumber || id} 삭제`;
    }
  }
  
  // 일반적인 CRUD 작업
  switch (method) {
    case 'POST':
      return `${displayName} 생성${body?.name ? ` (${body.name})` : ''}`;
    case 'PUT':
    case 'PATCH':
      return `${displayName} ${id || ''} 수정`;
    case 'DELETE':
      return `${displayName} ${id || ''} 삭제`;
    case 'GET':
      return `${displayName} ${id ? '조회' : '목록 조회'}`;
    default:
      return `${displayName} ${method} 작업`;
  }
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
        const entityInfo = extractEntityInfo(req.path, req.body);
        
        // 실행 시간 계산
        const executionTime = Date.now() - (req.auditLog?.startTime || Date.now());
        
        // 로그 레벨에 따른 필터링
        const currentLogLevel = LOG_LEVELS[settings.logLevel as keyof typeof LOG_LEVELS] || 3;
        const shouldLog = 
          (res.statusCode >= 400 && currentLogLevel >= LOG_LEVELS.ERROR) ||
          (res.statusCode >= 300 && currentLogLevel >= LOG_LEVELS.WARNING) ||
          (currentLogLevel >= LOG_LEVELS.INFO);
        
        if (!shouldLog) return;
        
        // 의미 있는 action 설명 생성
        const actionDescription = generateActionDescription(
          req.method,
          req.path,
          entityInfo,
          req.body,
          res.statusCode
        );
        
        // 로그 데이터 준비
        const logData: any = {
          userId: req.user?.id || null,
          userName: req.user?.name || null,
          userRole: req.user?.role || null,
          eventType,
          eventCategory,
          entityType: entityInfo.type || req.auditLog?.entityType,
          entityId: entityInfo.id || req.auditLog?.entityId,
          tableName: entityInfo.tableName,
          action: actionDescription,
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
            details.body = maskSensitiveData(req.body);
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
          logData.oldData = JSON.stringify(maskSensitiveData(req.auditLog.oldValue));
        }
        if (req.auditLog?.newValue) {
          logData.newData = JSON.stringify(maskSensitiveData(req.auditLog.newValue));
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
    tableName?: string;
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
      tableName: details.tableName,
      action: details.action,
      additionalDetails: details.additionalDetails ? JSON.stringify(details.additionalDetails) : null,
      oldData: details.oldValue ? JSON.stringify(maskSensitiveData(details.oldValue)) : null,
      newData: details.newValue ? JSON.stringify(maskSensitiveData(details.newValue)) : null,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      sessionId: details.sessionId,
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}