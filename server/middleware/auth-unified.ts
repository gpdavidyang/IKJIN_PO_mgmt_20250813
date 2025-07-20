import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { twoFactorAuth } from '../services/two-factor-auth';

// 확장된 Request 타입
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    name: string;
    role: string;
    isActive: boolean;
    twoFactorVerified?: boolean; // 2FA 검증 상태
    twoFactorEnabled?: boolean; // 2FA 활성화 상태
  };
}

/**
 * 통합 인증 미들웨어
 * 모든 라우트에서 일관되게 사용할 수 있는 인증 확인
 */
export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let userId: string | undefined;

    // 개발 환경에서는 테스트 사용자 사용
    if (process.env.NODE_ENV === 'development') {
      userId = 'USR_20250531_001';
    } else {
      // 프로덕션 환경에서는 세션 확인
      if (req.session && (req.session as any).userId) {
        userId = (req.session as any).userId;
      } else if (req.isAuthenticated && req.isAuthenticated()) {
        // Passport.js 인증 확인
        userId = (req.user as any)?.id;
      }
    }

    if (!userId) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: '로그인이 필요합니다.'
      });
    }

    // 사용자 정보 조회 및 검증
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ 
        error: 'Account disabled',
        message: '비활성화된 계정입니다.'
      });
    }

    // 2FA 상태 확인
    const twoFactorStatus = await twoFactorAuth.getStatus(user.id);
    const sessionTwoFactorVerified = (req.session as any)?.twoFactorVerified === user.id;

    // 요청 객체에 사용자 정보 첨부
    req.user = {
      id: user.id,
      email: user.email || undefined,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      twoFactorEnabled: twoFactorStatus.enabled,
      twoFactorVerified: sessionTwoFactorVerified || !twoFactorStatus.enabled
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ 
      error: 'Authentication error',
      message: '인증 처리 중 오류가 발생했습니다.'
    });
  }
};

/**
 * 2FA 검증 확인 미들웨어
 */
export const require2FA = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: '로그인이 필요합니다.'
    });
  }

  // 2FA가 활성화되어 있지만 검증되지 않은 경우
  if (req.user.twoFactorEnabled && !req.user.twoFactorVerified) {
    return res.status(403).json({ 
      error: '2FA verification required',
      message: '2단계 인증이 필요합니다.',
      code: 'REQUIRE_2FA'
    });
  }

  next();
};

/**
 * 관리자 권한 확인 미들웨어
 */
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: '로그인이 필요합니다.'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Admin access required',
      message: '관리자 권한이 필요합니다.'
    });
  }

  next();
};

/**
 * 특정 역할 권한 확인 미들웨어 팩토리
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: '로그인이 필요합니다.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: '권한이 부족합니다.',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};

/**
 * 발주 관리자 권한 확인 미들웨어
 */
export const requireOrderManager = requireRole(['project_manager', 'hq_management', 'executive', 'admin']);

/**
 * 승인 권한 확인 미들웨어
 */
export const requireApprover = requireRole(['project_manager', 'hq_management', 'executive', 'admin']);

/**
 * 경영진 권한 확인 미들웨어
 */
export const requireExecutive = requireRole(['executive', 'admin']);

/**
 * 옵셔널 인증 미들웨어 (인증되지 않아도 통과하지만 인증 정보를 첨부)
 */
export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let userId: string | undefined;

    // 개발 환경에서는 테스트 사용자 사용
    if (process.env.NODE_ENV === 'development') {
      userId = 'USR_20250531_001';
    } else {
      // 프로덕션 환경에서는 세션 확인
      if (req.session && (req.session as any).userId) {
        userId = (req.session as any).userId;
      } else if (req.isAuthenticated && req.isAuthenticated()) {
        userId = (req.user as any)?.id;
      }
    }

    if (userId) {
      const user = await storage.getUser(userId);
      
      if (user && user.isActive) {
        req.user = {
          id: user.id,
          email: user.email || undefined,
          name: user.name,
          role: user.role,
          isActive: user.isActive
        };
      }
    }

    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    // 옵셔널 인증에서는 오류가 발생해도 계속 진행
    next();
  }
};

/**
 * 개발 환경 전용 미들웨어 (프로덕션에서는 403 반환)
 */
export const requireDevelopment = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ 
      error: 'Development only',
      message: '개발 환경에서만 사용할 수 있습니다.'
    });
  }
  next();
};

/**
 * API 키 기반 인증 미들웨어 (향후 확장용)
 */
export const requireApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'API key required',
      message: 'API 키가 필요합니다.'
    });
  }

  // TODO: API 키 검증 로직 구현
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ 
      error: 'Invalid API key',
      message: '유효하지 않은 API 키입니다.'
    });
  }

  next();
};

/**
 * Rate limiting 미들웨어 (향후 확장용)
 */
export const rateLimit = (maxRequests: number, windowMs: number) => {
  const requests = new Map();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!requests.has(key)) {
      requests.set(key, []);
    }
    
    const userRequests = requests.get(key);
    const validRequests = userRequests.filter((time: number) => time > windowStart);
    
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({ 
        error: 'Too many requests',
        message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
      });
    }
    
    validRequests.push(now);
    requests.set(key, validRequests);
    
    next();
  };
};

// 편의를 위한 미들웨어 조합
export const authMiddleware = {
  // 기본 인증
  required: requireAuth,
  optional: optionalAuth,
  
  // 2FA 인증
  with2FA: [requireAuth, require2FA],
  
  // 역할 기반 인증
  admin: [requireAuth, requireAdmin],
  adminWith2FA: [requireAuth, require2FA, requireAdmin],
  orderManager: [requireAuth, requireOrderManager],
  orderManagerWith2FA: [requireAuth, require2FA, requireOrderManager],
  approver: [requireAuth, requireApprover],
  approverWith2FA: [requireAuth, require2FA, requireApprover],
  executive: [requireAuth, requireExecutive],
  executiveWith2FA: [requireAuth, require2FA, requireExecutive],
  
  // 환경 기반
  development: [requireDevelopment],
  
  // 기타
  apiKey: requireApiKey,
  
  // Rate limiting
  rateLimited: (maxRequests: number, windowMs: number) => [
    rateLimit(maxRequests, windowMs)
  ]
};

export default authMiddleware;