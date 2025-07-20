/**
 * User Registration Service
 * 
 * Handles user registration with email verification flow
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { db } from '../storage';
import { users, pendingRegistrations } from '@shared/schema';
import { eq, and, gt } from 'drizzle-orm';
import { authEmailService } from './auth-email-service';

export interface RegistrationData {
  email: string;
  password: string;
  fullName: string;
  departmentName?: string;
  positionId?: number;
  phoneNumber?: string;
  role?: 'field_worker' | 'project_manager' | 'hq_management' | 'executive' | 'admin';
}

export interface RegistrationResult {
  success: boolean;
  message: string;
  needsVerification?: boolean;
  verificationToken?: string;
  error?: string;
}

export class RegistrationService {
  private saltRounds = 12;

  /**
   * Initiate user registration with email verification
   */
  async registerUser(data: RegistrationData): Promise<RegistrationResult> {
    try {
      const { email, password, fullName, departmentName, positionId, phoneNumber, role = 'field_worker' } = data;

      // Validate input
      const validation = this.validateRegistrationData(data);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.error || '입력 데이터가 유효하지 않습니다.',
        };
      }

      // Check if user already exists
      if (db) {
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (existingUser.length > 0) {
          return {
            success: false,
            message: '이미 등록된 이메일 주소입니다.',
          };
        }

        // Check if pending registration exists
        const existingPending = await db
          .select()
          .from(pendingRegistrations)
          .where(
            and(
              eq(pendingRegistrations.email, email),
              gt(pendingRegistrations.expiresAt, new Date())
            )
          )
          .limit(1);

        if (existingPending.length > 0) {
          return {
            success: false,
            message: '이미 가입 진행 중인 이메일입니다. 이메일을 확인해주세요.',
          };
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, this.saltRounds);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Set expiration (24 hours)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Store pending registration
      if (db) {
        await db.insert(pendingRegistrations).values({
          email,
          hashedPassword,
          fullName,
          departmentName: departmentName || null,
          positionId: positionId || null,
          phoneNumber: phoneNumber || null,
          role,
          verificationToken,
          expiresAt,
        });
      }

      // Send verification email
      const emailResult = await authEmailService.sendEmailVerification(email, fullName);

      if (!emailResult.success) {
        console.error('Failed to send verification email:', emailResult.error);
        // Note: We still consider registration successful even if email fails
      }

      return {
        success: true,
        message: '회원가입 요청이 처리되었습니다. 이메일을 확인하여 계정을 활성화해주세요.',
        needsVerification: true,
        verificationToken: process.env.NODE_ENV === 'development' ? verificationToken : undefined,
      };

    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: '회원가입 처리 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify email and complete registration
   */
  async verifyEmailAndCompleteRegistration(token: string): Promise<RegistrationResult> {
    try {
      if (!db) {
        // Mock verification for development
        return {
          success: true,
          message: '이메일 인증이 완료되었습니다. (개발 모드)',
        };
      }

      // Find pending registration
      const pendingRecord = await db
        .select()
        .from(pendingRegistrations)
        .where(
          and(
            eq(pendingRegistrations.verificationToken, token),
            gt(pendingRegistrations.expiresAt, new Date())
          )
        )
        .limit(1);

      if (pendingRecord.length === 0) {
        return {
          success: false,
          message: '유효하지 않거나 만료된 인증 토큰입니다.',
        };
      }

      const pending = pendingRecord[0];

      // Check if user already exists (race condition protection)
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, pending.email))
        .limit(1);

      if (existingUser.length > 0) {
        // Clean up pending registration
        await db
          .delete(pendingRegistrations)
          .where(eq(pendingRegistrations.id, pending.id));

        return {
          success: false,
          message: '이미 등록된 사용자입니다.',
        };
      }

      // Create user account
      await db.insert(users).values({
        email: pending.email,
        hashedPassword: pending.hashedPassword,
        fullName: pending.fullName,
        departmentName: pending.departmentName,
        positionId: pending.positionId,
        phoneNumber: pending.phoneNumber,
        role: pending.role,
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      });

      // Clean up pending registration
      await db
        .delete(pendingRegistrations)
        .where(eq(pendingRegistrations.id, pending.id));

      return {
        success: true,
        message: '이메일 인증이 완료되었습니다. 이제 로그인하실 수 있습니다.',
      };

    } catch (error) {
      console.error('Email verification error:', error);
      return {
        success: false,
        message: '이메일 인증 처리 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<RegistrationResult> {
    try {
      if (!db) {
        return {
          success: true,
          message: '인증 이메일이 재발송되었습니다. (개발 모드)',
        };
      }

      // Find pending registration
      const pendingRecord = await db
        .select()
        .from(pendingRegistrations)
        .where(
          and(
            eq(pendingRegistrations.email, email),
            gt(pendingRegistrations.expiresAt, new Date())
          )
        )
        .limit(1);

      if (pendingRecord.length === 0) {
        return {
          success: false,
          message: '유효한 가입 진행 중인 계정을 찾을 수 없습니다.',
        };
      }

      const pending = pendingRecord[0];

      // Send verification email
      const emailResult = await authEmailService.sendEmailVerification(pending.email, pending.fullName);

      if (!emailResult.success) {
        return {
          success: false,
          message: '인증 이메일 발송에 실패했습니다.',
          error: emailResult.error,
        };
      }

      return {
        success: true,
        message: '인증 이메일이 재발송되었습니다.',
      };

    } catch (error) {
      console.error('Resend verification email error:', error);
      return {
        success: false,
        message: '인증 이메일 재발송 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clean up expired pending registrations
   */
  async cleanupExpiredRegistrations(): Promise<number> {
    if (!db) {
      return 0;
    }

    try {
      const result = await db
        .delete(pendingRegistrations)
        .where(
          and(
            eq(pendingRegistrations.expiresAt, new Date()) // Less than current time
          )
        );

      console.log(`Cleaned up ${result.rowCount || 0} expired pending registrations`);
      return result.rowCount || 0;
    } catch (error) {
      console.error('Cleanup expired registrations error:', error);
      return 0;
    }
  }

  /**
   * Validate registration data
   */
  private validateRegistrationData(data: RegistrationData): { isValid: boolean; error?: string } {
    const { email, password, fullName } = data;

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return { isValid: false, error: '유효한 이메일 주소를 입력해주세요.' };
    }

    // Password validation
    if (!password || password.length < 8) {
      return { isValid: false, error: '비밀번호는 8자 이상이어야 합니다.' };
    }

    // Password strength check
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!(hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar)) {
      return {
        isValid: false,
        error: '비밀번호는 대문자, 소문자, 숫자, 특수문자를 각각 하나 이상 포함해야 합니다.',
      };
    }

    // Full name validation
    if (!fullName || fullName.trim().length < 2) {
      return { isValid: false, error: '이름은 2자 이상이어야 합니다.' };
    }

    return { isValid: true };
  }
}

export const registrationService = new RegistrationService();