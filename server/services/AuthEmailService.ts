import { POEmailService } from "../utils/po-email-service";
import type { User, UserRegistration } from "@shared/schema";

// Create singleton instance for email sending
const poEmailService = new POEmailService();

/**
 * 프론트엔드 URL을 환경에 따라 동적으로 결정하는 함수
 */
function getFrontendUrl(req?: any): string {
  // 1. 명시적으로 설정된 환경변수가 있으면 사용
  if (process.env.FRONTEND_URL && process.env.FRONTEND_URL.trim() !== '') {
    console.log('🔧 Using FRONTEND_URL from environment:', process.env.FRONTEND_URL);
    return process.env.FRONTEND_URL;
  }

  // 2. 요청 객체에서 호스트 정보를 추출 (배포 환경에서)
  if (req && req.get && req.get('host')) {
    const protocol = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
    const host = req.get('host');
    const detectedUrl = `${protocol}://${host}`;
    console.log('🔍 Detected URL from request headers:', detectedUrl);
    return detectedUrl;
  }

  // 3. NODE_ENV에 따른 기본값
  if (process.env.NODE_ENV === 'production') {
    // 배포 환경에서는 요청에서 URL을 감지하지 못한 경우
    console.warn('⚠️ FRONTEND_URL not set and unable to detect from request headers');
    console.warn('⚠️ Please set FRONTEND_URL environment variable for production');
    return 'https://localhost:5173'; // 오류를 명확히 하기 위해 https로 변경
  }

  // 4. 개발 환경 기본값
  console.log('🔧 Using development default URL');
  return 'http://localhost:5173';
}

export interface AuthEmailTemplates {
  REGISTRATION_APPROVED: {
    subject: string;
    template: (name: string) => string;
  };
  REGISTRATION_REJECTED: {
    subject: string;
    template: (name: string, reason?: string) => string;
  };
  PASSWORD_RESET: {
    subject: string;
    template: (name: string, resetLink: string) => string;
  };
  REGISTRATION_RECEIVED: {
    subject: string;
    template: (name: string) => string;
  };
}

export const AUTH_EMAIL_TEMPLATES: AuthEmailTemplates = {
  REGISTRATION_APPROVED: {
    subject: "[발주 관리 시스템] 회원가입이 승인되었습니다",
    template: (name: string) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { margin-top: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 회원가입 승인 완료</h1>
          </div>
          <div class="content">
            <p><strong>${name}</strong>님, 안녕하세요!</p>
            
            <p>발주 관리 시스템 회원가입 신청이 <strong style="color: #10B981;">승인</strong>되었습니다.</p>
            
            <p>이제 다음과 같은 서비스를 이용하실 수 있습니다:</p>
            <ul>
              <li>발주서 작성 및 관리</li>
              <li>승인 워크플로우 참여</li>
              <li>프로젝트별 발주 현황 조회</li>
              <li>거래처 관리</li>
            </ul>
            
            <p>아래 버튼을 클릭하여 로그인해 주세요:</p>
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="button">
                로그인하기
              </a>
            </p>
            
            <p>궁금한 사항이 있으시면 관리자에게 문의해 주세요.</p>
            
            <p>감사합니다.<br>
            <strong>발주 관리 시스템 팀</strong></p>
          </div>
          <div class="footer">
            <p>이 메일은 발주 관리 시스템에서 자동으로 발송된 메일입니다.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },

  REGISTRATION_REJECTED: {
    subject: "[발주 관리 시스템] 회원가입 검토 결과 안내",
    template: (name: string, reason?: string) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #EF4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .reason-box { background-color: #FEF2F2; border: 1px solid #FECACA; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .button { display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { margin-top: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📄 회원가입 검토 결과</h1>
          </div>
          <div class="content">
            <p><strong>${name}</strong>님, 안녕하세요.</p>
            
            <p>발주 관리 시스템 회원가입 신청을 검토한 결과를 안내드립니다.</p>
            
            <p>죄송하지만, 이번 회원가입 신청은 <strong style="color: #EF4444;">승인되지 않았습니다</strong>.</p>
            
            ${reason ? `
            <div class="reason-box">
              <strong>거부 사유:</strong><br>
              ${reason}
            </div>
            ` : ''}
            
            <p>추가 문의사항이 있으시거나 재신청을 원하시는 경우, 관리자에게 직접 문의해 주시기 바랍니다.</p>
            
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/register" class="button">
                재신청하기
              </a>
            </p>
            
            <p>감사합니다.<br>
            <strong>발주 관리 시스템 팀</strong></p>
          </div>
          <div class="footer">
            <p>이 메일은 발주 관리 시스템에서 자동으로 발송된 메일입니다.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },

  PASSWORD_RESET: {
    subject: "[발주 관리 시스템] 비밀번호 재설정 요청",
    template: (name: string, resetLink: string) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #F59E0B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .warning-box { background-color: #FEF3CD; border: 1px solid #FBBF24; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .button { display: inline-block; background-color: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { margin-top: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 비밀번호 재설정</h1>
          </div>
          <div class="content">
            <p><strong>${name}</strong>님, 안녕하세요.</p>
            
            <p>발주 관리 시스템 비밀번호 재설정 요청을 받았습니다.</p>
            
            <div class="warning-box">
              <strong>⚠️ 보안 안내</strong><br>
              • 이 링크는 <strong>1시간</strong> 동안만 유효합니다.<br>
              • 링크는 <strong>한 번만</strong> 사용할 수 있습니다.<br>
              • 본인이 요청하지 않았다면 이 메일을 무시해 주세요.
            </div>
            
            <p>아래 버튼을 클릭하여 새로운 비밀번호를 설정해 주세요:</p>
            
            <p style="text-align: center;">
              <a href="${resetLink}" class="button">
                비밀번호 재설정하기
              </a>
            </p>
            
            <p>링크가 작동하지 않는 경우, 다음 URL을 복사하여 브라우저 주소창에 붙여넣어 주세요:</p>
            <p style="word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 4px;">
              ${resetLink}
            </p>
            
            <p>비밀번호 재설정에 문제가 있으시면 관리자에게 문의해 주세요.</p>
            
            <p>감사합니다.<br>
            <strong>발주 관리 시스템 팀</strong></p>
          </div>
          <div class="footer">
            <p>이 메일은 발주 관리 시스템에서 자동으로 발송된 메일입니다.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },

  REGISTRATION_RECEIVED: {
    subject: "[발주 관리 시스템] 회원가입 신청이 접수되었습니다",
    template: (name: string) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #6366F1; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background-color: #E0E7FF; border: 1px solid #C7D2FE; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .footer { margin-top: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📝 회원가입 신청 접수</h1>
          </div>
          <div class="content">
            <p><strong>${name}</strong>님, 안녕하세요!</p>
            
            <p>발주 관리 시스템 회원가입 신청이 <strong style="color: #10B981;">성공적으로 접수</strong>되었습니다.</p>
            
            <div class="info-box">
              <strong>📋 다음 단계 안내</strong><br>
              1. 관리자가 신청 내용을 검토합니다<br>
              2. 검토 완료 후 승인/거부 결과를 이메일로 안내드립니다<br>
              3. 승인 시 즉시 서비스 이용이 가능합니다
            </div>
            
            <p><strong>검토 소요 시간:</strong> 영업일 기준 1-2일</p>
            
            <p>빠른 시일 내에 검토하여 결과를 안내드리겠습니다.</p>
            
            <p>궁금한 사항이 있으시면 관리자에게 문의해 주세요.</p>
            
            <p>감사합니다.<br>
            <strong>발주 관리 시스템 팀</strong></p>
          </div>
          <div class="footer">
            <p>이 메일은 발주 관리 시스템에서 자동으로 발송된 메일입니다.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },
};

export class AuthEmailService extends POEmailService {
  /**
   * 회원가입 접수 알림 이메일 발송
   */
  static async sendRegistrationReceived(registration: UserRegistration): Promise<boolean> {
    try {
      const template = AUTH_EMAIL_TEMPLATES.REGISTRATION_RECEIVED;
      const htmlContent = template.template(registration.name);

      const result = await poEmailService.sendEmail({
        to: registration.email,
        subject: template.subject,
        html: htmlContent,
      });
      console.log('📧 Registration received email sent:', result);
      return result;
    } catch (error) {
      console.error("Send registration received email error:", error);
      return false;
    }
  }

  /**
   * 회원가입 승인 알림 이메일 발송
   */
  static async sendRegistrationApproved(user: User): Promise<boolean> {
    try {
      const template = AUTH_EMAIL_TEMPLATES.REGISTRATION_APPROVED;
      const htmlContent = template.template(user.name);

      const result = await poEmailService.sendEmail({
        to: user.email,
        subject: template.subject,
        html: htmlContent,
      });
      console.log('📧 Registration approved email sent:', result);
      return result;
    } catch (error) {
      console.error("Send registration approved email error:", error);
      return false;
    }
  }

  /**
   * 회원가입 거부 알림 이메일 발송
   */
  static async sendRegistrationRejected(registration: UserRegistration, reason?: string): Promise<boolean> {
    try {
      const template = AUTH_EMAIL_TEMPLATES.REGISTRATION_REJECTED;
      const htmlContent = template.template(registration.name, reason);

      const result = await poEmailService.sendEmail({
        to: registration.email,
        subject: template.subject,
        html: htmlContent,
      });
      console.log('📧 Registration received email sent:', result);
      return result;
    } catch (error) {
      console.error("Send registration rejected email error:", error);
      return false;
    }
  }

  /**
   * 비밀번호 재설정 링크 이메일 발송
   */
  static async sendPasswordReset(user: User, resetToken: string, req?: any): Promise<boolean> {
    try {
      const template = AUTH_EMAIL_TEMPLATES.PASSWORD_RESET;
      const frontendUrl = getFrontendUrl(req);
      const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
      const htmlContent = template.template(user.name, resetLink);

      console.log('🔑 Sending password reset email to:', user.email);
      console.log('🌐 Frontend URL detected:', frontendUrl);
      console.log('🔗 Reset link:', resetLink);

      const result = await poEmailService.sendEmail({
        to: user.email,
        subject: template.subject,
        html: htmlContent,
      });

      console.log('📧 Password reset email sent:', result);
      return result;
    } catch (error) {
      console.error("Send password reset email error:", error);
      return false;
    }
  }

  /**
   * 관리자에게 새 회원가입 신청 알림
   */
  static async notifyAdminOfNewRegistration(registration: UserRegistration): Promise<boolean> {
    try {
      // TODO: 관리자 이메일 목록을 환경변수나 설정에서 가져오기
      const adminEmails = process.env.ADMIN_EMAILS?.split(',') || ['admin@company.com'];
      
      const subject = `[발주 관리 시스템] 새 회원가입 신청 - ${registration.name}`;
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1F2937; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .info-table th, .info-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .info-table th { background-color: #f0f0f0; }
            .button { display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 새 회원가입 신청</h1>
            </div>
            <div class="content">
              <p>관리자님, 안녕하세요.</p>
              
              <p>새로운 회원가입 신청이 접수되었습니다.</p>
              
              <table class="info-table">
                <tr><th>이름</th><td>${registration.name}</td></tr>
                <tr><th>이메일</th><td>${registration.email}</td></tr>
                <tr><th>전화번호</th><td>${registration.phoneNumber || '미입력'}</td></tr>
                <tr><th>요청 권한</th><td>${registration.requestedRole}</td></tr>
                <tr><th>신청일시</th><td>${registration.appliedAt.toLocaleString('ko-KR')}</td></tr>
              </table>
              
              <p>관리자 페이지에서 신청을 검토하고 승인/거부를 결정해 주세요.</p>
              
              <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin" class="button">
                  관리자 페이지로 이동
                </a>
              </p>
              
              <p><strong>발주 관리 시스템</strong></p>
            </div>
          </div>
        </body>
        </html>
      `;

      let allSent = true;
      for (const adminEmail of adminEmails) {
        const sent = await poEmailService.sendEmail({
          to: adminEmail.trim(),
          subject,
          html: htmlContent,
        });
        console.log('📧 Admin notification email sent to:', adminEmail.trim(), sent);
        if (!sent) allSent = false;
      }

      return allSent;
    } catch (error) {
      console.error("Notify admin of new registration error:", error);
      return false;
    }
  }
}