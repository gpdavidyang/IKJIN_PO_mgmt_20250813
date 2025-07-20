/**
 * CSRF (Cross-Site Request Forgery) 보안 미들웨어
 * 
 * CSRF 공격으로부터 애플리케이션을 보호하는 포괄적인 보안 시스템:
 * - 토큰 기반 CSRF 보호
 * - SameSite 쿠키 설정
 * - Origin/Referer 검증
 * - 커스텀 헤더 검증
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    email?: string;
  };
  csrfToken?: string;
}

interface CSRFConfig {
  secret: string;
  cookieName: string;
  headerName: string;
  tokenLength: number;
  ignoreMethods: string[];
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  httpOnly: boolean;
  maxAge: number;
}

/**
 * 기본 CSRF 설정
 */
const DEFAULT_CONFIG: CSRFConfig = {
  secret: process.env.CSRF_SECRET || 'csrf-secret-change-in-production',
  cookieName: '_csrf',
  headerName: 'x-csrf-token',
  tokenLength: 32,
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  httpOnly: false, // 클라이언트에서 읽을 수 있어야 함
  maxAge: 4 * 60 * 60 * 1000, // 4시간
};

/**
 * CSRF 보호가 필요한 엔드포인트 패턴
 */
const PROTECTED_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/2fa/*',
  '/api/orders',
  '/api/orders/*',
  '/api/vendors',
  '/api/vendors/*',
  '/api/items',
  '/api/items/*',
  '/api/companies/*',
  '/api/excel-automation/*',
  '/api/po-template/*',
  '/api/admin/*',
];

/**
 * CSRF 보호에서 제외할 엔드포인트
 */
const EXCLUDED_ENDPOINTS = [
  '/api/auth/user', // GET 요청이므로 제외
  '/api/dashboard/*', // 읽기 전용
  '/api/health',
  '/api/ping',
];

/**
 * CSRF 토큰 생성
 */
function generateToken(secret: string, sessionId: string): string {
  const timestamp = Date.now().toString();
  const randomBytes = crypto.randomBytes(16).toString('hex');
  const payload = `${sessionId}:${timestamp}:${randomBytes}`;
  
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const signature = hmac.digest('hex');
  
  return Buffer.from(`${payload}:${signature}`).toString('base64');
}

/**
 * CSRF 토큰 검증
 */
function verifyToken(token: string, secret: string, sessionId: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split(':');
    
    if (parts.length !== 4) return false;
    
    const [tokenSessionId, timestamp, randomBytes, signature] = parts;
    
    // 세션 ID 검증
    if (tokenSessionId !== sessionId) return false;
    
    // 토큰 만료 검증 (4시간)
    const tokenAge = Date.now() - parseInt(timestamp);
    if (tokenAge > DEFAULT_CONFIG.maxAge) return false;
    
    // 서명 검증
    const payload = `${tokenSessionId}:${timestamp}:${randomBytes}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    return false;
  }
}

/**
 * 엔드포인트가 보호 대상인지 확인
 */
function isProtectedEndpoint(path: string): boolean {
  // 제외 목록 먼저 확인
  for (const pattern of EXCLUDED_ENDPOINTS) {
    const regex = new RegExp(pattern.replace('*', '.*'));
    if (regex.test(path)) return false;
  }
  
  // 보호 목록 확인
  for (const pattern of PROTECTED_ENDPOINTS) {
    const regex = new RegExp(pattern.replace('*', '.*'));
    if (regex.test(path)) return true;
  }
  
  return false;
}

/**
 * Origin/Referer 검증
 */
function verifyOrigin(req: Request): boolean {
  const origin = req.get('Origin');
  const referer = req.get('Referer');
  const host = req.get('Host');
  
  if (!host) return false;
  
  const allowedOrigins = [
    `http://${host}`,
    `https://${host}`,
    `http://localhost:${process.env.PORT || 3000}`,
    `http://127.0.0.1:${process.env.PORT || 3000}`,
  ];
  
  // 추가 허용 도메인 (환경변수에서)
  const extraOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
  allowedOrigins.push(...extraOrigins);
  
  // Origin 헤더 검증
  if (origin) {
    return allowedOrigins.includes(origin);
  }
  
  // Referer 헤더 검증 (Origin이 없는 경우)
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
      return allowedOrigins.includes(refererOrigin);
    } catch {
      return false;
    }
  }
  
  return false;
}

/**
 * CSRF 토큰 생성 미들웨어
 */
export const csrfTokenGenerator = (config: Partial<CSRFConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // 세션 ID 가져오기
    const sessionId = req.sessionID || req.session?.id || 'anonymous';
    
    // 기존 토큰 확인
    let token = req.cookies[finalConfig.cookieName];
    
    // 토큰이 없거나 유효하지 않으면 새로 생성
    if (!token || !verifyToken(token, finalConfig.secret, sessionId)) {
      token = generateToken(finalConfig.secret, sessionId);
      
      // 쿠키에 저장
      res.cookie(finalConfig.cookieName, token, {
        httpOnly: finalConfig.httpOnly,
        secure: finalConfig.secure,
        sameSite: finalConfig.sameSite,
        maxAge: finalConfig.maxAge,
      });
    }
    
    // 요청 객체에 토큰 첨부
    req.csrfToken = token;
    
    next();
  };
};

/**
 * CSRF 보호 미들웨어
 */
export const csrfProtection = (config: Partial<CSRFConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // 무시할 메서드 확인
    if (finalConfig.ignoreMethods.includes(req.method)) {
      return next();
    }
    
    // 보호 대상 엔드포인트 확인
    if (!isProtectedEndpoint(req.path)) {
      return next();
    }
    
    // 개발 환경에서는 선택적으로 무시
    if (process.env.NODE_ENV === 'development' && process.env.CSRF_DISABLED === 'true') {
      console.warn('⚠️ CSRF protection disabled in development mode');
      return next();
    }
    
    try {
      // 세션 ID 가져오기
      const sessionId = req.sessionID || req.session?.id;
      if (!sessionId) {
        return res.status(403).json({
          error: 'CSRF validation failed',
          message: '세션이 유효하지 않습니다.',
          code: 'NO_SESSION'
        });
      }
      
      // Origin/Referer 검증
      if (!verifyOrigin(req)) {
        return res.status(403).json({
          error: 'CSRF validation failed',
          message: '요청 출처가 유효하지 않습니다.',
          code: 'INVALID_ORIGIN'
        });
      }
      
      // CSRF 토큰 확인
      const token = req.get(finalConfig.headerName) || 
                   req.body._csrf || 
                   req.query._csrf;
      
      if (!token) {
        return res.status(403).json({
          error: 'CSRF validation failed',
          message: 'CSRF 토큰이 필요합니다.',
          code: 'MISSING_TOKEN'
        });
      }
      
      // 토큰 검증
      if (!verifyToken(token, finalConfig.secret, sessionId)) {
        return res.status(403).json({
          error: 'CSRF validation failed',
          message: 'CSRF 토큰이 유효하지 않습니다.',
          code: 'INVALID_TOKEN'
        });
      }
      
      next();
    } catch (error) {
      console.error('CSRF protection error:', error);
      res.status(500).json({
        error: 'CSRF validation error',
        message: 'CSRF 검증 중 오류가 발생했습니다.'
      });
    }
  };
};

/**
 * CSRF 토큰 API 엔드포인트
 */
export const csrfTokenEndpoint = (req: AuthenticatedRequest, res: Response) => {
  try {
    const token = req.csrfToken;
    
    if (!token) {
      return res.status(500).json({
        error: 'Token generation failed',
        message: 'CSRF 토큰 생성에 실패했습니다.'
      });
    }
    
    res.json({
      success: true,
      token,
      expires: Date.now() + DEFAULT_CONFIG.maxAge
    });
  } catch (error) {
    console.error('CSRF token endpoint error:', error);
    res.status(500).json({
      error: 'Token generation error',
      message: 'CSRF 토큰 생성 중 오류가 발생했습니다.'
    });
  }
};

/**
 * 조건부 CSRF 보호 (특정 조건에서만 적용)
 */
export const conditionalCSRFProtection = (
  condition: (req: AuthenticatedRequest) => boolean,
  config?: Partial<CSRFConfig>
) => {
  const protection = csrfProtection(config);
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (condition(req)) {
      return protection(req, res, next);
    }
    next();
  };
};

/**
 * 향상된 CSRF 보호 (더블 서브밋 쿠키 패턴)
 */
export const doubleSubmitCSRFProtection = (config: Partial<CSRFConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // 기본 CSRF 검증
    const basicProtection = csrfProtection(config);
    
    basicProtection(req, res, (err) => {
      if (err) return next(err);
      
      // 추가 검증: 쿠키와 헤더의 토큰이 일치하는지 확인
      const cookieToken = req.cookies[finalConfig.cookieName];
      const headerToken = req.get(finalConfig.headerName);
      
      if (cookieToken && headerToken && cookieToken !== headerToken) {
        return res.status(403).json({
          error: 'CSRF validation failed',
          message: '토큰 불일치가 감지되었습니다.',
          code: 'TOKEN_MISMATCH'
        });
      }
      
      next();
    });
  };
};

/**
 * CSRF 보안 헤더 설정
 */
export const csrfSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // SameSite 쿠키 설정 강화
  res.setHeader('Set-Cookie', res.getHeaders()['set-cookie'] || []);
  
  // 추가 보안 헤더
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'"
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', csp);
  
  next();
};

/**
 * CSRF 통계 수집
 */
interface CSRFStats {
  totalRequests: number;
  protectedRequests: number;
  blockedRequests: number;
  blockReasons: Record<string, number>;
  topBlockedIPs: { ip: string; count: number }[];
}

class CSRFStatsCollector {
  private stats: CSRFStats = {
    totalRequests: 0,
    protectedRequests: 0,
    blockedRequests: 0,
    blockReasons: {},
    topBlockedIPs: [],
  };
  
  private blockedIPs = new Map<string, number>();

  recordRequest(protected: boolean = false) {
    this.stats.totalRequests++;
    if (protected) {
      this.stats.protectedRequests++;
    }
  }

  recordBlock(reason: string, ip: string) {
    this.stats.blockedRequests++;
    this.stats.blockReasons[reason] = (this.stats.blockReasons[reason] || 0) + 1;
    
    this.blockedIPs.set(ip, (this.blockedIPs.get(ip) || 0) + 1);
    this.updateTopBlockedIPs();
  }

  private updateTopBlockedIPs() {
    this.stats.topBlockedIPs = Array.from(this.blockedIPs.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));
  }

  getStats(): CSRFStats {
    return { ...this.stats };
  }

  reset() {
    this.stats = {
      totalRequests: 0,
      protectedRequests: 0,
      blockedRequests: 0,
      blockReasons: {},
      topBlockedIPs: [],
    };
    this.blockedIPs.clear();
  }
}

export const csrfStats = new CSRFStatsCollector();

/**
 * CSRF 통계 수집 미들웨어
 */
export const csrfStatsMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const isProtected = isProtectedEndpoint(req.path) && !DEFAULT_CONFIG.ignoreMethods.includes(req.method);
  csrfStats.recordRequest(isProtected);
  
  // 응답 감지
  const originalJson = res.json;
  res.json = function(data: any) {
    if (res.statusCode === 403 && data?.error === 'CSRF validation failed') {
      csrfStats.recordBlock(data.code || 'UNKNOWN', req.ip || 'unknown');
    }
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * 편의 함수들
 */
export const csrfMiddleware = {
  // 기본 보호
  tokenGenerator: csrfTokenGenerator(),
  protection: csrfProtection(),
  
  // 향상된 보호
  doubleSubmit: doubleSubmitCSRFProtection(),
  securityHeaders: csrfSecurityHeaders,
  
  // 조건부 보호
  conditional: conditionalCSRFProtection,
  
  // 관리자 전용 강화 보호
  adminProtection: conditionalCSRFProtection(
    (req) => req.path.startsWith('/api/admin'),
    { sameSite: 'strict' }
  ),
  
  // 통계
  stats: csrfStatsMiddleware,
  
  // API 엔드포인트
  tokenEndpoint: csrfTokenEndpoint,
};

export default csrfMiddleware;