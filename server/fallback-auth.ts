/**
 * Fallback Authentication System
 * 
 * This module provides a fallback authentication mechanism for when the database
 * is unavailable (e.g., DATABASE_URL not configured in Vercel deployment).
 * 
 * IMPORTANT: This is intended for demonstration/testing purposes only.
 * In production, always configure the DATABASE_URL environment variable.
 */

import bcrypt from 'bcrypt';
import { User } from "@shared/schema";

// Test users for fallback authentication
// These are used when database is not available
const FALLBACK_USERS: User[] = [
  {
    id: 'admin_fallback',
    email: 'admin@company.com',
    name: '관리자 (Admin)',
    password: '$2b$10$RbLrxzWq3TQEx6UTrnRwCeWwOai9N0QzdeJxg8iUp71jGS8kKgwjC', // admin123
    role: 'admin' as const,
    phoneNumber: '010-1234-5678',
    profileImageUrl: null,
    position: 'System Administrator',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  },
  {
    id: 'manager_fallback',
    email: 'manager@company.com',
    name: '김부장 (Manager)',
    password: '$2b$10$0bKxzrV7FqK1V.kVKqMxAuVcB9bXEgEYqIzPxgKqMRPAzVzKQqFJu', // manager123
    role: 'project_manager' as const,
    phoneNumber: '010-2345-6789',
    profileImageUrl: null,
    position: 'Project Manager',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  },
  {
    id: 'user_fallback',
    email: 'user@company.com',
    name: '이기사 (Worker)',
    password: '$2b$10$xE3Q1TK0T6LgTjk0xvJQPuR1rg9TI7sEeJRJxQzKjzGRTMvhKaJNm', // user123
    role: 'field_worker' as const,
    phoneNumber: '010-3456-7890',
    profileImageUrl: null,
    position: 'Field Worker',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  },
  {
    id: 'hq_fallback',
    email: 'hq@company.com',
    name: '박차장 (HQ Manager)',
    password: '$2b$10$qY1PeNJSqcOMczP1P/HqueJRoXGGKwDwt1sGyHaZ9Yrxm.gZHqFdy', // hq123
    role: 'hq_management' as const,
    phoneNumber: '010-4567-8901',
    profileImageUrl: null,
    position: 'HQ Management',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  },
  {
    id: 'executive_fallback',
    email: 'executive@company.com',
    name: '최이사 (Executive)',
    password: '$2b$10$VXKEC3DVtghz0xRWEsZ21.qFOQGsOPg6nYSEyGzx2HnFJz.qf0c5W', // exec123
    role: 'executive' as const,
    phoneNumber: '010-5678-9012',
    profileImageUrl: null,
    position: 'Executive Director',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  }
];

/**
 * Get a fallback user by email
 * Used when database is not available
 */
export async function getFallbackUserByEmail(email: string): Promise<User | undefined> {
  console.log("🔧 Using fallback authentication for email:", email);
  return FALLBACK_USERS.find(u => u.email === email);
}

/**
 * Get a fallback user by ID
 * Used when database is not available
 */
export async function getFallbackUserById(id: string): Promise<User | undefined> {
  console.log("🔧 Using fallback authentication for ID:", id);
  return FALLBACK_USERS.find(u => u.id === id);
}

/**
 * Verify password for a fallback user
 */
export async function verifyFallbackPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (error) {
    console.error("Password verification error:", error);
    return false;
  }
}

/**
 * Get all fallback users (without passwords)
 */
export function getFallbackUsers(): Omit<User, 'password'>[] {
  return FALLBACK_USERS.map(({ password, ...user }) => user);
}

/**
 * Check if we should use fallback authentication
 * Returns true if database is not available
 */
export function shouldUseFallback(): boolean {
  const dbAvailable = !!process.env.DATABASE_URL;
  const isVercel = !!process.env.VERCEL;
  
  if (!dbAvailable && isVercel) {
    console.log("⚠️ Database not configured in Vercel - using fallback authentication");
    console.log("📌 To fix: Add DATABASE_URL to Vercel environment variables");
    return true;
  }
  
  return false;
}

/**
 * Log fallback usage for monitoring
 */
export function logFallbackUsage(action: string, email?: string) {
  console.log(`🔧 FALLBACK AUTH: ${action}${email ? ` for ${email}` : ''}`);
  console.log("⚠️ WARNING: Using fallback authentication - configure DATABASE_URL for production use");
}