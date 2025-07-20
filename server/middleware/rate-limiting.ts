/**
 * 고급 API Rate Limiting 미들웨어
 * 
 * 다양한 레벨의 rate limiting을 제공:
 * - IP 기반 제한
 * - 사용자 기반 제한
 * - 엔드포인트별 제한
 * - 역할 기반 제한
 */

import { Request, Response, NextFunction } from 'express';
import { rateLimit, RateLimitRequestHandler } from 'express-rate-limit';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    email?: string;
  };
}

/**
 * 기본 Rate Limiting 설정
 */
const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 기본 100개 요청
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
};

/**
 * 역할별 Rate Limit 설정
 */
const ROLE_LIMITS = {
  admin: { windowMs: 15 * 60 * 1000, max: 1000 }, // 관리자: 15분에 1000개
  executive: { windowMs: 15 * 60 * 1000, max: 500 }, // 임원: 15분에 500개
  hq_management: { windowMs: 15 * 60 * 1000, max: 300 }, // 본사관리: 15분에 300개
  project_manager: { windowMs: 15 * 60 * 1000, max: 200 }, // 프로젝트매니저: 15분에 200개
  field_worker: { windowMs: 15 * 60 * 1000, max: 100 }, // 현장작업자: 15분에 100개
};

/**
 * 엔드포인트별 특별 제한
 */
const ENDPOINT_LIMITS = {
  // 인증 관련 - 매우 엄격
  '/api/auth/login': { windowMs: 15 * 60 * 1000, max: 5 },
  '/api/auth/2fa/verify': { windowMs: 15 * 60 * 1000, max: 10 },
  '/api/auth/2fa/setup': { windowMs: 15 * 60 * 1000, max: 3 },
  
  // 파일 업로드 - 제한적
  '/api/excel-automation/upload-and-process': { windowMs: 5 * 60 * 1000, max: 10 },
  '/api/po-template/upload': { windowMs: 5 * 60 * 1000, max: 20 },
  
  // 이메일 발송 - 제한적
  '/api/excel-automation/send-emails': { windowMs: 15 * 60 * 1000, max: 50 },
  '/api/orders/*/send': { windowMs: 15 * 60 * 1000, max: 100 },
  
  // 데이터 변경 - 보통
  '/api/orders': { windowMs: 5 * 60 * 1000, max: 100 },
  '/api/vendors': { windowMs: 5 * 60 * 1000, max: 100 },
  '/api/items': { windowMs: 5 * 60 * 1000, max: 100 },
  
  // 조회 - 관대
  '/api/dashboard/*': { windowMs: 1 * 60 * 1000, max: 60 },
};

/**
 * 키 생성기 함수들
 */
const keyGenerators = {
  ip: (req: Request) => req.ip || 'unknown',
  user: (req: AuthenticatedRequest) => req.user?.id || req.ip || 'anonymous',
  userRole: (req: AuthenticatedRequest) => `${req.user?.id || req.ip}_${req.user?.role || 'anonymous'}`,
  endpoint: (req: Request) => `${req.ip}_${req.path}`,
  userEndpoint: (req: AuthenticatedRequest) => `${req.user?.id || req.ip}_${req.path}`,
};

/**
 * 사용자 정의 메시지 생성
 */
const createMessage = (type: string, limit: number, window: number) => {
  const windowMinutes = Math.floor(window / (1000 * 60));
  
  return {
    error: 'Rate limit exceeded',
    message: `너무 많은 ${type} 요청입니다. ${windowMinutes}분 후 다시 시도해주세요.`,
    type,
    limit,
    window: windowMinutes,
    retryAfter: window
  };
};

/**
 * IP 기반 기본 Rate Limiting
 */
export const createIPRateLimit = (config: Partial<RateLimitConfig> = {}): RateLimitRequestHandler => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  return rateLimit({
    ...finalConfig,
    keyGenerator: keyGenerators.ip,
    message: createMessage('IP', finalConfig.max, finalConfig.windowMs),
  });
};

/**
 * 사용자 기반 Rate Limiting
 */
export const createUserRateLimit = (config: Partial<RateLimitConfig> = {}): RateLimitRequestHandler => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  return rateLimit({
    ...finalConfig,
    keyGenerator: keyGenerators.user,
    message: createMessage('사용자', finalConfig.max, finalConfig.windowMs),
  });
};

/**
 * 역할 기반 동적 Rate Limiting
 */
export const createRoleBasedRateLimit = (): RateLimitRequestHandler => {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: (req: AuthenticatedRequest) => {
      const userRole = req.user?.role || 'field_worker';
      return ROLE_LIMITS[userRole as keyof typeof ROLE_LIMITS]?.max || 100;
    },
    keyGenerator: keyGenerators.userRole,
    message: (req: AuthenticatedRequest) => {
      const userRole = req.user?.role || 'field_worker';
      const limit = ROLE_LIMITS[userRole as keyof typeof ROLE_LIMITS]?.max || 100;
      return createMessage(`역할(${userRole})`, limit, 15 * 60 * 1000);
    },
  });
};

/**
 * 엔드포인트별 특별 Rate Limiting
 */
export const createEndpointRateLimit = (endpoint: string, config?: Partial<RateLimitConfig>): RateLimitRequestHandler => {
  const endpointConfig = ENDPOINT_LIMITS[endpoint as keyof typeof ENDPOINT_LIMITS];
  const finalConfig = { ...DEFAULT_CONFIG, ...endpointConfig, ...config };
  
  return rateLimit({
    ...finalConfig,
    keyGenerator: keyGenerators.userEndpoint,
    message: createMessage(`엔드포인트(${endpoint})`, finalConfig.max, finalConfig.windowMs),
  });
};

/**
 * 조건부 Rate Limiting (특정 조건에서만 적용)
 */
export const createConditionalRateLimit = (
  condition: (req: AuthenticatedRequest) => boolean,
  config: Partial<RateLimitConfig> = {}
): RateLimitRequestHandler => {
  const rateLimiter = createUserRateLimit(config);
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (condition(req)) {
      return rateLimiter(req, res, next);
    }
    next();
  };
};

/**
 * 스킵 조건들
 */
export const skipConditions = {
  // 개발 환경에서 스킵
  development: (req: Request) => process.env.NODE_ENV === 'development',
  
  // 특정 IP 화이트리스트
  whitelist: (req: Request) => {
    const whitelistIPs = process.env.RATE_LIMIT_WHITELIST?.split(',') || [];
    return whitelistIPs.includes(req.ip || '');
  },
  
  // 관리자 스킵 (제한적으로 사용)
  admin: (req: AuthenticatedRequest) => req.user?.role === 'admin',
  
  // 성공한 요청만 스킵
  successfulOnly: (req: Request, res: Response) => res.statusCode < 400,
};

/**
 * 글로벌 Rate Limiting 미들웨어
 */
export const globalRateLimit = createIPRateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 1000, // IP당 1000개 요청
  message: createMessage('글로벌', 1000, 15 * 60 * 1000),
});

/**
 * API 전용 Rate Limiting
 */
export const apiRateLimit = createUserRateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 500, // 사용자당 500개 API 요청
  message: createMessage('API', 500, 15 * 60 * 1000),
});

/**
 * 인증 관련 엄격한 Rate Limiting
 */
export const authRateLimit = createEndpointRateLimit('/api/auth/login', {
  windowMs: 15 * 60 * 1000, // 15분
  max: 5, // 15분에 5번 로그인 시도
  message: createMessage('로그인', 5, 15 * 60 * 1000),
});

/**
 * 파일 업로드 Rate Limiting
 */
export const uploadRateLimit = createUserRateLimit({
  windowMs: 5 * 60 * 1000, // 5분
  max: 20, // 5분에 20개 파일
  message: createMessage('파일 업로드', 20, 5 * 60 * 1000),
});

/**
 * 관리자 작업 Rate Limiting
 */
export const adminRateLimit = createConditionalRateLimit(
  (req) => req.user?.role === 'admin',
  {
    windowMs: 5 * 60 * 1000, // 5분
    max: 200, // 관리자도 5분에 200개로 제한
    message: createMessage('관리자 작업', 200, 5 * 60 * 1000),
  }
);

/**
 * Rate Limit 정보 조회 미들웨어
 */
export const rateLimitInfo = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Rate limit 헤더 정보를 응답에 추가
  res.on('finish', () => {
    const remaining = res.getHeader('X-RateLimit-Remaining');
    const limit = res.getHeader('X-RateLimit-Limit');
    const reset = res.getHeader('X-RateLimit-Reset');
    
    if (remaining !== undefined) {
      console.log(`Rate Limit Info - User: ${req.user?.id || req.ip}, Remaining: ${remaining}/${limit}, Reset: ${reset}`);
    }
  });
  
  next();
};

/**
 * Rate Limit 통계 수집
 */
interface RateLimitStats {
  totalRequests: number;
  blockedRequests: number;
  topBlockedIPs: { ip: string; count: number }[];
  topBlockedUsers: { userId: string; count: number }[];
  topBlockedEndpoints: { endpoint: string; count: number }[];
}

class RateLimitStatsCollector {
  private stats: RateLimitStats = {
    totalRequests: 0,
    blockedRequests: 0,
    topBlockedIPs: [],
    topBlockedUsers: [],
    topBlockedEndpoints: [],
  };
  
  private blockedIPs = new Map<string, number>();
  private blockedUsers = new Map<string, number>();
  private blockedEndpoints = new Map<string, number>();

  recordRequest() {
    this.stats.totalRequests++;
  }

  recordBlock(ip: string, userId?: string, endpoint?: string) {
    this.stats.blockedRequests++;
    
    // IP 통계
    this.blockedIPs.set(ip, (this.blockedIPs.get(ip) || 0) + 1);
    
    // 사용자 통계
    if (userId) {
      this.blockedUsers.set(userId, (this.blockedUsers.get(userId) || 0) + 1);
    }
    
    // 엔드포인트 통계
    if (endpoint) {
      this.blockedEndpoints.set(endpoint, (this.blockedEndpoints.get(endpoint) || 0) + 1);
    }
    
    this.updateTopLists();
  }

  private updateTopLists() {
    // Top 10 blocked IPs
    this.stats.topBlockedIPs = Array.from(this.blockedIPs.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));
    
    // Top 10 blocked users
    this.stats.topBlockedUsers = Array.from(this.blockedUsers.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, count }));
    
    // Top 10 blocked endpoints
    this.stats.topBlockedEndpoints = Array.from(this.blockedEndpoints.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));
  }

  getStats(): RateLimitStats {
    return { ...this.stats };
  }

  reset() {
    this.stats = {
      totalRequests: 0,
      blockedRequests: 0,
      topBlockedIPs: [],
      topBlockedUsers: [],
      topBlockedEndpoints: [],
    };
    this.blockedIPs.clear();
    this.blockedUsers.clear();
    this.blockedEndpoints.clear();
  }
}

export const rateLimitStats = new RateLimitStatsCollector();

/**
 * 통계 수집 미들웨어
 */
export const rateLimitStatsMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  rateLimitStats.recordRequest();
  
  // Rate limit 응답 감지
  res.on('finish', () => {
    if (res.statusCode === 429) {
      rateLimitStats.recordBlock(
        req.ip || 'unknown',
        req.user?.id,
        req.path
      );
    }
  });
  
  next();
};

/**
 * 편의 함수들
 */
export const rateLimitMiddleware = {
  // 기본 제한
  global: globalRateLimit,
  api: apiRateLimit,
  
  // 특별 제한
  auth: authRateLimit,
  upload: uploadRateLimit,
  admin: adminRateLimit,
  
  // 역할 기반
  roleBasedRateLimit: createRoleBasedRateLimit(),
  
  // 정보 및 통계
  info: rateLimitInfo,
  stats: rateLimitStatsMiddleware,
  
  // 팩토리 함수들
  createIP: createIPRateLimit,
  createUser: createUserRateLimit,
  createEndpoint: createEndpointRateLimit,
  createConditional: createConditionalRateLimit,
};

export default rateLimitMiddleware;