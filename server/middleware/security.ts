/**
 * Security Middleware
 * Provides rate limiting, input validation, and security headers
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Rate limiting store (in-memory for simplicity, use Redis in production)
class RateLimitStore {
  private store = new Map<string, { count: number; resetTime: number }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.store.entries()) {
        if (now > value.resetTime) {
          this.store.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  public increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const existing = this.store.get(key);
    
    if (!existing || now > existing.resetTime) {
      const entry = { count: 1, resetTime: now + windowMs };
      this.store.set(key, entry);
      return entry;
    }
    
    existing.count++;
    return existing;
  }

  public cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

const rateLimitStore = new RateLimitStore();

/**
 * Rate limiting middleware
 */
export function createRateLimit(options: {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
  message?: string;
  keyGenerator?: (req: Request) => string;
}) {
  const {
    windowMs,
    maxRequests,
    message = "Too many requests, please try again later.",
    keyGenerator = (req) => req.ip || 'unknown'
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = keyGenerator(req);
      const { count, resetTime } = rateLimitStore.increment(key, windowMs);
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - count).toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
      
      if (count > maxRequests) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message,
          retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
        });
      }
      
      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Continue without rate limiting on error
      next();
    }
  };
}

/**
 * Authentication rate limiting - stricter for auth endpoints
 */
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  message: "Too many authentication attempts. Please try again in 15 minutes.",
  keyGenerator: (req) => {
    // Rate limit by IP + email/username if provided
    const identifier = req.body?.email || req.body?.username || req.body?.userId || '';
    return `auth:${req.ip}:${identifier}`;
  }
});

/**
 * Registration rate limiting
 */
export const registrationRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // 3 registrations per hour per IP
  message: "Too many registration attempts. Please try again in 1 hour."
});

/**
 * Password reset rate limiting
 */
export const passwordResetRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // 3 password reset requests per hour
  message: "Too many password reset attempts. Please try again in 1 hour.",
  keyGenerator: (req) => `password-reset:${req.ip}:${req.body?.email || ''}`
});

/**
 * General API rate limiting
 */
export const generalRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000, // 1000 requests per 15 minutes
  message: "API rate limit exceeded. Please slow down your requests."
});

/**
 * Security headers middleware
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // CSP header (adjust based on your needs)
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob:; " +
    "font-src 'self' data:; " +
    "connect-src 'self';"
  );
  
  next();
}

/**
 * Input sanitization middleware
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.body && typeof req.body === 'object') {
      sanitizeObject(req.body);
    }
    
    if (req.query && typeof req.query === 'object') {
      sanitizeObject(req.query);
    }
    
    next();
  } catch (error) {
    console.error('Input sanitization error:', error);
    res.status(400).json({
      error: 'Invalid input',
      message: 'Request contains invalid characters'
    });
  }
}

function sanitizeObject(obj: any) {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      // Remove potentially dangerous characters and scripts
      obj[key] = obj[key]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript: protocols
        .replace(/on\w+=/gi, '') // Remove event handlers
        .trim();
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}

/**
 * Enhanced validation schemas with security considerations
 */
export const secureValidationSchemas = {
  // User ID validation
  userId: z.string()
    .min(1, "사용자 ID는 필수입니다")
    .max(50, "사용자 ID는 50자를 초과할 수 없습니다")
    .regex(/^[a-zA-Z0-9._-]+$/, "사용자 ID는 영문자, 숫자, '.', '_', '-'만 포함할 수 있습니다"),
  
  // Email validation
  email: z.string()
    .email("올바른 이메일 형식이 아닙니다")
    .max(254, "이메일이 너무 깁니다")
    .toLowerCase()
    .refine((email) => {
      // Check for common dangerous patterns
      const dangerousPatterns = [
        /[<>]/,  // HTML brackets
        /javascript:/i,  // JavaScript protocol
        /data:/i,  // Data protocol
      ];
      return !dangerousPatterns.some(pattern => pattern.test(email));
    }, "이메일에 허용되지 않은 문자가 포함되어 있습니다"),
  
  // Strong password validation
  password: z.string()
    .min(8, "비밀번호는 최소 8자 이상이어야 합니다")
    .max(128, "비밀번호가 너무 깁니다")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
      "비밀번호는 대문자, 소문자, 숫자를 각각 최소 1개씩 포함해야 합니다")
    .refine((password) => {
      // Check against common weak passwords
      const weakPasswords = ['password', '12345678', 'qwerty123', 'admin123'];
      return !weakPasswords.includes(password.toLowerCase());
    }, "너무 간단한 비밀번호입니다"),
  
  // Name validation
  name: z.string()
    .min(2, "이름은 최소 2글자 이상이어야 합니다")
    .max(50, "이름은 50글자를 초과할 수 없습니다")
    .regex(/^[가-힣a-zA-Z\s.-]+$/, "이름에는 한글, 영문, 공백, '.', '-'만 포함할 수 있습니다"),
  
  // Phone number validation (Korean format)
  phoneNumber: z.string()
    .regex(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/, "올바른 휴대폰 번호 형식이 아닙니다")
    .transform(phone => phone.replace(/-/g, '')), // Remove hyphens
  
  // Generic text validation
  safeText: (minLength = 1, maxLength = 1000) => z.string()
    .min(minLength, `최소 ${minLength}글자 이상이어야 합니다`)
    .max(maxLength, `최대 ${maxLength}글자를 초과할 수 없습니다`)
    .refine((text) => {
      // Check for dangerous patterns
      const dangerousPatterns = [
        /<script/i,  // Script tags
        /javascript:/i,  // JavaScript protocol
        /on\w+=/i,  // Event handlers
        /data:/i,  // Data protocol
      ];
      return !dangerousPatterns.some(pattern => pattern.test(text));
    }, "허용되지 않은 문자나 패턴이 포함되어 있습니다")
};

/**
 * Validation middleware factory
 */
export function validateRequest(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params
      });
      
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        return res.status(400).json({
          error: 'Validation failed',
          details: errors
        });
      }
      
      // Replace request objects with validated data
      req.body = result.data.body || req.body;
      req.query = result.data.query || req.query;
      req.params = result.data.params || req.params;
      
      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Request validation failed'
      });
    }
  };
}

/**
 * CSRF protection (simple token-based)
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF for GET requests and some auth endpoints
  if (req.method === 'GET' || req.path.includes('/auth/login') || req.path.includes('/auth/register')) {
    return next();
  }
  
  const token = req.headers['x-csrf-token'] as string;
  const sessionToken = (req.session as any)?.csrfToken;
  
  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({
      error: 'CSRF token mismatch',
      message: 'Invalid or missing CSRF token'
    });
  }
  
  next();
}

/**
 * Generate CSRF token for session
 */
export function generateCSRFToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Audit logging for security events
 */
export function logSecurityEvent(
  event: string,
  details: any,
  req: Request,
  severity: 'low' | 'medium' | 'high' = 'medium'
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    severity,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id || 'anonymous',
    details,
    path: req.path,
    method: req.method
  };
  
  console.log(`[SECURITY ${severity.toUpperCase()}]`, JSON.stringify(logEntry));
  
  // In production, send to security monitoring system
  if (severity === 'high' && process.env.NODE_ENV === 'production') {
    // TODO: Integrate with security monitoring service
  }
}

export default {
  authRateLimit,
  registrationRateLimit,
  passwordResetRateLimit,
  generalRateLimit,
  securityHeaders,
  sanitizeInput,
  validateRequest,
  csrfProtection,
  generateCSRFToken,
  logSecurityEvent,
  secureValidationSchemas
};