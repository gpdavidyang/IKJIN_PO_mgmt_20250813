#!/usr/bin/env node

/**
 * Enhanced Excel to PDF Converter Test Script
 */

import { EnhancedExcelToPDFConverter, convertExcelToPDFEnhanced } from '../server/utils/enhanced-excel-to-pdf';
import path from 'path';
import fs from 'fs';

async function testEnhancedPDFConversion() {
  console.log('🚀 Enhanced Excel to PDF 변환 테스트 시작...\n');

  // 테스트할 파일 찾기
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const excelFiles = fs.readdirSync(uploadsDir)
    .filter(file => file.endsWith('.xlsx') && !file.includes('extracted'))
    .slice(0, 2); // 처음 2개 파일만 테스트

  if (excelFiles.length === 0) {
    console.log('❌ 테스트할 Excel 파일을 찾을 수 없습니다.');
    return;
  }

  for (const excelFile of excelFiles) {
    const excelPath = path.join(uploadsDir, excelFile);
    const outputPath = path.join(uploadsDir, `${path.parse(excelFile).name}-enhanced.pdf`);

    console.log(`\n📄 테스트 파일: ${excelFile}`);
    console.log(`📍 입력 경로: ${excelPath}`);
    console.log(`📍 출력 경로: ${outputPath}`);

    try {
      // 기본 변환 테스트
      console.log('\n🔄 기본 품질로 변환 중...');
      const result1 = await convertExcelToPDFEnhanced(excelPath, outputPath, {
        quality: 'medium',
        orientation: 'landscape'
      });

      if (result1.success) {
        console.log('✅ 기본 변환 성공!');
        console.log(`📊 파일 크기: ${Math.round(result1.stats!.fileSize / 1024)}KB`);
        console.log(`📋 시트 수: ${result1.stats!.sheetCount}`);
        console.log(`⏱️ 처리 시간: ${result1.stats!.processingTime}ms`);
        
        // PDF 검증
        const isValid = EnhancedExcelToPDFConverter.validatePDF(result1.pdfPath!);
        console.log(`🔍 PDF 검증: ${isValid ? '통과' : '실패'}`);
      } else {
        console.log('❌ 기본 변환 실패:', result1.error);
      }

      // 고품질 변환 테스트
      const highQualityPath = path.join(uploadsDir, `${path.parse(excelFile).name}-enhanced-hq.pdf`);
      console.log('\n🔄 고품질로 변환 중...');
      
      const result2 = await convertExcelToPDFEnhanced(excelPath, highQualityPath, {
        quality: 'high',
        orientation: 'landscape',
        watermark: '발주서',
        excludeSheets: ['Input', 'Settings'] // Input 시트 제외
      });

      if (result2.success) {
        console.log('✅ 고품질 변환 성공!');
        console.log(`📊 파일 크기: ${Math.round(result2.stats!.fileSize / 1024)}KB`);
        console.log(`⏱️ 처리 시간: ${result2.stats!.processingTime}ms`);
      } else {
        console.log('❌ 고품질 변환 실패:', result2.error);
      }

      console.log('\n' + '='.repeat(60));

    } catch (error) {
      console.error(`❌ 테스트 중 오류 발생 (${excelFile}):`, error);
    }
  }

  console.log('\n🎉 모든 테스트 완료!');
}

// 직접 실행된 경우에만 테스트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  testEnhancedPDFConversion().catch(console.error);
}

export { testEnhancedPDFConversion };