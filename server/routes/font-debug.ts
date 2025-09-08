/**
 * 폰트 디버깅 API 엔드포인트
 * Vercel 프로덕션 환경에서 폰트 로딩 상태를 진단하기 위한 유틸리티
 */

import { Router } from 'express';
import { fontManager } from '../utils/korean-font-manager';
import { EmbeddedFontManager } from '../utils/embedded-fonts';

const router = Router();

/**
 * 폰트 상태 진단 엔드포인트
 * GET /api/debug/font-status
 */
router.get('/font-status', async (req, res) => {
  try {
    console.log('🔍 [FontDebug] 폰트 상태 진단 요청');
    
    // 기본 환경 정보
    const environmentInfo = {
      environment: process.env.VERCEL ? 'Vercel' : 'Local',
      nodeVersion: process.version,
      platform: process.platform,
      workingDirectory: process.cwd(),
      vercelEnv: process.env.VERCEL,
      timestamp: new Date().toISOString()
    };

    // 폰트 관리자 진단
    const fontDiagnosis = fontManager.diagnoseFontIssues();
    
    // 폰트 지원 상태 보고서
    const fontReport = fontManager.getFontReport();
    
    // 시스템 리포트
    const systemReport = EmbeddedFontManager.generateSystemReport();
    
    // 사용 가능한 폰트 목록
    const availableFonts = fontManager.getAvailableFonts();
    
    // 최적 폰트 선택
    const bestFont = fontManager.getBestKoreanFont();
    
    // Vercel 최적화 상태
    const isOptimized = fontManager.isVercelOptimized();
    
    // 문제 해결 가이드
    const troubleshooting = EmbeddedFontManager.getProductionFontTroubleshootingGuide();

    const response = {
      success: true,
      environmentInfo,
      fontDiagnosis,
      fontReport,
      systemReport,
      availableFonts,
      bestFont,
      isOptimized,
      troubleshooting,
      summary: {
        totalAvailableFonts: availableFonts.length,
        hasKoreanFont: bestFont !== null,
        isProductionReady: isOptimized && bestFont !== null,
        criticalIssues: fontDiagnosis.issues.length
      }
    };

    console.log('✅ [FontDebug] 진단 완료:', response.summary);
    res.json(response);
    
  } catch (error) {
    console.error('❌ [FontDebug] 진단 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      environmentInfo: {
        environment: process.env.VERCEL ? 'Vercel' : 'Local',
        workingDirectory: process.cwd(),
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * 폰트 테스트 PDF 생성
 * POST /api/debug/test-font-pdf
 */
router.post('/test-font-pdf', async (req, res) => {
  try {
    console.log('🧪 [FontDebug] 테스트 PDF 생성 요청');
    
    const { ProfessionalPDFGenerationService } = await import('../services/professional-pdf-generation-service');
    
    // 더미 데이터로 테스트 PDF 생성
    const testOrderData = {
      orderNumber: 'TEST-FONT-001',
      orderDate: new Date(),
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      issuerCompany: {
        name: '테스트 발주업체',
        businessNumber: '123-45-67890',
        representative: '김대표',
        address: '서울시 강남구 테스트동 123-45',
        phone: '02-1234-5678',
        email: 'test@example.com'
      },
      vendorCompany: {
        name: '테스트 거래처',
        businessNumber: '098-76-54321',
        representative: '이사장',
        address: '부산시 해운대구 샘플로 67-89',
        phone: '051-9876-5432',
        email: 'vendor@example.com',
        contactPerson: '박담당'
      },
      project: {
        name: '한글 폰트 테스트 프로젝트',
        code: 'FONT-TEST',
        location: '서울시 종로구'
      },
      creator: {
        name: '시스템 테스트',
        email: 'system@test.com',
        phone: '010-0000-0000'
      },
      items: [
        {
          sequenceNo: 1,
          name: '한글 폰트 테스트 아이템',
          specification: '한글 텍스트 렌더링 검증용',
          quantity: 1,
          unit: 'EA',
          unitPrice: 100000,
          totalPrice: 100000,
          deliveryLocation: '서울시 중구 명동',
          deliveryEmail: 'delivery@test.com',
          remarks: '폰트 테스트용 아이템입니다'
        }
      ],
      financial: {
        subtotalAmount: 100000,
        vatRate: 0.1,
        vatAmount: 10000,
        totalAmount: 110000,
        currencyCode: 'KRW'
      },
      metadata: {
        notes: '이것은 한글 폰트 렌더링 테스트를 위한 PDF입니다.',
        documentId: 'FONT-TEST-' + Date.now(),
        generatedAt: new Date(),
        generatedBy: 'Font Debug System',
        templateVersion: 'test-v1.0.0'
      }
    };

    const pdfBuffer = await ProfessionalPDFGenerationService.generateProfessionalPDFWithPDFKit(testOrderData);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="font-test.pdf"');
    res.send(pdfBuffer);
    
    console.log('✅ [FontDebug] 테스트 PDF 생성 완료');
    
  } catch (error) {
    console.error('❌ [FontDebug] 테스트 PDF 생성 실패:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

/**
 * 폰트 파일 직접 확인
 * GET /api/debug/font-files
 */
router.get('/font-files', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const fontDir = path.join(process.cwd(), 'fonts');
    const results = [];
    
    try {
      const files = fs.readdirSync(fontDir);
      for (const file of files) {
        const filePath = path.join(fontDir, file);
        try {
          const stats = fs.statSync(filePath);
          results.push({
            name: file,
            path: filePath,
            size: stats.size,
            sizeKB: Math.round(stats.size / 1024),
            exists: true,
            isFile: stats.isFile(),
            modified: stats.mtime
          });
        } catch (statError) {
          results.push({
            name: file,
            path: filePath,
            exists: false,
            error: statError.message
          });
        }
      }
    } catch (readError) {
      results.push({
        directory: fontDir,
        exists: false,
        error: readError.message
      });
    }
    
    res.json({
      success: true,
      fontDirectory: fontDir,
      environment: process.env.VERCEL ? 'Vercel' : 'Local',
      files: results,
      summary: {
        totalFiles: results.length,
        validFiles: results.filter(f => f.exists && f.isFile).length
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;