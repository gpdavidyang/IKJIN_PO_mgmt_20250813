/**
 * Authentication Email Service
 * 
 * Handles email verification, password reset, and notification emails
 * using Naver SMTP (consistent with existing PO email service)
 */

import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { db } from '../storage';
import { emailVerificationTokens } from '@shared/schema';
import { eq, and, gt } from 'drizzle-orm';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class AuthEmailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@ikjin.co.kr';
    
    // Use Naver SMTP configuration (consistent with existing PO email service)
    const emailConfig: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.naver.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    };

    this.transporter = nodemailer.createTransporter(emailConfig);
  }

  /**
   * Generate secure random token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Store email verification token in database
   */
  private async storeToken(
    email: string, 
    token: string, 
    tokenType: 'email_verification' | 'password_reset',
    expiresInHours: number = 24
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    if (db) {
      await db.insert(emailVerificationTokens).values({
        email,
        token,
        tokenType,
        expiresAt,
      });
    }
  }

  /**
   * Verify and consume token
   */
  async verifyToken(token: string, tokenType: 'email_verification' | 'password_reset'): Promise<{ isValid: boolean; email?: string }> {
    if (!db) {
      // Mock verification in development
      return { isValid: true, email: 'test@ikjin.co.kr' };
    }

    const tokenRecord = await db
      .select()
      .from(emailVerificationTokens)
      .where(
        and(
          eq(emailVerificationTokens.token, token),
          eq(emailVerificationTokens.tokenType, tokenType),
          gt(emailVerificationTokens.expiresAt, new Date()),
          eq(emailVerificationTokens.usedAt, null)
        )
      )
      .limit(1);

    if (tokenRecord.length === 0) {
      return { isValid: false };
    }

    // Mark token as used
    await db
      .update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(emailVerificationTokens.id, tokenRecord[0].id));

    return { isValid: true, email: tokenRecord[0].email };
  }

  /**
   * Send email verification email
   */
  async sendEmailVerification(email: string, fullName: string): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const token = this.generateToken();
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;

      // Store token in database
      await this.storeToken(email, token, 'email_verification', 24);

      const template = this.getEmailVerificationTemplate(fullName, verificationUrl);

      if (this.isProduction && this.transporter) {
        await this.transporter.sendMail({
          from: this.fromEmail,
          to: email,
          subject: template.subject,
          html: template.html,
          text: template.text,
        });
      } else {
        // Development: log email content
        console.log('📧 Email Verification (Development Mode)');
        console.log('To:', email);
        console.log('Subject:', template.subject);
        console.log('Verification URL:', verificationUrl);
        console.log('Token:', token);
      }

      return { success: true, token };
    } catch (error) {
      console.error('Email verification send error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email: string, fullName: string): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const token = this.generateToken();
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

      // Store token in database
      await this.storeToken(email, token, 'password_reset', 2); // 2 hours expiry

      const template = this.getPasswordResetTemplate(fullName, resetUrl);

      if (this.isProduction && this.transporter) {
        await this.transporter.sendMail({
          from: this.fromEmail,
          to: email,
          subject: template.subject,
          html: template.html,
          text: template.text,
        });
      } else {
        // Development: log email content
        console.log('📧 Password Reset (Development Mode)');
        console.log('To:', email);
        console.log('Subject:', template.subject);
        console.log('Reset URL:', resetUrl);
        console.log('Token:', token);
      }

      return { success: true, token };
    } catch (error) {
      console.error('Password reset email send error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Email verification template
   */
  private getEmailVerificationTemplate(fullName: string, verificationUrl: string): EmailTemplate {
    const subject = '[익진종합건설] 이메일 인증이 필요합니다';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>이메일 인증</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; }
          .footer { margin-top: 20px; font-size: 14px; color: #666; text-align: center; }
          .security-info { background: #FEF3C7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #F59E0B; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>익진종합건설 구매발주시스템</h1>
            <p>이메일 인증</p>
          </div>
          <div class="content">
            <h2>안녕하세요, ${fullName}님!</h2>
            <p>구매발주관리시스템 회원가입을 위해 이메일 인증이 필요합니다.</p>
            <p>아래 버튼을 클릭하여 이메일 인증을 완료해주세요:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" class="button">이메일 인증하기</a>
            </div>
            
            <div class="security-info">
              <strong>⚠️ 보안 안내</strong>
              <ul>
                <li>이 링크는 24시간 후 만료됩니다</li>
                <li>본인이 요청하지 않은 경우, 이 이메일을 무시해주세요</li>
                <li>링크를 클릭할 수 없는 경우, 아래 URL을 복사하여 브라우저에 직접 입력해주세요</li>
              </ul>
            </div>
            
            <p><small>인증 링크: ${verificationUrl}</small></p>
          </div>
          <div class="footer">
            <p>이 이메일은 자동으로 발송되었습니다. 문의사항이 있으시면 시스템 관리자에게 연락해주세요.</p>
            <p>&copy; 2025 익진종합건설. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      익진종합건설 구매발주시스템 이메일 인증
      
      안녕하세요, ${fullName}님!
      
      구매발주관리시스템 회원가입을 위해 이메일 인증이 필요합니다.
      아래 링크를 클릭하여 이메일 인증을 완료해주세요:
      
      ${verificationUrl}
      
      ⚠️ 보안 안내:
      - 이 링크는 24시간 후 만료됩니다
      - 본인이 요청하지 않은 경우, 이 이메일을 무시해주세요
      
      문의사항이 있으시면 시스템 관리자에게 연락해주세요.
      
      © 2025 익진종합건설. All rights reserved.
    `;

    return { subject, html, text };
  }

  /**
   * Password reset template
   */
  private getPasswordResetTemplate(fullName: string, resetUrl: string): EmailTemplate {
    const subject = '[익진종합건설] 비밀번호 재설정 요청';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>비밀번호 재설정</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #DC2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; }
          .footer { margin-top: 20px; font-size: 14px; color: #666; text-align: center; }
          .security-info { background: #FEE2E2; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #DC2626; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>익진종합건설 구매발주시스템</h1>
            <p>비밀번호 재설정</p>
          </div>
          <div class="content">
            <h2>안녕하세요, ${fullName}님!</h2>
            <p>구매발주관리시스템 비밀번호 재설정 요청을 받았습니다.</p>
            <p>아래 버튼을 클릭하여 새로운 비밀번호를 설정해주세요:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" class="button">비밀번호 재설정하기</a>
            </div>
            
            <div class="security-info">
              <strong>🔒 보안 안내</strong>
              <ul>
                <li>이 링크는 2시간 후 만료됩니다</li>
                <li>본인이 요청하지 않은 경우, 이 이메일을 무시하고 즉시 관리자에게 신고해주세요</li>
                <li>비밀번호 재설정 후 강력한 비밀번호를 사용해주세요</li>
              </ul>
            </div>
            
            <p><small>재설정 링크: ${resetUrl}</small></p>
          </div>
          <div class="footer">
            <p>이 이메일은 자동으로 발송되었습니다. 문의사항이 있으시면 시스템 관리자에게 연락해주세요.</p>
            <p>&copy; 2025 익진종합건설. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      익진종합건설 구매발주시스템 비밀번호 재설정
      
      안녕하세요, ${fullName}님!
      
      구매발주관리시스템 비밀번호 재설정 요청을 받았습니다.
      아래 링크를 클릭하여 새로운 비밀번호를 설정해주세요:
      
      ${resetUrl}
      
      🔒 보안 안내:
      - 이 링크는 2시간 후 만료됩니다
      - 본인이 요청하지 않은 경우, 이 이메일을 무시하고 즉시 관리자에게 신고해주세요
      - 비밀번호 재설정 후 강력한 비밀번호를 사용해주세요
      
      문의사항이 있으시면 시스템 관리자에게 연락해주세요.
      
      © 2025 익진종합건설. All rights reserved.
    `;

    return { subject, html, text };
  }
}

export const authEmailService = new AuthEmailService();