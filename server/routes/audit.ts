/**
 * Audit Management API Routes
 * 감사 로그 관리 및 조회 API
 */

import { Router } from 'express';
import { requireAuth, requireRole } from '../local-auth';
import { AuditService } from '../services/audit-service';
import { z } from 'zod';

const router = Router();

// 감사 로그 조회 스키마
const getAuditLogsSchema = z.object({
  userId: z.string().optional(),
  eventType: z.string().optional(),
  eventCategory: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(['createdAt', 'eventType', 'userName']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// 감사 설정 업데이트 스키마
const updateSettingsSchema = z.object({
  logLevel: z.enum(['OFF', 'ERROR', 'WARNING', 'INFO', 'DEBUG']).optional(),
  enabledCategories: z.array(z.string()).optional(),
  retentionDays: z.number().min(1).max(365).optional(),
  archiveEnabled: z.boolean().optional(),
  archiveAfterDays: z.number().min(1).max(180).optional(),
  realTimeAlerts: z.boolean().optional(),
  alertEmails: z.array(z.string().email()).optional(),
  excludedPaths: z.array(z.string()).optional(),
  excludedUsers: z.array(z.string()).optional(),
  sensitiveDataMasking: z.boolean().optional(),
  performanceTracking: z.boolean().optional(),
  apiAccessLogging: z.boolean().optional()
});

// 알림 규칙 스키마
const alertRuleSchema = z.object({
  id: z.number().optional(),
  ruleName: z.string().min(1).max(100),
  description: z.string().optional(),
  eventTypes: z.array(z.string()),
  condition: z.any().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  alertChannels: z.array(z.string()),
  recipients: z.array(z.string()),
  throttleMinutes: z.number().min(0).max(1440).optional(),
  isActive: z.boolean().optional()
});

/**
 * GET /api/audit/logs
 * 감사 로그 조회 (Admin 및 권한 있는 사용자)
 */
router.get('/logs', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const params = getAuditLogsSchema.parse(req.query);

    // 일반 사용자는 자신의 로그만 조회 가능
    if (user.role !== 'admin' && user.role !== 'executive' && user.role !== 'hq_management') {
      params.userId = user.id;
    }

    const result = await AuditService.getAuditLogs({
      ...params,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate: params.endDate ? new Date(params.endDate) : undefined
    });

    res.json(result);
  } catch (error) {
    console.error('Failed to get audit logs:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve audit logs',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * GET /api/audit/dashboard
 * 감사 대시보드 통계 (Admin only)
 */
router.get('/dashboard', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const stats = await AuditService.getDashboardStats(hours);
    res.json(stats);
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve dashboard statistics',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * GET /api/audit/user-activity/:userId
 * 사용자별 활동 요약
 */
router.get('/user-activity/:userId', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const { userId } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    // 권한 확인: Admin이거나 본인만 조회 가능
    if (user.role !== 'admin' && user.id !== userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const summary = await AuditService.getUserActivitySummary(userId, days);
    res.json(summary);
  } catch (error) {
    console.error('Failed to get user activity:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve user activity summary',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * GET /api/audit/login-history
 * 로그인 기록 조회
 */
router.get('/login-history', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const userId = req.query.userId as string | undefined;
    const days = parseInt(req.query.days as string) || 30;
    const includeFailures = req.query.includeFailures !== 'false';

    // 일반 사용자는 자신의 기록만 조회 가능
    const targetUserId = (user.role === 'admin' || user.role === 'executive') 
      ? userId 
      : user.id;

    const history = await AuditService.getLoginHistory({
      userId: targetUserId,
      days,
      includeFailures
    });

    res.json(history);
  } catch (error) {
    console.error('Failed to get login history:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve login history',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * GET /api/audit/data-changes
 * 데이터 변경 기록 조회
 */
router.get('/data-changes', requireAuth, requireRole(['admin', 'executive', 'hq_management']), async (req, res) => {
  try {
    const params = {
      entityType: req.query.entityType as string | undefined,
      entityId: req.query.entityId as string | undefined,
      userId: req.query.userId as string | undefined,
      days: parseInt(req.query.days as string) || 30
    };

    const changes = await AuditService.getDataChangeLogs(params);
    res.json(changes);
  } catch (error) {
    console.error('Failed to get data changes:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve data change logs',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * GET /api/audit/deleted-records
 * 삭제 기록 조회 (Admin only)
 */
router.get('/deleted-records', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const params = {
      entityType: req.query.entityType as string | undefined,
      days: parseInt(req.query.days as string) || 30,
      includeBackup: req.query.includeBackup !== 'false'
    };

    const records = await AuditService.getDeletedRecords(params);
    res.json(records);
  } catch (error) {
    console.error('Failed to get deleted records:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve deleted records',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * GET /api/audit/security-events
 * 보안 이벤트 조회 (Admin & Executive)
 */
router.get('/security-events', requireAuth, requireRole(['admin', 'executive']), async (req, res) => {
  try {
    const params = {
      severity: (req.query.severity as 'all' | 'high' | 'medium' | 'low') || 'all',
      days: parseInt(req.query.days as string) || 7
    };

    const events = await AuditService.getSecurityEvents(params);
    res.json(events);
  } catch (error) {
    console.error('Failed to get security events:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve security events',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * GET /api/audit/archived
 * 아카이브된 로그 조회 (Admin only)
 */
router.get('/archived', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const params = {
      userId: req.query.userId as string | undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      limit: parseInt(req.query.limit as string) || 50,
      offset: parseInt(req.query.offset as string) || 0
    };

    const logs = await AuditService.getArchivedLogs(params);
    res.json(logs);
  } catch (error) {
    console.error('Failed to get archived logs:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve archived logs',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * GET /api/audit/settings
 * 감사 설정 조회 (Admin only)
 */
router.get('/settings', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const settings = await AuditService.getSettings();
    res.json(settings || {
      logLevel: 'INFO',
      enabledCategories: ['auth', 'data', 'security'],
      retentionDays: 90,
      archiveEnabled: true,
      archiveAfterDays: 30,
      realTimeAlerts: false,
      alertEmails: [],
      excludedPaths: [],
      excludedUsers: [],
      sensitiveDataMasking: true,
      performanceTracking: false,
      apiAccessLogging: false
    });
  } catch (error) {
    console.error('Failed to get audit settings:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve audit settings',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * PUT /api/audit/settings
 * 감사 설정 업데이트 (Admin only)
 */
router.put('/settings', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const user = req.user!;
    const settings = updateSettingsSchema.parse(req.body);
    
    const updated = await AuditService.updateSettings(settings, user.id);
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Invalid settings data', 
        errors: error.errors 
      });
    }
    
    console.error('Failed to update audit settings:', error);
    res.status(500).json({ 
      message: 'Failed to update audit settings',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * GET /api/audit/alert-rules
 * 알림 규칙 조회 (Admin only)
 */
router.get('/alert-rules', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const rules = await AuditService.getAlertRules();
    res.json(rules);
  } catch (error) {
    console.error('Failed to get alert rules:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve alert rules',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * POST /api/audit/alert-rules
 * 알림 규칙 생성/업데이트 (Admin only)
 */
router.post('/alert-rules', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const user = req.user!;
    const rule = alertRuleSchema.parse(req.body);
    
    const result = await AuditService.upsertAlertRule(rule, user.id);
    res.json(result[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Invalid alert rule data', 
        errors: error.errors 
      });
    }
    
    console.error('Failed to save alert rule:', error);
    res.status(500).json({ 
      message: 'Failed to save alert rule',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * POST /api/audit/archive
 * 수동 아카이빙 실행 (Admin only)
 */
router.post('/archive', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const beforeDate = req.body.beforeDate 
      ? new Date(req.body.beforeDate) 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30일 이전

    const result = await AuditService.archiveLogs(beforeDate);
    res.json(result);
  } catch (error) {
    console.error('Failed to archive logs:', error);
    res.status(500).json({ 
      message: 'Failed to archive logs',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * POST /api/audit/auto-archive
 * 자동 아카이빙 실행 (Admin only or System)
 */
router.post('/auto-archive', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const result = await AuditService.performAutoArchive();
    res.json(result);
  } catch (error) {
    console.error('Failed to perform auto-archive:', error);
    res.status(500).json({ 
      message: 'Failed to perform auto-archive',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

export default router;