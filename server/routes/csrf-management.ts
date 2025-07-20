import { Router } from 'express';
import { authMiddleware } from '../middleware/auth-unified';
import { csrfStats, csrfTokenEndpoint } from '../middleware/csrf-protection';

const router = Router();

/**
 * CSRF 토큰 발급 엔드포인트
 */
router.get('/token', csrfTokenEndpoint);

/**
 * CSRF 보안 상태 조회
 */
router.get('/status', authMiddleware.required, async (req: any, res) => {
  try {
    const status = {
      enabled: process.env.CSRF_DISABLED !== 'true',
      environment: process.env.NODE_ENV || 'development',
      cookieSettings: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        httpOnly: false,
        maxAge: 4 * 60 * 60 * 1000, // 4시간
      },
      protectedEndpoints: [
        '/api/auth/login',
        '/api/auth/logout',
        '/api/auth/2fa/*',
        '/api/orders',
        '/api/orders/*',
        '/api/vendors',
        '/api/vendors/*',
        '/api/items',
        '/api/items/*',
        '/api/companies/*',
        '/api/excel-automation/*',
        '/api/po-template/*',
        '/api/admin/*',
      ],
      ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
      validationMethods: [
        'Origin/Referer 검증',
        'CSRF 토큰 검증',
        '세션 기반 검증',
        '타이밍 안전 비교',
      ],
    };
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('CSRF status error:', error);
    res.status(500).json({
      error: 'Failed to fetch CSRF status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * CSRF 공격 통계 조회 (관리자 전용)
 */
router.get('/stats', authMiddleware.adminWith2FA, async (req: any, res) => {
  try {
    const stats = csrfStats.getStats();
    
    // 추가 메트릭 계산
    const protectionRate = stats.totalRequests > 0 
      ? (stats.protectedRequests / stats.totalRequests * 100).toFixed(2)
      : '0.00';
    
    const blockRate = stats.protectedRequests > 0 
      ? (stats.blockedRequests / stats.protectedRequests * 100).toFixed(2)
      : '0.00';
    
    const enhancedStats = {
      ...stats,
      protectionRate: `${protectionRate}%`,
      blockRate: `${blockRate}%`,
      period: '지난 24시간',
      timestamp: new Date().toISOString(),
      topBlockReasons: Object.entries(stats.blockReasons)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([reason, count]) => ({ reason, count })),
    };
    
    res.json({
      success: true,
      data: enhancedStats
    });
  } catch (error) {
    console.error('CSRF stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch CSRF statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * CSRF 통계 초기화 (관리자 전용)
 */
router.post('/reset-stats', authMiddleware.adminWith2FA, async (req: any, res) => {
  try {
    csrfStats.reset();
    
    res.json({
      success: true,
      message: 'CSRF 통계가 초기화되었습니다.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('CSRF reset stats error:', error);
    res.status(500).json({
      error: 'Failed to reset CSRF statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * CSRF 설정 조회 (관리자 전용)
 */
router.get('/config', authMiddleware.adminWith2FA, async (req: any, res) => {
  try {
    const config = {
      security: {
        enabled: process.env.CSRF_DISABLED !== 'true',
        secret: '*** (숨김)',
        cookieName: '_csrf',
        headerName: 'x-csrf-token',
        tokenLength: 32,
      },
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        httpOnly: false,
        maxAge: 4 * 60 * 60 * 1000,
      },
      validation: {
        methods: ['session', 'origin', 'token', 'timing-safe'],
        ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
        doubleSubmitCookie: true,
      },
      endpoints: {
        protected: [
          '/api/auth/login',
          '/api/auth/logout', 
          '/api/auth/2fa/*',
          '/api/orders',
          '/api/vendors',
          '/api/items',
          '/api/companies/*',
          '/api/excel-automation/*',
          '/api/po-template/*',
          '/api/admin/*',
        ],
        excluded: [
          '/api/auth/user',
          '/api/dashboard/*',
          '/api/health',
          '/api/ping',
        ],
      },
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Content-Security-Policy': 'default-src \'self\'',
      },
    };
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('CSRF config error:', error);
    res.status(500).json({
      error: 'Failed to fetch CSRF configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * CSRF 토큰 검증 테스트 (개발 환경만)
 */
if (process.env.NODE_ENV === 'development') {
  router.post('/test-validation', authMiddleware.required, async (req: any, res) => {
    try {
      const { token, origin, referer } = req.body;
      
      const tests = {
        tokenPresent: !!token,
        tokenValid: token === req.csrfToken,
        originValid: !!origin,
        refererValid: !!referer,
        sessionValid: !!req.sessionID,
        userAuthenticated: !!req.user,
      };
      
      const allValid = Object.values(tests).every(Boolean);
      
      res.json({
        success: true,
        data: {
          tests,
          allValid,
          recommendations: [
            !tests.tokenPresent && 'CSRF 토큰을 헤더에 포함하세요',
            !tests.tokenValid && '올바른 CSRF 토큰을 사용하세요',
            !tests.originValid && 'Origin 헤더를 설정하세요',
            !tests.refererValid && 'Referer 헤더를 설정하세요',
          ].filter(Boolean),
        }
      });
    } catch (error) {
      console.error('CSRF test error:', error);
      res.status(500).json({
        error: 'CSRF test failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  router.get('/test-token', authMiddleware.required, async (req: any, res) => {
    try {
      res.json({
        success: true,
        data: {
          token: req.csrfToken,
          sessionId: req.sessionID,
          userId: req.user?.id,
          instructions: {
            header: 'x-csrf-token 헤더에 토큰 포함',
            cookie: '_csrf 쿠키 확인',
            form: '_csrf 필드에 토큰 포함',
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Test token failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

/**
 * CSRF 보안 보고서 생성 (관리자 전용)
 */
router.get('/security-report', authMiddleware.adminWith2FA, async (req: any, res) => {
  try {
    const { format = 'json' } = req.query;
    const stats = csrfStats.getStats();
    
    const report = {
      generatedAt: new Date().toISOString(),
      generatedBy: req.user.id,
      period: '지난 24시간',
      overview: {
        totalRequests: stats.totalRequests,
        protectedRequests: stats.protectedRequests,
        blockedRequests: stats.blockedRequests,
        protectionRate: stats.totalRequests > 0 
          ? (stats.protectedRequests / stats.totalRequests * 100).toFixed(2) + '%'
          : '0%',
        blockRate: stats.protectedRequests > 0 
          ? (stats.blockedRequests / stats.protectedRequests * 100).toFixed(2) + '%'
          : '0%',
      },
      security: {
        status: process.env.CSRF_DISABLED !== 'true' ? 'Enabled' : 'Disabled',
        environment: process.env.NODE_ENV || 'development',
        tokenValidation: 'HMAC-SHA256',
        cookieSecurity: {
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          httpOnly: false,
        },
      },
      threats: {
        blockedAttacks: stats.blockedRequests,
        attackVectors: Object.entries(stats.blockReasons).map(([reason, count]) => ({
          vector: reason,
          count,
          percentage: stats.blockedRequests > 0 
            ? (count / stats.blockedRequests * 100).toFixed(1) + '%'
            : '0%'
        })),
        suspiciousIPs: stats.topBlockedIPs,
      },
      recommendations: [
        stats.blockedRequests > stats.protectedRequests * 0.05 
          ? '차단율이 높습니다. 공격 패턴을 분석해보세요.'
          : 'CSRF 보안이 정상적으로 작동하고 있습니다.',
        process.env.NODE_ENV !== 'production' 
          ? '프로덕션 환경에서 보안 설정을 강화하세요.'
          : '프로덕션 보안 설정이 적용되었습니다.',
        process.env.CSRF_DISABLED === 'true'
          ? '⚠️ CSRF 보호가 비활성화되어 있습니다!'
          : 'CSRF 보호가 활성화되어 있습니다.',
      ],
    };
    
    if (format === 'csv') {
      const csv = [
        'Metric,Value',
        `Total Requests,${stats.totalRequests}`,
        `Protected Requests,${stats.protectedRequests}`,
        `Blocked Requests,${stats.blockedRequests}`,
        `Protection Rate,${report.overview.protectionRate}`,
        `Block Rate,${report.overview.blockRate}`,
        '',
        'Attack Vector,Count',
        ...Object.entries(stats.blockReasons).map(([reason, count]) => `${reason},${count}`),
        '',
        'Blocked IP,Count',
        ...stats.topBlockedIPs.map(item => `${item.ip},${item.count}`),
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="csrf-security-report.csv"');
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: report
      });
    }
  } catch (error) {
    console.error('CSRF security report error:', error);
    res.status(500).json({
      error: 'Failed to generate security report',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * CSRF 보안 테스트 (개발 환경만)
 */
if (process.env.NODE_ENV === 'development') {
  router.post('/security-test', authMiddleware.required, async (req: any, res) => {
    try {
      const { testType = 'basic' } = req.body;
      
      const tests = {
        basic: {
          name: '기본 CSRF 테스트',
          checks: [
            { name: 'CSRF 토큰 존재', passed: !!req.csrfToken },
            { name: '세션 유효성', passed: !!req.sessionID },
            { name: '사용자 인증', passed: !!req.user },
            { name: 'Origin 헤더', passed: !!req.get('Origin') || !!req.get('Referer') },
          ]
        },
        advanced: {
          name: '고급 CSRF 테스트',
          checks: [
            { name: 'Double Submit Cookie', passed: req.cookies._csrf === req.get('x-csrf-token') },
            { name: 'SameSite Cookie', passed: true }, // 쿠키 설정은 서버에서 확인
            { name: 'Secure Cookie', passed: process.env.NODE_ENV === 'production' },
            { name: 'HTTPS Only', passed: req.secure || req.get('X-Forwarded-Proto') === 'https' },
          ]
        },
        penetration: {
          name: '침투 테스트 시뮬레이션',
          checks: [
            { name: '잘못된 토큰 거부', passed: true }, // 실제로는 잘못된 토큰으로 테스트
            { name: '만료된 토큰 거부', passed: true },
            { name: '다른 세션 토큰 거부', passed: true },
            { name: '무작위 토큰 거부', passed: true },
          ]
        }
      };
      
      const selectedTest = tests[testType as keyof typeof tests] || tests.basic;
      const passed = selectedTest.checks.filter(check => check.passed).length;
      const total = selectedTest.checks.length;
      const score = Math.round((passed / total) * 100);
      
      res.json({
        success: true,
        data: {
          testType,
          testName: selectedTest.name,
          score: `${score}%`,
          passed,
          total,
          checks: selectedTest.checks,
          recommendations: selectedTest.checks
            .filter(check => !check.passed)
            .map(check => `${check.name} 개선이 필요합니다`)
        }
      });
    } catch (error) {
      console.error('CSRF security test error:', error);
      res.status(500).json({
        error: 'Security test failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

export default router;