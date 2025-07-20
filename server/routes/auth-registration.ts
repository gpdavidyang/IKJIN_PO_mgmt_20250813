/**
 * Authentication & Registration Routes
 * 
 * Handles user registration, email verification, and password reset
 */

import { Router } from 'express';
import { registrationService } from '../services/registration-service';
import { authEmailService } from '../services/auth-email-service';
import { loginAuditService } from '../utils/login-audit-service';
import bcrypt from 'bcrypt';
import { db } from '../storage';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * POST /api/auth/register
 * User registration with email verification
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName, departmentName, positionId, phoneNumber, role } = req.body;

    // Validate required fields
    if (!email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: '이메일, 비밀번호, 이름은 필수 입력 항목입니다.',
      });
    }

    // Log registration attempt
    await loginAuditService.logLoginAttempt(
      email,
      req.ip || '',
      req.get('User-Agent') || '',
      false, // not successful yet
      'registration_attempt'
    );

    const result = await registrationService.registerUser({
      email,
      password,
      fullName,
      departmentName,
      positionId,
      phoneNumber,
      role,
    });

    if (result.success) {
      await loginAuditService.logLoginAttempt(
        email,
        req.ip || '',
        req.get('User-Agent') || '',
        true,
        'registration_initiated'
      );
    }

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Registration route error:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/auth/verify-email
 * Verify email with token
 */
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 인증 토큰입니다.',
      });
    }

    const result = await registrationService.verifyEmailAndCompleteRegistration(token);

    if (result.success) {
      // Redirect to login page with success message
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?verified=true`);
    } else {
      // Redirect to registration page with error
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?error=verification_failed`);
    }
  } catch (error) {
    console.error('Email verification route error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?error=server_error`);
  }
});

/**
 * POST /api/auth/resend-verification
 * Resend verification email
 */
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: '이메일 주소가 필요합니다.',
      });
    }

    const result = await registrationService.resendVerificationEmail(email);

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Resend verification route error:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: '이메일 주소가 필요합니다.',
      });
    }

    // Log password reset attempt
    await loginAuditService.logLoginAttempt(
      email,
      req.ip || '',
      req.get('User-Agent') || '',
      false,
      'password_reset_request'
    );

    // Check if user exists
    if (db) {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (user.length === 0) {
        // Don't reveal whether email exists for security
        return res.json({
          success: true,
          message: '비밀번호 재설정 링크가 이메일로 발송되었습니다.',
        });
      }

      // Send password reset email
      const emailResult = await authEmailService.sendPasswordReset(email, user[0].fullName);

      if (emailResult.success) {
        await loginAuditService.logLoginAttempt(
          email,
          req.ip || '',
          req.get('User-Agent') || '',
          true,
          'password_reset_sent'
        );
      }

      res.json({
        success: true,
        message: '비밀번호 재설정 링크가 이메일로 발송되었습니다.',
      });
    } else {
      // Mock response in development
      res.json({
        success: true,
        message: '비밀번호 재설정 링크가 이메일로 발송되었습니다. (개발 모드)',
      });
    }
  } catch (error) {
    console.error('Forgot password route error:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '토큰과 새 비밀번호가 필요합니다.',
      });
    }

    // Validate new password
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: '비밀번호는 8자 이상이어야 합니다.',
      });
    }

    // Verify token
    const tokenResult = await authEmailService.verifyToken(token, 'password_reset');

    if (!tokenResult.isValid) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않거나 만료된 토큰입니다.',
      });
    }

    const email = tokenResult.email!;

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    if (db) {
      await db
        .update(users)
        .set({ 
          hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(users.email, email));

      // Log successful password reset
      await loginAuditService.logLoginAttempt(
        email,
        req.ip || '',
        req.get('User-Agent') || '',
        true,
        'password_reset_completed'
      );
    }

    res.json({
      success: true,
      message: '비밀번호가 성공적으로 재설정되었습니다.',
    });
  } catch (error) {
    console.error('Reset password route error:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/auth/check-email
 * Check if email is already registered
 */
router.get('/check-email', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: '이메일 주소가 필요합니다.',
      });
    }

    if (db) {
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      res.json({
        exists: existingUser.length > 0,
      });
    } else {
      // Mock response in development
      res.json({
        exists: email === 'test@ikjin.co.kr',
      });
    }
  } catch (error) {
    console.error('Check email route error:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;