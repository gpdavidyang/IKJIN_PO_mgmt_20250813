/**
 * 통합 Excel PDF 서비스 테스트 스크립트
 * 
 * 사용법:
 * node scripts/test-unified-pdf-service.cjs [excel-file-path]
 */

import { UnifiedExcelPdfService } from '../server/services/unified-excel-pdf-service';
import path from 'path';
import fs from 'fs';

async function testUnifiedPdfService() {
  console.log('🧪 통합 Excel PDF 서비스 테스트 시작...\n');

  // 서비스 상태 확인
  console.log('📊 서비스 상태 확인...');
  const status = await UnifiedExcelPdfService.getServiceStatus();
  console.log('서비스 상태:', JSON.stringify(status, null, 2));
  console.log();

  // 사용 가능한 엔진 목록
  console.log('🔧 사용 가능한 엔진 목록...');
  const engines = await UnifiedExcelPdfService.getAvailableEngines();
  console.log('엔진:', engines);
  console.log();

  if (!status.available) {
    console.error('❌ 사용 가능한 변환 엔진이 없습니다.');
    return;
  }

  // 테스트할 Excel 파일 경로 (명령줄 인수 또는 기본값)
  const testExcelPath = process.argv[2] || path.join(process.cwd(), 'uploads', 'test.xlsx');
  
  if (!fs.existsSync(testExcelPath)) {
    console.error(`❌ 테스트 Excel 파일을 찾을 수 없습니다: ${testExcelPath}`);
    console.log('💡 사용법: node scripts/test-unified-pdf-service.cjs [excel-file-path]');
    return;
  }

  console.log(`📄 테스트 파일: ${testExcelPath}`);

  // 테스트 케이스들
  const testCases = [
    {
      name: '기본 변환',
      options: {}
    },
    {
      name: '고품질 + 워터마크',
      options: {
        quality: 'high' as const,
        watermark: '테스트 발주서',
        orientation: 'landscape' as const
      }
    },
    {
      name: 'Mock 엔진 강제 사용',
      options: {
        fallbackEngine: 'mock' as const,
        watermark: 'Mock 테스트'
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🎯 테스트: ${testCase.name}`);
    
    const outputPath = path.join(
      path.dirname(testExcelPath),
      `test-output-${testCase.name.replace(/\s+/g, '-').toLowerCase()}.pdf`
    );

    try {
      const result = await UnifiedExcelPdfService.convertExcelToPDF(
        testExcelPath,
        {
          ...testCase.options,
          outputPath
        }
      );

      console.log(`결과:`, {
        성공: result.success,
        엔진: result.engineUsed,
        파일크기: result.stats?.fileSize ? `${Math.round(result.stats.fileSize / 1024)}KB` : 'N/A',
        시트수: result.stats?.sheetCount,
        처리시간: result.stats?.processingTime ? `${result.stats.processingTime}ms` : 'N/A',
        재시도횟수: result.stats?.retryCount || 0,
        오류: result.error || 'N/A',
        경고: result.warnings?.join(', ') || 'N/A'
      });

      if (result.success && result.pdfPath) {
        console.log(`✅ PDF 생성됨: ${result.pdfPath}`);
      }

    } catch (error) {
      console.error(`❌ 테스트 실패:`, error.message);
    }
  }

  console.log('\n🏁 통합 Excel PDF 서비스 테스트 완료');
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  testUnifiedPdfService().catch(console.error);
}

export default testUnifiedPdfService;