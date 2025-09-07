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
  try {
    console.log('🔧 JWT: Generating token with secret length:', JWT_SECRET.length);
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    console.log('✅ JWT: Token generated successfully, length:', token.length);
    return token;
  } catch (error) {
    console.error('🚨 JWT: Token generation failed:', error);
    throw new Error(`JWT token generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
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
  console.log('🔍 JWT: Extracting token from:', {
    hasAuthHeader: !!authHeader,
    authHeaderValue: authHeader ? authHeader.substring(0, 20) + '...' : 'none',
    hasCookies: !!cookies,
    cookieKeys: cookies ? Object.keys(cookies) : [],
    hasAuthTokenCookie: !!(cookies && cookies.auth_token)
  });
  
  // Try Authorization header first
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    console.log('✅ JWT: Token extracted from Authorization header, length:', token.length);
    return token;
  }
  
  // Try cookie as fallback
  if (cookies && cookies.auth_token) {
    console.log('✅ JWT: Token extracted from cookie, length:', cookies.auth_token.length);
    return cookies.auth_token;
  }
  
  console.log('❌ JWT: No token found in headers or cookies');
  return null;
}