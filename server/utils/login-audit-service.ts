import { Request } from "express";
import { storage } from "../storage";
import { InsertLoginAuditLog } from "@shared/schema";
import { DebugLogger } from "./debug-logger";

export class LoginAuditService {
  // IP 주소 추출 (프록시 고려)
  private static getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return (forwarded as string).split(',')[0].trim();
    }
    return req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
  }

  // User Agent 추출
  private static getUserAgent(req: Request): string {
    return req.headers['user-agent'] || 'unknown';
  }

  // 로그인 성공 기록
  static async logSuccess(
    req: Request,
    userId: string,
    email: string,
    sessionId: string
  ): Promise<void> {
    try {
      const auditLog: InsertLoginAuditLog = {
        userId,
        email,
        loginStatus: 'success',
        ipAddress: this.getClientIp(req),
        userAgent: this.getUserAgent(req),
        sessionId,
        failureReason: null,
      };

      await storage.createLoginAuditLog(auditLog);
      DebugLogger.logFunctionEntry('LoginAuditService.logSuccess', { userId, email });
    } catch (error) {
      DebugLogger.logError('LoginAuditService.logSuccess', error);
      // 감사 로그 실패가 로그인을 막지 않도록 함
    }
  }

  // 로그인 실패 기록
  static async logFailure(
    req: Request,
    email: string,
    reason: 'invalid_password' | 'user_not_found' | 'account_disabled'
  ): Promise<void> {
    try {
      const auditLog: InsertLoginAuditLog = {
        userId: null,
        email,
        loginStatus: 'failed',
        ipAddress: this.getClientIp(req),
        userAgent: this.getUserAgent(req),
        failureReason: reason,
        sessionId: null,
      };

      await storage.createLoginAuditLog(auditLog);
      DebugLogger.logFunctionEntry('LoginAuditService.logFailure', { email, reason });
    } catch (error) {
      DebugLogger.logError('LoginAuditService.logFailure', error);
    }
  }

  // 최근 로그인 시도 조회
  static async getRecentAttempts(
    email: string,
    minutes: number = 30
  ): Promise<number> {
    try {
      const attempts = await storage.getRecentLoginAttempts(email, minutes);
      return attempts;
    } catch (error) {
      DebugLogger.logError('LoginAuditService.getRecentAttempts', error);
      return 0;
    }
  }

  // 계정 차단 여부 확인 (5회 실패 시 30분 차단)
  static async isAccountBlocked(email: string): Promise<boolean> {
    try {
      const failedAttempts = await storage.getRecentFailedAttempts(email, 30);
      return failedAttempts >= 5;
    } catch (error) {
      DebugLogger.logError('LoginAuditService.isAccountBlocked', error);
      return false;
    }
  }

  // 로그인 이력 조회
  static async getLoginHistory(
    userId?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<any[]> {
    try {
      return await storage.getLoginHistory(userId, limit, offset);
    } catch (error) {
      DebugLogger.logError('LoginAuditService.getLoginHistory', error);
      return [];
    }
  }

  // 의심스러운 활동 감지
  static async detectSuspiciousActivity(userId: string): Promise<{
    multipleIps: boolean;
    rapidAttempts: boolean;
    unusualTime: boolean;
  }> {
    try {
      // 최근 24시간 동안의 로그인 기록 조회
      const recentLogins = await storage.getRecentSuccessfulLogins(userId, 24 * 60);
      
      // 다중 IP 감지
      const uniqueIps = new Set(recentLogins.map(log => log.ipAddress));
      const multipleIps = uniqueIps.size > 3;

      // 급속한 로그인 시도 감지 (5분 내 3회 이상)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const rapidLogins = recentLogins.filter(
        log => new Date(log.createdAt) > fiveMinutesAgo
      );
      const rapidAttempts = rapidLogins.length >= 3;

      // 비정상 시간대 로그인 감지 (새벽 2-5시)
      const unusualTimeLogins = recentLogins.filter(log => {
        const hour = new Date(log.createdAt).getHours();
        return hour >= 2 && hour <= 5;
      });
      const unusualTime = unusualTimeLogins.length > 0;

      return { multipleIps, rapidAttempts, unusualTime };
    } catch (error) {
      DebugLogger.logError('LoginAuditService.detectSuspiciousActivity', error);
      return { multipleIps: false, rapidAttempts: false, unusualTime: false };
    }
  }
}