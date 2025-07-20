/**
 * 2FA (Two-Factor Authentication) 서비스
 * 
 * TOTP (Time-based One-Time Password) 구현
 * - Google Authenticator, Authy 등과 호환
 * - 백업 코드 시스템
 * - 계정 잠금 기능
 */

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { db } from '../storage';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface TwoFactorSetupResult {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  manualEntryKey: string;
}

export interface TwoFactorVerifyResult {
  success: boolean;
  message: string;
  usedBackupCode?: boolean;
}

export class TwoFactorAuthService {
  private readonly APP_NAME = '구매발주관리시스템';
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15분

  /**
   * 2FA 설정을 위한 secret과 QR 코드 생성
   */
  async setup(userId: string, userEmail: string): Promise<TwoFactorSetupResult> {
    try {
      // TOTP secret 생성
      const secret = speakeasy.generateSecret({
        name: userEmail,
        issuer: this.APP_NAME,
        length: 32
      });

      // QR 코드 URL 생성
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

      // 백업 코드 생성 (8개)
      const backupCodes = this.generateBackupCodes();

      // 데이터베이스에 임시 저장 (활성화 전까지)
      await db.update(users)
        .set({
          twoFactorSecret: secret.base32,
          twoFactorBackupCodes: backupCodes,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      return {
        secret: secret.base32!,
        qrCodeUrl,
        backupCodes,
        manualEntryKey: secret.base32!
      };
    } catch (error) {
      console.error('2FA setup error:', error);
      throw new Error('2FA 설정 중 오류가 발생했습니다.');
    }
  }

  /**
   * 2FA 활성화 (설정 완료 후 토큰 검증)
   */
  async enable(userId: string, token: string): Promise<boolean> {
    try {
      const user = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user.length || !user[0].twoFactorSecret) {
        throw new Error('2FA 설정이 완료되지 않았습니다.');
      }

      // 토큰 검증
      const isValid = speakeasy.totp.verify({
        secret: user[0].twoFactorSecret,
        encoding: 'base32',
        token,
        window: 2 // ±2 time steps (30초 간격)
      });

      if (!isValid) {
        throw new Error('잘못된 인증 코드입니다.');
      }

      // 2FA 활성화
      await db.update(users)
        .set({
          twoFactorEnabled: true,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      return true;
    } catch (error) {
      console.error('2FA enable error:', error);
      throw error;
    }
  }

  /**
   * 2FA 비활성화
   */
  async disable(userId: string, token: string): Promise<boolean> {
    try {
      const user = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user.length || !user[0].twoFactorEnabled) {
        throw new Error('2FA가 활성화되어 있지 않습니다.');
      }

      // 토큰 또는 백업 코드로 검증
      const verifyResult = await this.verify(userId, token);
      if (!verifyResult.success) {
        throw new Error('인증에 실패했습니다.');
      }

      // 2FA 비활성화 및 관련 데이터 삭제
      await db.update(users)
        .set({
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorBackupCodes: null,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      return true;
    } catch (error) {
      console.error('2FA disable error:', error);
      throw error;
    }
  }

  /**
   * 2FA 토큰 검증 (로그인 시)
   */
  async verify(userId: string, token: string): Promise<TwoFactorVerifyResult> {
    try {
      const user = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user.length) {
        return { success: false, message: '사용자를 찾을 수 없습니다.' };
      }

      const userData = user[0];

      if (!userData.twoFactorEnabled || !userData.twoFactorSecret) {
        return { success: false, message: '2FA가 활성화되어 있지 않습니다.' };
      }

      // 계정 잠금 확인
      if (this.isAccountLocked(userData)) {
        const unlockTime = new Date(userData.lockedUntil!);
        const remainingMinutes = Math.ceil((unlockTime.getTime() - Date.now()) / (1000 * 60));
        return { 
          success: false, 
          message: `계정이 잠겨있습니다. ${remainingMinutes}분 후 다시 시도해주세요.` 
        };
      }

      // TOTP 토큰 검증
      const isValidTotp = speakeasy.totp.verify({
        secret: userData.twoFactorSecret,
        encoding: 'base32',
        token,
        window: 2
      });

      if (isValidTotp) {
        // 성공 시 로그인 시도 횟수 초기화
        await this.resetLoginAttempts(userId);
        return { success: true, message: '인증 성공' };
      }

      // 백업 코드 확인
      const backupCodes = userData.twoFactorBackupCodes as string[] || [];
      const backupCodeIndex = backupCodes.findIndex(code => code === token);
      
      if (backupCodeIndex !== -1) {
        // 백업 코드 사용 후 제거
        const updatedBackupCodes = backupCodes.filter((_, index) => index !== backupCodeIndex);
        
        await db.update(users)
          .set({
            twoFactorBackupCodes: updatedBackupCodes,
            loginAttempts: 0,
            lockedUntil: null,
            updatedAt: new Date()
          })
          .where(eq(users.id, userId));

        return { 
          success: true, 
          message: '백업 코드로 인증 성공', 
          usedBackupCode: true 
        };
      }

      // 실패 시 로그인 시도 횟수 증가
      await this.incrementLoginAttempts(userId);
      
      return { success: false, message: '잘못된 인증 코드입니다.' };

    } catch (error) {
      console.error('2FA verify error:', error);
      return { success: false, message: '인증 중 오류가 발생했습니다.' };
    }
  }

  /**
   * 새로운 백업 코드 생성
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    try {
      const backupCodes = this.generateBackupCodes();
      
      await db.update(users)
        .set({
          twoFactorBackupCodes: backupCodes,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      return backupCodes;
    } catch (error) {
      console.error('Backup codes regeneration error:', error);
      throw new Error('백업 코드 재생성 중 오류가 발생했습니다.');
    }
  }

  /**
   * 사용자의 2FA 상태 조회
   */
  async getStatus(userId: string): Promise<{
    enabled: boolean;
    backupCodesCount: number;
    hasSecret: boolean;
  }> {
    try {
      const user = await db.select({
        twoFactorEnabled: users.twoFactorEnabled,
        twoFactorSecret: users.twoFactorSecret,
        twoFactorBackupCodes: users.twoFactorBackupCodes
      })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user.length) {
        return { enabled: false, backupCodesCount: 0, hasSecret: false };
      }

      const userData = user[0];
      const backupCodes = userData.twoFactorBackupCodes as string[] || [];

      return {
        enabled: userData.twoFactorEnabled || false,
        backupCodesCount: backupCodes.length,
        hasSecret: !!userData.twoFactorSecret
      };
    } catch (error) {
      console.error('2FA status error:', error);
      return { enabled: false, backupCodesCount: 0, hasSecret: false };
    }
  }

  /**
   * 백업 코드 생성 (8개의 8자리 코드)
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      // 8자리 숫자 백업 코드 생성
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * 계정 잠금 상태 확인
   */
  private isAccountLocked(userData: any): boolean {
    if (!userData.lockedUntil) return false;
    return new Date(userData.lockedUntil) > new Date();
  }

  /**
   * 로그인 시도 횟수 증가 및 계정 잠금
   */
  private async incrementLoginAttempts(userId: string): Promise<void> {
    const user = await db.select({
      loginAttempts: users.loginAttempts
    })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) return;

    const attempts = (user[0].loginAttempts || 0) + 1;
    const updates: any = {
      loginAttempts: attempts,
      updatedAt: new Date()
    };

    // 최대 시도 횟수 초과 시 계정 잠금
    if (attempts >= this.MAX_LOGIN_ATTEMPTS) {
      updates.lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION);
    }

    await db.update(users)
      .set(updates)
      .where(eq(users.id, userId));
  }

  /**
   * 로그인 시도 횟수 초기화
   */
  private async resetLoginAttempts(userId: string): Promise<void> {
    await db.update(users)
      .set({
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  /**
   * QR 코드 없이 수동 입력용 정보 생성
   */
  generateManualEntry(secret: string, userEmail: string): {
    issuer: string;
    accountName: string;
    secretKey: string;
  } {
    return {
      issuer: this.APP_NAME,
      accountName: userEmail,
      secretKey: secret
    };
  }
}

// 글로벌 인스턴스 생성
export const twoFactorAuth = new TwoFactorAuthService();
export default TwoFactorAuthService;