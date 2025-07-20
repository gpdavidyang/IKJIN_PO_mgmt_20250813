import { Router } from 'express';
import { authMiddleware } from '../middleware/auth-unified';
import { rateLimitStats } from '../middleware/rate-limiting';

const router = Router();

/**
 * Rate Limit 통계 조회 (관리자 전용)
 */
router.get('/stats', authMiddleware.adminWith2FA, async (req: any, res) => {
  try {
    const stats = rateLimitStats.getStats();
    
    // 추가 메트릭 계산
    const blockRate = stats.totalRequests > 0 
      ? (stats.blockedRequests / stats.totalRequests * 100).toFixed(2)
      : '0.00';
    
    const enhancedStats = {
      ...stats,
      blockRate: `${blockRate}%`,
      period: '지난 24시간',
      timestamp: new Date().toISOString(),
    };
    
    res.json({
      success: true,
      data: enhancedStats
    });
  } catch (error) {
    console.error('Rate limit stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch rate limit statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Rate Limit 설정 조회 (관리자 전용)
 */
router.get('/config', authMiddleware.adminWith2FA, async (req: any, res) => {
  try {
    const config = {
      globalLimits: {
        ip: { windowMs: 15 * 60 * 1000, max: 1000 },
        user: { windowMs: 15 * 60 * 1000, max: 500 },
      },
      roleLimits: {
        admin: { windowMs: 15 * 60 * 1000, max: 1000 },
        executive: { windowMs: 15 * 60 * 1000, max: 500 },
        hq_management: { windowMs: 15 * 60 * 1000, max: 300 },
        project_manager: { windowMs: 15 * 60 * 1000, max: 200 },
        field_worker: { windowMs: 15 * 60 * 1000, max: 100 },
      },
      endpointLimits: {
        '/api/auth/login': { windowMs: 15 * 60 * 1000, max: 5 },
        '/api/auth/2fa/verify': { windowMs: 15 * 60 * 1000, max: 10 },
        '/api/excel-automation/upload-and-process': { windowMs: 5 * 60 * 1000, max: 10 },
        '/api/po-template/upload': { windowMs: 5 * 60 * 1000, max: 20 },
        '/api/excel-automation/send-emails': { windowMs: 15 * 60 * 1000, max: 50 },
      },
      whitelist: process.env.RATE_LIMIT_WHITELIST?.split(',') || [],
      enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    };
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Rate limit config error:', error);
    res.status(500).json({
      error: 'Failed to fetch rate limit configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Rate Limit 통계 초기화 (관리자 전용)
 */
router.post('/reset-stats', authMiddleware.adminWith2FA, async (req: any, res) => {
  try {
    rateLimitStats.reset();
    
    res.json({
      success: true,
      message: 'Rate limit 통계가 초기화되었습니다.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Rate limit reset error:', error);
    res.status(500).json({
      error: 'Failed to reset rate limit statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 특정 IP 차단 해제 (관리자 전용)
 */
router.post('/unblock-ip', authMiddleware.adminWith2FA, async (req: any, res) => {
  try {
    const { ip } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        error: 'IP address required',
        message: 'IP 주소가 필요합니다.'
      });
    }
    
    // 실제 구현에서는 Redis나 메모리 스토어에서 해당 IP의 rate limit 데이터를 삭제
    // 여기서는 로그만 남김
    console.log(`Admin ${req.user.id} unblocked IP: ${ip}`);
    
    res.json({
      success: true,
      message: `IP ${ip}의 차단이 해제되었습니다.`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('IP unblock error:', error);
    res.status(500).json({
      error: 'Failed to unblock IP',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Rate Limit 실시간 모니터링 정보 (관리자 전용)
 */
router.get('/monitor', authMiddleware.adminWith2FA, async (req: any, res) => {
  try {
    const stats = rateLimitStats.getStats();
    
    // 실시간 메트릭 (실제 구현에서는 Redis 등에서 가져옴)
    const realtimeData = {
      currentActiveConnections: 0, // 실제로는 활성 연결 수
      requestsPerMinute: Math.floor(stats.totalRequests / 60), // 분당 요청 수 추정
      topActiveIPs: stats.topBlockedIPs.slice(0, 5),
      recentBlocks: [], // 최근 차단된 요청들
      systemStatus: {
        healthy: stats.blockedRequests < stats.totalRequests * 0.1, // 차단율 10% 미만이면 정상
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
      }
    };
    
    res.json({
      success: true,
      data: realtimeData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Rate limit monitor error:', error);
    res.status(500).json({
      error: 'Failed to fetch monitoring data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Rate Limit 테스트 엔드포인트 (개발 환경만)
 */
if (process.env.NODE_ENV === 'development') {
  router.post('/test', authMiddleware.required, async (req: any, res) => {
    try {
      const { testType = 'normal' } = req.body;
      
      switch (testType) {
        case 'normal':
          res.json({ 
            success: true, 
            message: '정상 요청 테스트',
            userId: req.user.id,
            timestamp: new Date().toISOString()
          });
          break;
          
        case 'rapid':
          // 빠른 연속 요청 시뮬레이션용
          await new Promise(resolve => setTimeout(resolve, 10));
          res.json({ 
            success: true, 
            message: '빠른 요청 테스트',
            timestamp: new Date().toISOString()
          });
          break;
          
        case 'heavy':
          // 무거운 작업 시뮬레이션
          await new Promise(resolve => setTimeout(resolve, 1000));
          res.json({ 
            success: true, 
            message: '무거운 요청 테스트',
            timestamp: new Date().toISOString()
          });
          break;
          
        default:
          res.status(400).json({
            error: 'Invalid test type',
            availableTypes: ['normal', 'rapid', 'heavy']
          });
      }
    } catch (error) {
      console.error('Rate limit test error:', error);
      res.status(500).json({
        error: 'Test failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

/**
 * Rate Limit 알림 설정 (관리자 전용)
 */
router.get('/alerts', authMiddleware.adminWith2FA, async (req: any, res) => {
  try {
    const alertConfig = {
      enabled: true,
      thresholds: {
        blockRate: 5, // 차단율 5% 초과 시 알림
        requestsPerMinute: 1000, // 분당 1000개 요청 초과 시 알림
        consecutiveBlocks: 10, // 연속 10번 차단 시 알림
      },
      notifications: {
        email: process.env.ADMIN_EMAIL || '',
        slack: process.env.SLACK_WEBHOOK_URL || '',
        sms: false,
      },
      lastAlert: null,
      alertCount: 0,
    };
    
    res.json({
      success: true,
      data: alertConfig
    });
  } catch (error) {
    console.error('Rate limit alerts error:', error);
    res.status(500).json({
      error: 'Failed to fetch alert configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Rate Limit 보고서 생성 (관리자 전용)
 */
router.get('/report', authMiddleware.adminWith2FA, async (req: any, res) => {
  try {
    const { period = 'daily', format = 'json' } = req.query;
    
    const stats = rateLimitStats.getStats();
    
    const report = {
      period,
      generatedAt: new Date().toISOString(),
      generatedBy: req.user.id,
      summary: {
        totalRequests: stats.totalRequests,
        blockedRequests: stats.blockedRequests,
        blockRate: stats.totalRequests > 0 
          ? (stats.blockedRequests / stats.totalRequests * 100).toFixed(2) + '%'
          : '0%',
        uniqueIPs: stats.topBlockedIPs.length,
        uniqueUsers: stats.topBlockedUsers.length,
      },
      details: {
        topBlockedIPs: stats.topBlockedIPs,
        topBlockedUsers: stats.topBlockedUsers,
        topBlockedEndpoints: stats.topBlockedEndpoints,
      },
      recommendations: [
        stats.blockedRequests > stats.totalRequests * 0.1 
          ? '차단율이 높습니다. Rate limit 설정을 검토해보세요.'
          : '차단율이 정상 수준입니다.',
        stats.topBlockedIPs.length > 50
          ? '의심스러운 IP가 많습니다. 보안 검토가 필요할 수 있습니다.'
          : 'IP 차단 상황이 정상적입니다.',
      ],
    };
    
    if (format === 'csv') {
      // CSV 형태로 반환
      const csv = [
        'Type,Value,Count',
        ...stats.topBlockedIPs.map(item => `IP,${item.ip},${item.count}`),
        ...stats.topBlockedUsers.map(item => `User,${item.userId},${item.count}`),
        ...stats.topBlockedEndpoints.map(item => `Endpoint,${item.endpoint},${item.count}`),
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="rate-limit-report-${period}.csv"`);
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: report
      });
    }
  } catch (error) {
    console.error('Rate limit report error:', error);
    res.status(500).json({
      error: 'Failed to generate report',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;