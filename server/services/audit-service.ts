/**
 * Audit Service
 * 감사 로그 관리 및 조회 서비스
 */

import { db } from '../db';
import { 
  systemAuditLogs, 
  auditSettings, 
  archivedAuditLogs,
  auditAlertRules,
  SystemAuditLog,
  AuditSettings,
  ArchivedAuditLog,
  AuditAlertRule
} from '@shared/schema';
import { eq, and, or, gte, lte, desc, asc, sql, like, inArray, isNull, notInArray } from 'drizzle-orm';
import { logAuditEvent } from '../middleware/audit-logger';

export class AuditService {
  /**
   * 감사 로그 조회
   */
  static async getAuditLogs(params: {
    userId?: string;
    eventType?: string;
    eventCategory?: string;
    entityType?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'eventType' | 'userName';
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      userId,
      eventType,
      eventCategory,
      entityType,
      entityId,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = params;

    const conditions = [];

    if (userId) conditions.push(eq(systemAuditLogs.userId, userId));
    if (eventType) conditions.push(eq(systemAuditLogs.eventType, eventType as any));
    if (eventCategory) conditions.push(eq(systemAuditLogs.eventCategory, eventCategory));
    if (entityType) conditions.push(eq(systemAuditLogs.entityType, entityType));
    if (entityId) conditions.push(eq(systemAuditLogs.entityId, entityId));
    if (startDate) conditions.push(gte(systemAuditLogs.createdAt, startDate));
    if (endDate) conditions.push(lte(systemAuditLogs.createdAt, endDate));

    const orderByColumn = sortBy === 'eventType' ? systemAuditLogs.eventType :
                          sortBy === 'userName' ? systemAuditLogs.userName :
                          systemAuditLogs.createdAt;
    const orderByDirection = sortOrder === 'asc' ? asc : desc;

    const query = db
      .select()
      .from(systemAuditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(orderByDirection(orderByColumn))
      .limit(limit)
      .offset(offset);

    const [logs, countResult] = await Promise.all([
      query,
      db.select({ count: sql<number>`count(*)` })
        .from(systemAuditLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
    ]);

    return {
      logs,
      total: countResult[0]?.count || 0,
      limit,
      offset
    };
  }

  /**
   * 사용자별 활동 요약
   */
  static async getUserActivitySummary(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activities = await db
      .select({
        eventType: systemAuditLogs.eventType,
        count: sql<number>`count(*)`
      })
      .from(systemAuditLogs)
      .where(
        and(
          eq(systemAuditLogs.userId, userId),
          gte(systemAuditLogs.createdAt, startDate)
        )
      )
      .groupBy(systemAuditLogs.eventType);

    const lastLogin = await db
      .select()
      .from(systemAuditLogs)
      .where(
        and(
          eq(systemAuditLogs.userId, userId),
          eq(systemAuditLogs.eventType, 'login' as any)
        )
      )
      .orderBy(desc(systemAuditLogs.createdAt))
      .limit(1);

    const failedLogins = await db
      .select({ count: sql<number>`count(*)` })
      .from(systemAuditLogs)
      .where(
        and(
          eq(systemAuditLogs.userId, userId),
          eq(systemAuditLogs.eventType, 'login_failed' as any),
          gte(systemAuditLogs.createdAt, startDate)
        )
      );

    return {
      activities,
      lastLogin: lastLogin[0],
      failedLoginCount: failedLogins[0]?.count || 0,
      period: `${days} days`
    };
  }

  /**
   * 시스템 활동 대시보드 통계
   */
  static async getDashboardStats(hours: number = 24) {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    // 카테고리별 통계
    const categoryStats = await db
      .select({
        category: systemAuditLogs.eventCategory,
        count: sql<number>`count(*)`
      })
      .from(systemAuditLogs)
      .where(gte(systemAuditLogs.createdAt, startDate))
      .groupBy(systemAuditLogs.eventCategory);

    // 이벤트 타입별 통계
    const eventStats = await db
      .select({
        eventType: systemAuditLogs.eventType,
        count: sql<number>`count(*)`
      })
      .from(systemAuditLogs)
      .where(gte(systemAuditLogs.createdAt, startDate))
      .groupBy(systemAuditLogs.eventType);

    // 시간대별 활동
    const hourlyActivity = await db
      .select({
        hour: sql<string>`date_trunc('hour', ${systemAuditLogs.createdAt})`,
        count: sql<number>`count(*)`
      })
      .from(systemAuditLogs)
      .where(gte(systemAuditLogs.createdAt, startDate))
      .groupBy(sql`date_trunc('hour', ${systemAuditLogs.createdAt})`)
      .orderBy(sql`date_trunc('hour', ${systemAuditLogs.createdAt})`);

    // 활성 사용자 수
    const activeUsers = await db
      .select({
        count: sql<number>`count(distinct ${systemAuditLogs.userId})`
      })
      .from(systemAuditLogs)
      .where(gte(systemAuditLogs.createdAt, startDate));

    // 에러 이벤트
    const errors = await db
      .select()
      .from(systemAuditLogs)
      .where(
        and(
          eq(systemAuditLogs.eventType, 'error' as any),
          gte(systemAuditLogs.createdAt, startDate)
        )
      )
      .orderBy(desc(systemAuditLogs.createdAt))
      .limit(10);

    // 보안 이벤트
    const securityEvents = await db
      .select()
      .from(systemAuditLogs)
      .where(
        and(
          or(
            eq(systemAuditLogs.eventType, 'login_failed' as any),
            eq(systemAuditLogs.eventType, 'security_alert' as any),
            eq(systemAuditLogs.eventCategory, 'security')
          ),
          gte(systemAuditLogs.createdAt, startDate)
        )
      )
      .orderBy(desc(systemAuditLogs.createdAt))
      .limit(10);

    return {
      categoryStats,
      eventStats,
      hourlyActivity,
      activeUserCount: activeUsers[0]?.count || 0,
      recentErrors: errors,
      securityEvents,
      period: `${hours} hours`
    };
  }

  /**
   * 감사 설정 조회
   */
  static async getSettings(): Promise<AuditSettings | null> {
    const settings = await db.select().from(auditSettings).limit(1);
    return settings[0] || null;
  }

  /**
   * 감사 설정 업데이트
   */
  static async updateSettings(
    settings: Partial<AuditSettings>,
    userId: string
  ): Promise<AuditSettings> {
    const existingSettings = await this.getSettings();

    if (existingSettings) {
      const updated = await db
        .update(auditSettings)
        .set({
          ...settings,
          updatedBy: userId,
          updatedAt: new Date()
        })
        .where(eq(auditSettings.id, existingSettings.id))
        .returning();

      // 설정 변경 로그
      await logAuditEvent('settings_change', 'system', {
        userId,
        entityType: 'audit_settings',
        entityId: String(existingSettings.id),
        action: 'Update audit settings',
        oldValue: existingSettings,
        newValue: updated[0]
      });

      return updated[0];
    } else {
      const created = await db
        .insert(auditSettings)
        .values({
          ...settings,
          updatedBy: userId
        } as any)
        .returning();

      await logAuditEvent('settings_change', 'system', {
        userId,
        entityType: 'audit_settings',
        entityId: String(created[0].id),
        action: 'Create audit settings',
        newValue: created[0]
      });

      return created[0];
    }
  }

  /**
   * 로그 아카이빙
   */
  static async archiveLogs(beforeDate: Date) {
    const logsToArchive = await db
      .select()
      .from(systemAuditLogs)
      .where(lte(systemAuditLogs.createdAt, beforeDate))
      .limit(1000); // 배치 처리

    if (logsToArchive.length === 0) {
      return { archived: 0 };
    }

    const archiveData = logsToArchive.map(log => ({
      originalId: log.id,
      userId: log.userId,
      userName: log.userName,
      userRole: log.userRole,
      eventType: log.eventType,
      eventCategory: log.eventCategory,
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      details: log.additionalDetails,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt
    }));

    await db.insert(archivedAuditLogs).values(archiveData);

    // 아카이브된 로그 삭제
    const logIds = logsToArchive.map(log => log.id);
    await db
      .delete(systemAuditLogs)
      .where(inArray(systemAuditLogs.id, logIds));

    return { archived: logsToArchive.length };
  }

  /**
   * 아카이브된 로그 조회
   */
  static async getArchivedLogs(params: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const { userId, startDate, endDate, limit = 50, offset = 0 } = params;

    const conditions = [];
    if (userId) conditions.push(eq(archivedAuditLogs.userId, userId));
    if (startDate) conditions.push(gte(archivedAuditLogs.createdAt, startDate));
    if (endDate) conditions.push(lte(archivedAuditLogs.createdAt, endDate));

    const logs = await db
      .select()
      .from(archivedAuditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(archivedAuditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return logs;
  }

  /**
   * 로그인 기록 조회
   */
  static async getLoginHistory(params: {
    userId?: string;
    days?: number;
    includeFailures?: boolean;
  }) {
    const { userId, days = 30, includeFailures = true } = params;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const eventTypes = includeFailures 
      ? ['login', 'logout', 'login_failed', 'session_expired']
      : ['login', 'logout'];

    const conditions = [
      inArray(systemAuditLogs.eventType, eventTypes as any),
      gte(systemAuditLogs.createdAt, startDate)
    ];

    if (userId) {
      conditions.push(eq(systemAuditLogs.userId, userId));
    }

    const history = await db
      .select({
        id: systemAuditLogs.id,
        userId: systemAuditLogs.userId,
        userName: systemAuditLogs.userName,
        userRole: systemAuditLogs.userRole,
        eventType: systemAuditLogs.eventType,
        ipAddress: systemAuditLogs.ipAddress,
        userAgent: systemAuditLogs.userAgent,
        details: systemAuditLogs.additionalDetails,
        createdAt: systemAuditLogs.createdAt
      })
      .from(systemAuditLogs)
      .where(and(...conditions))
      .orderBy(desc(systemAuditLogs.createdAt))
      .limit(100);

    // 로그인 세션 분석
    const sessions = [];
    let currentSession: any = null;

    for (const event of history) {
      if (event.eventType === 'login') {
        if (currentSession) {
          sessions.push(currentSession);
        }
        currentSession = {
          loginTime: event.createdAt,
          loginIp: event.ipAddress,
          userAgent: event.userAgent,
          userId: event.userId,
          userName: event.userName,
          duration: null,
          logoutType: null
        };
      } else if (currentSession && (event.eventType === 'logout' || event.eventType === 'session_expired')) {
        currentSession.logoutTime = event.createdAt;
        currentSession.duration = Math.floor(
          (new Date(event.createdAt).getTime() - new Date(currentSession.loginTime).getTime()) / 1000
        );
        currentSession.logoutType = event.eventType;
        sessions.push(currentSession);
        currentSession = null;
      }
    }

    if (currentSession) {
      sessions.push(currentSession);
    }

    return {
      history,
      sessions,
      totalLogins: history.filter(h => h.eventType === 'login').length,
      failedLogins: history.filter(h => h.eventType === 'login_failed').length
    };
  }

  /**
   * 데이터 변경 기록 조회
   */
  static async getDataChangeLogs(params: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    days?: number;
  }) {
    const { entityType, entityId, userId, days = 30 } = params;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const conditions = [
      inArray(systemAuditLogs.eventType, ['data_create', 'data_update', 'data_delete'] as any),
      gte(systemAuditLogs.createdAt, startDate)
    ];

    if (entityType) conditions.push(eq(systemAuditLogs.entityType, entityType));
    if (entityId) conditions.push(eq(systemAuditLogs.entityId, entityId));
    if (userId) conditions.push(eq(systemAuditLogs.userId, userId));

    const changes = await db
      .select()
      .from(systemAuditLogs)
      .where(and(...conditions))
      .orderBy(desc(systemAuditLogs.createdAt))
      .limit(100);

    return changes;
  }

  /**
   * 삭제 기록 조회
   */
  static async getDeletedRecords(params: {
    entityType?: string;
    days?: number;
    includeBackup?: boolean;
  }) {
    const { entityType, days = 30, includeBackup = true } = params;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const conditions = [
      eq(systemAuditLogs.eventType, 'data_delete' as any),
      gte(systemAuditLogs.createdAt, startDate)
    ];

    if (entityType) {
      conditions.push(eq(systemAuditLogs.entityType, entityType));
    }

    const deletions = await db
      .select()
      .from(systemAuditLogs)
      .where(and(...conditions))
      .orderBy(desc(systemAuditLogs.createdAt));

    const records = deletions.map(deletion => ({
      id: deletion.id,
      entityType: deletion.entityType,
      entityId: deletion.entityId,
      deletedBy: deletion.userName,
      deletedAt: deletion.createdAt,
      reason: deletion.additionalDetails?.reason,
      backup: includeBackup ? deletion.oldValue : undefined,
      restorable: !!deletion.oldValue
    }));

    return records;
  }

  /**
   * 보안 이벤트 조회
   */
  static async getSecurityEvents(params: {
    severity?: 'all' | 'high' | 'medium' | 'low';
    days?: number;
  }) {
    const { severity = 'all', days = 7 } = params;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const securityEventTypes = [
      'login_failed',
      'permission_change',
      'security_alert',
      'password_change'
    ];

    const events = await db
      .select()
      .from(systemAuditLogs)
      .where(
        and(
          or(
            inArray(systemAuditLogs.eventType, securityEventTypes as any),
            eq(systemAuditLogs.eventCategory, 'security')
          ),
          gte(systemAuditLogs.createdAt, startDate)
        )
      )
      .orderBy(desc(systemAuditLogs.createdAt));

    // 심각도 분류
    const categorizedEvents = events.map(event => {
      let eventSeverity = 'low';
      
      if (event.eventType === 'security_alert' || event.eventType === 'permission_change') {
        eventSeverity = 'high';
      } else if (event.eventType === 'login_failed') {
        eventSeverity = 'medium';
      }

      return {
        ...event,
        severity: eventSeverity
      };
    });

    if (severity !== 'all') {
      return categorizedEvents.filter(e => e.severity === severity);
    }

    return categorizedEvents;
  }

  /**
   * 알림 규칙 조회
   */
  static async getAlertRules() {
    return await db
      .select()
      .from(auditAlertRules)
      .where(eq(auditAlertRules.isActive, true))
      .orderBy(desc(auditAlertRules.severity));
  }

  /**
   * 알림 규칙 생성/업데이트
   */
  static async upsertAlertRule(rule: Partial<AuditAlertRule>, userId: string) {
    if (rule.id) {
      return await db
        .update(auditAlertRules)
        .set({
          ...rule,
          updatedAt: new Date()
        })
        .where(eq(auditAlertRules.id, rule.id))
        .returning();
    } else {
      return await db
        .insert(auditAlertRules)
        .values({
          ...rule,
          createdBy: userId
        } as any)
        .returning();
    }
  }

  /**
   * 자동 아카이빙 작업
   */
  static async performAutoArchive() {
    const settings = await this.getSettings();
    
    if (!settings?.archiveEnabled || !settings?.archiveAfterDays) {
      return { success: false, message: 'Auto-archive is disabled' };
    }

    const archiveDate = new Date();
    archiveDate.setDate(archiveDate.getDate() - settings.archiveAfterDays);

    const result = await this.archiveLogs(archiveDate);
    
    // 오래된 아카이브 삭제
    if (settings.retentionDays) {
      const deleteDate = new Date();
      deleteDate.setDate(deleteDate.getDate() - settings.retentionDays);
      
      await db
        .delete(archivedAuditLogs)
        .where(lte(archivedAuditLogs.archivedAt, deleteDate));
    }

    return { success: true, ...result };
  }
}