import { Router } from 'express';
import { authMiddleware } from '../middleware/auth-unified';
import { twoFactorAuth } from '../services/two-factor-auth';
import { rateLimit } from 'express-rate-limit';

const router = Router();

// 2FA 요청에 대한 rate limiting
const twoFactorRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 10, // 최대 10회 시도
  message: {
    error: 'Too many 2FA attempts',
    message: '너무 많은 시도입니다. 15분 후 다시 시도해주세요.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 엄격한 rate limiting (설정/해제용)
const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 3, // 최대 3회 시도
  message: {
    error: 'Too many configuration attempts',
    message: '너무 많은 설정 시도입니다. 15분 후 다시 시도해주세요.'
  }
});

/**
 * 2FA 상태 조회
 */
router.get('/status', authMiddleware.required, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const status = await twoFactorAuth.getStatus(userId);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('2FA status error:', error);
    res.status(500).json({
      error: 'Failed to get 2FA status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 2FA 설정 시작 (QR 코드 생성)
 */
router.post('/setup', authMiddleware.required, strictRateLimit, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;

    if (!userEmail) {
      return res.status(400).json({
        error: 'Email required',
        message: '이메일 정보가 필요합니다.'
      });
    }

    // 이미 2FA가 활성화된 경우
    const currentStatus = await twoFactorAuth.getStatus(userId);
    if (currentStatus.enabled) {
      return res.status(400).json({
        error: '2FA already enabled',
        message: '2FA가 이미 활성화되어 있습니다.'
      });
    }

    const setupResult = await twoFactorAuth.setup(userId, userEmail);
    
    res.json({
      success: true,
      message: '2FA 설정이 준비되었습니다.',
      data: setupResult
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({
      error: 'Failed to setup 2FA',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 2FA 활성화 (토큰 검증 후)
 */
router.post('/enable', authMiddleware.required, twoFactorRateLimit, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Token required',
        message: '인증 토큰이 필요합니다.'
      });
    }

    // 토큰 형식 검증 (6자리 숫자)
    if (!/^\d{6}$/.test(token)) {
      return res.status(400).json({
        error: 'Invalid token format',
        message: '올바른 6자리 숫자 토큰을 입력해주세요.'
      });
    }

    const success = await twoFactorAuth.enable(userId, token);
    
    res.json({
      success: true,
      message: '2FA가 성공적으로 활성화되었습니다.',
      data: { enabled: success }
    });
  } catch (error) {
    console.error('2FA enable error:', error);
    res.status(400).json({
      error: 'Failed to enable 2FA',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 2FA 비활성화
 */
router.post('/disable', authMiddleware.required, strictRateLimit, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Token required',
        message: '인증 토큰이 필요합니다.'
      });
    }

    const success = await twoFactorAuth.disable(userId, token);
    
    res.json({
      success: true,
      message: '2FA가 성공적으로 비활성화되었습니다.',
      data: { disabled: success }
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(400).json({
      error: 'Failed to disable 2FA',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 2FA 토큰 검증 (로그인 시)
 */
router.post('/verify', twoFactorRateLimit, async (req: any, res) => {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({
        error: 'User ID and token required',
        message: '사용자 ID와 인증 토큰이 필요합니다.'
      });
    }

    const result = await twoFactorAuth.verify(userId, token);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: {
          verified: true,
          usedBackupCode: result.usedBackupCode || false
        }
      });
    } else {
      res.status(400).json({
        error: 'Verification failed',
        message: result.message
      });
    }
  } catch (error) {
    console.error('2FA verify error:', error);
    res.status(500).json({
      error: 'Verification error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 백업 코드 재생성
 */
router.post('/regenerate-backup-codes', authMiddleware.required, strictRateLimit, async (req: any, res) => {
  try {
    const userId = req.user.id;

    // 2FA가 활성화되어 있는지 확인
    const status = await twoFactorAuth.getStatus(userId);
    if (!status.enabled) {
      return res.status(400).json({
        error: '2FA not enabled',
        message: '2FA가 활성화되어 있지 않습니다.'
      });
    }

    const newBackupCodes = await twoFactorAuth.regenerateBackupCodes(userId);
    
    res.json({
      success: true,
      message: '새로운 백업 코드가 생성되었습니다.',
      data: {
        backupCodes: newBackupCodes
      }
    });
  } catch (error) {
    console.error('Backup codes regeneration error:', error);
    res.status(500).json({
      error: 'Failed to regenerate backup codes',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 수동 입력용 정보 조회
 */
router.get('/manual-entry/:secret', authMiddleware.required, async (req: any, res) => {
  try {
    const { secret } = req.params;
    const userEmail = req.user.email;

    if (!secret || !userEmail) {
      return res.status(400).json({
        error: 'Secret and email required',
        message: 'Secret과 이메일 정보가 필요합니다.'
      });
    }

    const manualEntry = twoFactorAuth.generateManualEntry(secret, userEmail);
    
    res.json({
      success: true,
      data: manualEntry
    });
  } catch (error) {
    console.error('Manual entry error:', error);
    res.status(500).json({
      error: 'Failed to generate manual entry',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 2FA 설정 취소 (설정 중인 경우)
 */
router.delete('/setup', authMiddleware.required, async (req: any, res) => {
  try {
    const userId = req.user.id;

    // 현재 상태 확인
    const status = await twoFactorAuth.getStatus(userId);
    
    if (status.enabled) {
      return res.status(400).json({
        error: '2FA already enabled',
        message: '이미 활성화된 2FA는 비활성화 API를 사용해주세요.'
      });
    }

    // 설정 중인 데이터만 삭제 (enabled가 false인 경우)
    await twoFactorAuth.disable(userId, '000000'); // 더미 토큰으로 비활성화
    
    res.json({
      success: true,
      message: '2FA 설정이 취소되었습니다.'
    });
  } catch (error) {
    console.error('2FA setup cancellation error:', error);
    res.status(500).json({
      error: 'Failed to cancel 2FA setup',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 2FA 테스트 엔드포인트 (개발용)
 */
if (process.env.NODE_ENV === 'development') {
  router.post('/test-verify', async (req: any, res) => {
    try {
      const { secret, token } = req.body;
      
      if (!secret || !token) {
        return res.status(400).json({
          error: 'Secret and token required'
        });
      }

      const speakeasy = require('speakeasy');
      const isValid = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      res.json({
        success: true,
        data: { valid: isValid }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Test verification failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

export default router;