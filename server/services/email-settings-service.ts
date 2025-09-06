import { eq, desc } from 'drizzle-orm';
import * as database from '../db';
import { emailSettings, type EmailSetting, type InsertEmailSetting } from '@shared/schema';
import { EmailSettingsEncryption } from '../utils/email-settings-encryption';
import nodemailer from 'nodemailer';

/**
 * 이메일 설정 관리 서비스
 * DB 기반 동적 SMTP 설정 관리
 */
export class EmailSettingsService {
  private static settingsCache: EmailSetting | null = null;
  private static cacheTimestamp = 0;
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5분 캐시

  /**
   * 기본 설정 가져오기 (활성 + 기본 설정)
   */
  async getDefaultSettings(): Promise<EmailSetting | null> {
    try {
      // 캐시 확인
      if (EmailSettingsService.isCacheValid()) {
        return EmailSettingsService.settingsCache;
      }

      const db = database.db;
      const result = await db
        .select()
        .from(emailSettings)
        .where(eq(emailSettings.isActive, true))
        .orderBy(desc(emailSettings.isDefault), desc(emailSettings.updatedAt))
        .limit(1);

      const setting = result[0] || null;
      
      // 캐시 업데이트
      EmailSettingsService.settingsCache = setting;
      EmailSettingsService.cacheTimestamp = Date.now();

      return setting;
    } catch (error) {
      console.error('기본 이메일 설정 조회 실패:', error);
      return null;
    }
  }

  /**
   * 모든 설정 조회
   */
  async getAllSettings(): Promise<EmailSetting[]> {
    try {
      const db = database.db;
      const result = await db
        .select()
        .from(emailSettings)
        .orderBy(desc(emailSettings.isDefault), desc(emailSettings.updatedAt));

      return result;
    } catch (error) {
      console.error('이메일 설정 목록 조회 실패:', error);
      return [];
    }
  }

  /**
   * 새 설정 생성
   */
  async createSettings(data: Omit<InsertEmailSetting, 'smtpPass'> & { smtpPass: string }, createdBy: string): Promise<EmailSetting> {
    try {
      // 비밀번호 암호화
      const encryptedPassword = EmailSettingsEncryption.encrypt(data.smtpPass);

      const db = database.db;
      
      // 기본 설정 설정 시 기존 기본 설정 해제
      if (data.isDefault) {
        await db
          .update(emailSettings)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(eq(emailSettings.isDefault, true));
      }

      const insertData: InsertEmailSetting = {
        ...data,
        smtpPass: encryptedPassword,
        createdBy,
      };

      const result = await db.insert(emailSettings).values(insertData).returning();
      const newSetting = result[0];

      // 캐시 무효화
      this.invalidateCache();

      return newSetting;
    } catch (error) {
      console.error('이메일 설정 생성 실패:', error);
      throw new Error('이메일 설정 생성에 실패했습니다');
    }
  }

  /**
   * 설정 업데이트
   */
  async updateSettings(id: number, data: Partial<Omit<InsertEmailSetting, 'smtpPass'> & { smtpPass?: string }>, updatedBy?: string): Promise<EmailSetting> {
    try {
      const db = database.db;

      // 업데이트할 데이터 준비
      const updateData: Partial<InsertEmailSetting> = {
        ...data,
        updatedAt: new Date(),
      };

      // 비밀번호가 제공된 경우 암호화
      if (data.smtpPass && data.smtpPass !== '********') {
        updateData.smtpPass = EmailSettingsEncryption.encrypt(data.smtpPass);
      }

      // 기본 설정 변경 시 기존 기본 설정 해제
      if (data.isDefault === true) {
        await db
          .update(emailSettings)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(eq(emailSettings.isDefault, true));
      }

      const result = await db
        .update(emailSettings)
        .set(updateData)
        .where(eq(emailSettings.id, id))
        .returning();

      if (result.length === 0) {
        throw new Error('업데이트할 설정을 찾을 수 없습니다');
      }

      // 캐시 무효화
      this.invalidateCache();

      return result[0];
    } catch (error) {
      console.error('이메일 설정 업데이트 실패:', error);
      throw new Error('이메일 설정 업데이트에 실패했습니다');
    }
  }

  /**
   * 설정 삭제
   */
  async deleteSettings(id: number): Promise<boolean> {
    try {
      const db = database.db;
      const result = await db.delete(emailSettings).where(eq(emailSettings.id, id)).returning();
      
      // 캐시 무효화
      this.invalidateCache();

      return result.length > 0;
    } catch (error) {
      console.error('이메일 설정 삭제 실패:', error);
      return false;
    }
  }

  /**
   * SMTP 연결 테스트
   */
  async testSMTPConnection(setting: EmailSetting, testEmail: string): Promise<{ success: boolean; error?: string; messageId?: string }> {
    try {
      // 비밀번호 복호화
      const decryptedPassword = EmailSettingsEncryption.decrypt(setting.smtpPass);

      // SMTP transporter 생성
      const transporter = nodemailer.createTransport({
        host: setting.smtpHost,
        port: setting.smtpPort,
        secure: setting.smtpPort === 465,
        auth: {
          user: setting.smtpUser,
          pass: decryptedPassword,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      // 연결 테스트
      await transporter.verify();

      // 테스트 이메일 발송
      const info = await transporter.sendMail({
        from: setting.fromName ? `"${setting.fromName}" <${setting.smtpUser}>` : setting.smtpUser,
        to: testEmail,
        subject: '[IKJIN] 이메일 설정 테스트',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
            <h2 style="color: #3b82f6;">이메일 설정 테스트 완료</h2>
            <p>IKJIN 구매 발주 관리 시스템의 이메일 설정이 정상적으로 작동합니다.</p>
            <hr style="margin: 20px 0; border: 1px solid #e5e7eb;">
            <div style="background: #f9fafb; padding: 15px; border-radius: 5px;">
              <h3 style="margin-top: 0; color: #374151;">설정 정보</h3>
              <p><strong>SMTP 서버:</strong> ${EmailSettingsEncryption.maskHost(setting.smtpHost)}</p>
              <p><strong>포트:</strong> ${setting.smtpPort}</p>
              <p><strong>발송자:</strong> ${EmailSettingsEncryption.maskEmail(setting.smtpUser)}</p>
              <p><strong>테스트 시간:</strong> ${new Date().toLocaleString('ko-KR')}</p>
            </div>
          </div>
        `,
      });

      // 테스트 결과 저장
      await this.updateTestResult(setting.id, {
        success: true,
        messageId: info.messageId,
        testedAt: new Date(),
        testEmail,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error: any) {
      console.error('SMTP 연결 테스트 실패:', error);

      // 테스트 결과 저장
      await this.updateTestResult(setting.id, {
        success: false,
        error: error.message,
        testedAt: new Date(),
        testEmail,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 환경 변수에서 현재 설정 읽기 (백워드 호환성)
   */
  getSettingsFromEnv(): Partial<InsertEmailSetting> {
    return {
      smtpHost: process.env.SMTP_HOST || 'smtp.naver.com',
      smtpPort: parseInt(process.env.SMTP_PORT || '587'),
      smtpUser: process.env.SMTP_USER || '',
      // smtpPass는 평문으로 반환 (암호화는 저장 시)
      fromName: 'IKJIN 구매 발주 시스템',
      description: '환경 변수에서 가져온 기본 설정',
      isActive: true,
      isDefault: true,
    };
  }

  /**
   * UI용 마스킹된 설정 반환
   */
  getMaskedSettings(setting: EmailSetting): Omit<EmailSetting, 'smtpPass'> & { smtpPass: string } {
    return {
      ...setting,
      smtpPass: '********',
      smtpUser: EmailSettingsEncryption.maskEmail(setting.smtpUser),
      smtpHost: EmailSettingsEncryption.maskHost(setting.smtpHost),
    };
  }

  /**
   * 실제 SMTP 설정 반환 (이메일 발송용)
   */
  async getDecryptedSettings(settingId?: number): Promise<{
    host: string;
    port: number;
    secure: boolean;
    auth: { user: string; pass: string };
    tls: { rejectUnauthorized: boolean };
  } | null> {
    try {
      let setting: EmailSetting | null;

      if (settingId) {
        const db = database.db;
        const result = await db
          .select()
          .from(emailSettings)
          .where(eq(emailSettings.id, settingId))
          .limit(1);
        setting = result[0] || null;
      } else {
        setting = await this.getDefaultSettings();
      }

      if (!setting) {
        // DB에 설정이 없으면 환경 변수 사용
        return {
          host: process.env.SMTP_HOST || 'smtp.naver.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: parseInt(process.env.SMTP_PORT || '587') === 465,
          auth: {
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || '',
          },
          tls: {
            rejectUnauthorized: false,
          },
        };
      }

      // 비밀번호 복호화
      const decryptedPassword = EmailSettingsEncryption.decrypt(setting.smtpPass);

      return {
        host: setting.smtpHost,
        port: setting.smtpPort,
        secure: setting.smtpPort === 465,
        auth: {
          user: setting.smtpUser,
          pass: decryptedPassword,
        },
        tls: {
          rejectUnauthorized: false,
        },
      };
    } catch (error) {
      console.error('SMTP 설정 복호화 실패:', error);
      return null;
    }
  }

  /**
   * 캐시 유효성 확인
   */
  private static isCacheValid(): boolean {
    return (
      EmailSettingsService.settingsCache !== null &&
      Date.now() - EmailSettingsService.cacheTimestamp < EmailSettingsService.CACHE_TTL
    );
  }

  /**
   * 캐시 무효화
   */
  private invalidateCache(): void {
    EmailSettingsService.settingsCache = null;
    EmailSettingsService.cacheTimestamp = 0;
  }

  /**
   * 테스트 결과 업데이트
   */
  private async updateTestResult(settingId: number, testResult: any): Promise<void> {
    try {
      const db = database.db;
      await db
        .update(emailSettings)
        .set({
          lastTestedAt: new Date(),
          testResult,
          updatedAt: new Date(),
        })
        .where(eq(emailSettings.id, settingId));
    } catch (error) {
      console.error('테스트 결과 업데이트 실패:', error);
    }
  }
}