/**
 * 한글 폰트 지원 상태 API
 * Vercel 환경에서 폰트 최적화 상태를 진단하고 테스트
 */

import { Router } from 'express';
import { fontManager } from '../utils/korean-font-manager';
import { VercelFontOptimizer } from '../utils/vercel-font-optimizer';

const router = Router();

/**
 * 한글 폰트 지원 상태 조회
 * GET /api/korean-font/status
 */
router.get('/status', async (req, res) => {
  try {
    console.log('🔍 [FontStatus] 한글 폰트 상태 조회 시작');
    
    // FontManager 보고서
    const fontReport = fontManager.getFontReport();
    
    // Vercel 최적화 상태
    const vercelDiagnostics = VercelFontOptimizer.diagnose();
    
    // Vercel 환경에서 최적화 폰트 테스트
    let vercelOptimizedTest: any = null;
    if (process.env.VERCEL) {
      try {
        const optimizedFont = VercelFontOptimizer.getOptimizedKoreanFont();
        vercelOptimizedTest = {
          success: !!optimizedFont,
          fontName: optimizedFont?.name || null,
          fontSize: optimizedFont ? Math.round(optimizedFont.size / 1024) : null,
          format: optimizedFont?.format || null
        };
      } catch (error) {
        vercelOptimizedTest = {
          success: false,
          error: error.message
        };
      }
    }
    
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      environment: process.env.VERCEL ? 'Vercel Serverless' : 'Local Development',
      fontManager: fontReport,
      vercelOptimization: vercelDiagnostics,
      vercelOptimizedFontTest: vercelOptimizedTest,
      recommendations: generateRecommendations(fontReport, vercelDiagnostics)
    };
    
    console.log('✅ [FontStatus] 한글 폰트 상태 조회 완료');
    res.json(response);
    
  } catch (error) {
    console.error('❌ [FontStatus] 상태 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Korean font status',
      details: error.message
    });
  }
});

/**
 * PDF 생성 테스트 (한글 폰트 포함)
 * POST /api/korean-font/test-pdf
 */
router.post('/test-pdf', async (req, res) => {
  try {
    console.log('🧪 [FontTest] PDF 한글 폰트 테스트 시작');
    
    // ProfessionalPDFGenerationService 동적 임포트
    const { ProfessionalPDFGenerationService } = await import('../services/professional-pdf-generation-service');
    
    // 샘플 PDF 생성
    const samplePdfBuffer = await ProfessionalPDFGenerationService.generateSamplePDF();
    
    console.log(`✅ [FontTest] 샘플 PDF 생성 성공 (크기: ${Math.round(samplePdfBuffer.length / 1024)}KB)`);
    
    // PDF를 응답으로 전송
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="korean_font_test_sample.pdf"');
    res.setHeader('Content-Length', samplePdfBuffer.length);
    
    res.end(samplePdfBuffer);
    
  } catch (error) {
    console.error('❌ [FontTest] PDF 테스트 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate test PDF',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * 한글 텍스트 번역 테스트
 * POST /api/korean-font/test-translate
 */
router.post('/test-translate', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }
    
    console.log(`🌐 [TranslateTest] 번역 테스트: "${text}"`);
    
    // ProfessionalPDFGenerationService의 번역 메서드 호출
    const { ProfessionalPDFGenerationService } = await import('../services/professional-pdf-generation-service');
    
    // translateForVercel은 private이므로 우회 방법 필요
    // 임시로 여기서 직접 번역 로직 테스트
    const translatedText = process.env.VERCEL ? translateKoreanText(text) : text;
    
    res.json({
      success: true,
      original: text,
      translated: translatedText,
      environment: process.env.VERCEL ? 'Vercel' : 'Local',
      hasKoreanChars: /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(text)
    });
    
  } catch (error) {
    console.error('❌ [TranslateTest] 번역 테스트 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test translation',
      details: error.message
    });
  }
});

/**
 * 간단한 한글 번역 함수 (테스트용)
 */
function translateKoreanText(text: string): string {
  const basicTranslations = {
    '구매발주서': 'Purchase Order',
    '발주업체': 'Issuer Company',
    '수주업체': 'Vendor Company',
    '품목명': 'Item Name',
    '수량': 'Quantity',
    '단가': 'Unit Price',
    '금액': 'Amount',
    '합계': 'Total'
  };
  
  let result = text;
  for (const [korean, english] of Object.entries(basicTranslations)) {
    result = result.replace(new RegExp(korean, 'g'), english);
  }
  
  // 남은 한글을 [Korean]으로 변환
  result = result.replace(/[가-힣]+/g, '[Korean]');
  
  return result;
}

/**
 * 권장사항 생성
 */
function generateRecommendations(fontReport: any, vercelDiagnostics: any): string[] {
  const recommendations: string[] = [];
  
  if (process.env.VERCEL) {
    if (!vercelDiagnostics.hasOptimizedFonts) {
      recommendations.push('Vercel 환경용 최적화된 폰트 디렉토리 생성 필요');
      recommendations.push('경량 한글 폰트를 fonts/optimized/ 디렉토리에 배치');
    }
    
    if (fontReport.availableFonts === 0) {
      recommendations.push('한글 폰트 파일이 Vercel 번들에 포함되지 않음');
      recommendations.push('vercel.json의 includeFiles 설정 확인');
    }
    
    recommendations.push('메모리 사용량 최적화를 위해 폰트 서브셋 생성 권장');
    recommendations.push('PDF 생성 시 한글 번역 모드 사용 고려');
  } else {
    if (fontReport.availableFonts > 0) {
      recommendations.push('로컬 환경에서 한글 폰트 정상 동작 중');
    } else {
      recommendations.push('한글 폰트 파일을 fonts/ 디렉토리에 배치 필요');
    }
  }
  
  return recommendations;
}

export default router;