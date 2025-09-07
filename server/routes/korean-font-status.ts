/**
 * 한글 폰트 지원 상태 확인 API 엔드포인트
 * Vercel 환경에서 한글 폰트 사용 가능 여부 진단
 */

import { Router } from 'express';
import { fontManager } from '../utils/korean-font-manager';
import { ProfessionalPDFGenerationService } from '../services/professional-pdf-generation-service';

const router = Router();

/**
 * GET /api/korean-font/status
 * 한글 폰트 지원 상태 확인
 */
router.get('/status', async (req, res) => {
  try {
    console.log('🔍 [KoreanFontAPI] 폰트 상태 확인 요청');

    // 1. 폰트 관리자 상태 보고서
    const fontReport = fontManager.getFontReport();

    // 2. 최적 폰트 정보
    const bestFont = fontManager.getBestKoreanFont();

    // 3. Vercel 최적화 상태
    const isVercelOptimized = fontManager.isVercelOptimized();

    // 4. 환경 정보
    const environment = {
      isVercel: !!process.env.VERCEL,
      nodeEnv: process.env.NODE_ENV,
      platform: process.platform,
      cwd: process.cwd()
    };

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      environment,
      fontSupport: {
        isOptimized: isVercelOptimized,
        totalFonts: fontReport.totalFonts,
        availableFonts: fontReport.availableFonts,
        recommendedFont: fontReport.recommendedFont,
        hasKoreanSupport: fontReport.availableFonts > 0
      },
      fonts: fontReport.fonts.map(font => ({
        name: font.name,
        available: font.available,
        size: font.size,
        sizeKB: font.size ? Math.round(font.size / 1024) : 0,
        path: font.path.includes(process.cwd()) ? 'PROJECT' : 'SYSTEM'
      })),
      textConversion: {
        withFont: fontManager.safeKoreanText('구매발주서 테스트', true),
        withoutFont: fontManager.safeKoreanText('구매발주서 테스트', false)
      }
    };

    console.log('✅ [KoreanFontAPI] 폰트 상태 확인 완료');
    res.json(response);

  } catch (error) {
    console.error('❌ [KoreanFontAPI] 폰트 상태 확인 오류:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/korean-font/test-pdf
 * 한글 PDF 생성 테스트
 */
router.post('/test-pdf', async (req, res) => {
  try {
    console.log('📄 [KoreanFontAPI] 한글 PDF 테스트 요청');

    // 샘플 한글 데이터로 PDF 생성
    const testData = {
      orderNumber: 'TEST-KOREAN-' + Date.now(),
      orderDate: new Date(),
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),

      issuerCompany: {
        name: '한글폰트 테스트 회사',
        businessNumber: '123-45-67890',
        representative: '김대표',
        address: '서울특별시 강남구 테헤란로 123',
        phone: '02-1234-5678',
        email: 'test@korean-font.co.kr',
      },

      vendorCompany: {
        name: '한글 거래처 테스트',
        businessNumber: '987-65-43210',
        representative: '박대표',
        address: '경기도 성남시 분당구 판교역로 166',
        phone: '031-987-6543',
        email: 'vendor@korean-test.co.kr',
        contactPerson: '이담당자',
      },

      project: {
        name: '한글 폰트 지원 테스트 현장',
        code: 'KOREAN-TEST-001',
        location: '서울특별시 종로구',
        projectManager: '최현장',
        projectManagerContact: '010-1234-5678',
        orderManager: '정발주',
        orderManagerContact: 'order@test-korean.co.kr',
      },

      creator: {
        name: '한글폰트시스템',
        email: 'admin@korean-font.co.kr',
        phone: '010-9876-5432',
      },

      items: [
        {
          sequenceNo: 1,
          name: '한글 품목명 테스트 (건설자재)',
          specification: '규격: 1200×600×100mm',
          quantity: 10,
          unit: '개',
          unitPrice: 50000,
          totalPrice: 500000,
          deliveryLocation: '서울 강남구 테스트 현장',
          deliveryEmail: 'delivery@korean-test.com',
          remarks: '현장 직접 배송, 한글 특이사항',
        },
      ],

      financial: {
        subtotalAmount: 500000,
        vatRate: 0.1,
        vatAmount: 50000,
        totalAmount: 550000,
        discountAmount: 0,
        currencyCode: 'KRW',
      },

      metadata: {
        notes: '한글 폰트 지원 테스트용 PDF 생성. 모든 한글 텍스트가 올바르게 렌더링되는지 확인하세요.',
        documentId: 'KOREAN-FONT-TEST-' + Date.now(),
        generatedAt: new Date(),
        generatedBy: '한글폰트API테스트',
        templateVersion: 'v2.1.0-korean-font-optimized',
      },
    };

    // PDF 생성
    const pdfBuffer = await ProfessionalPDFGenerationService.generateProfessionalPDFWithPDFKit(testData);

    // PDF 파일을 Base64로 인코딩하여 응답
    const base64PDF = pdfBuffer.toString('base64');

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      fontUsed: fontManager.getBestKoreanFont()?.name || 'None',
      pdfSize: pdfBuffer.length,
      pdfSizeKB: Math.round(pdfBuffer.length / 1024),
      base64PDF,
      downloadUrl: `/api/korean-font/download-test-pdf?t=${Date.now()}`
    };

    console.log(`✅ [KoreanFontAPI] 한글 PDF 생성 성공: ${response.pdfSizeKB}KB`);
    res.json(response);

  } catch (error) {
    console.error('❌ [KoreanFontAPI] 한글 PDF 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/korean-font/base64-font
 * 폰트를 Base64로 인코딩하여 반환 (개발용)
 */
router.get('/base64-font', async (req, res) => {
  try {
    console.log('🔤 [KoreanFontAPI] Base64 폰트 인코딩 요청');

    const fontName = req.query.font as string;
    const base64Font = await fontManager.getFontAsBase64(fontName);

    if (!base64Font) {
      return res.status(404).json({
        success: false,
        error: 'Font not found or encoding failed',
        availableFonts: fontManager.getAvailableFonts().map(f => f.name)
      });
    }

    const response = {
      success: true,
      fontName: fontName || 'auto-selected',
      base64Size: base64Font.length,
      base64SizeKB: Math.round(base64Font.length / 1024),
      base64Font,
      usage: {
        pdfkit: `doc.registerFont('Korean', Buffer.from('${base64Font.substring(0, 50)}...', 'base64'));`
      }
    };

    console.log(`✅ [KoreanFontAPI] Base64 폰트 인코딩 완료: ${response.base64SizeKB}KB`);
    res.json(response);

  } catch (error) {
    console.error('❌ [KoreanFontAPI] Base64 폰트 인코딩 오류:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;