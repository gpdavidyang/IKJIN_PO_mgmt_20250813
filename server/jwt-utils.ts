import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ikjin-po-mgmt-jwt-secret-2025-secure-key';
const JWT_EXPIRY = '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate JWT token for user authentication
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Extract token from Authorization header or cookies
 */
export function extractToken(authHeader?: string, cookies?: any): string | null {
  // Try Authorization header first
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Try cookie as fallback
  if (cookies && cookies.auth_token) {
    return cookies.auth_token;
  }
  
  return null;
}