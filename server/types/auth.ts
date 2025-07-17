/**
 * Authentication and user types for server-side
 */

export interface User {
  id: string;
  email: string;
  name: string;
  phoneNumber: string;
  profileImageUrl?: string;
  role: 'field_worker' | 'project_manager' | 'hq_management' | 'executive' | 'admin';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface SessionUser {
  id: string;
  email: string;
  role: string;
}

export interface AuthSession {
  userId?: string;
  user?: SessionUser;
}