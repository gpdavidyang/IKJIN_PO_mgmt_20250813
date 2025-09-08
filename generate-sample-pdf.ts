import ProfessionalPDFGenerationService from './server/services/professional-pdf-generation-service';
import * as fs from 'fs';
import * as path from 'path';
import { format } from 'date-fns';
import { exec } from 'child_process';

async function generateSamplePDF() {
  try {
    console.log('📄 샘플 PDF 생성 시작...\n');
    
    // 샘플 PDF 생성
    const pdfBuffer = await ProfessionalPDFGenerationService.generateSamplePDF();
    
    // 파일명에 타임스탬프 추가
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const fileName = `PO_Sample_${timestamp}.pdf`;
    
    // Downloads 폴더에 저장
    const downloadsPath = path.join(process.env.HOME || '', 'Downloads', fileName);
    fs.writeFileSync(downloadsPath, pdfBuffer);
    
    console.log('✅ 샘플 PDF 생성 완료!');
    console.log(`📁 저장 위치: ${downloadsPath}`);
    console.log(`📊 파일 크기: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    console.log('\n📋 샘플 데이터 내용:');
    console.log('  - 발주번호: PO-2025-SAMPLE');
    console.log('  - 발주업체: (주)익진엔지니어링');
    console.log('  - 수주업체: 삼성물산(주)');
    console.log('  - 현장: 래미안 원베일리 신축공사');
    console.log('  - 품목: 철근, 레미콘, 거푸집용 합판 (3개)');
    console.log('  - 총 금액: ₩140,250,000');
    
    // 파일 열기
    exec(`open "${downloadsPath}"`, (error) => {
      if (error) {
        console.log('\n💡 PDF 파일이 Downloads 폴더에 저장되었습니다.');
      } else {
        console.log('\n🎯 PDF 파일을 자동으로 열었습니다.');
      }
    });
    
  } catch (error) {
    console.error('❌ PDF 생성 중 오류:', error);
    process.exit(1);
  }
}

// 실행
generateSamplePDF().then(() => {
  console.log('\n✨ 완료!');
  setTimeout(() => process.exit(0), 1000);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});