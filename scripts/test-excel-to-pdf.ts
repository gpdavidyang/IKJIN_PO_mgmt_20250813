#!/usr/bin/env node

/**
 * Excel to PDF 변환 기능 테스트 스크립트
 * 
 * 사용법: npx tsx scripts/test-excel-to-pdf.ts [excel-file-path]
 */

import { ExcelToPDFConverter } from '../server/utils/excel-to-pdf-converter';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testExcelToPDF() {
  try {
    // 테스트할 Excel 파일 경로
    const testFile = process.argv[2] || path.join(__dirname, '../uploads/test-excel.xlsx');
    
    if (!fs.existsSync(testFile)) {
      console.error(`❌ 테스트 파일을 찾을 수 없습니다: ${testFile}`);
      console.log('사용법: npx tsx scripts/test-excel-to-pdf.ts [excel-file-path]');
      return;
    }

    console.log('🚀 Excel to PDF 변환 테스트 시작...');
    console.log(`📄 입력 파일: ${testFile}`);

    // PDF 변환 실행
    const outputPath = testFile.replace(/\.(xlsx?)$/i, '-test.pdf');
    console.log(`📄 출력 파일: ${outputPath}`);

    const startTime = Date.now();
    const pdfPath = await ExcelToPDFConverter.convertExcelToPDF(testFile, outputPath);
    const endTime = Date.now();

    // 결과 확인
    if (fs.existsSync(pdfPath)) {
      const stats = fs.statSync(pdfPath);
      console.log(`✅ PDF 변환 성공!`);
      console.log(`📊 변환 시간: ${endTime - startTime}ms`);
      console.log(`📊 파일 크기: ${Math.round(stats.size / 1024)}KB`);
      console.log(`📍 파일 위치: ${pdfPath}`);
    } else {
      console.error('❌ PDF 파일이 생성되지 않았습니다.');
    }

  } catch (error) {
    console.error('❌ 변환 중 오류 발생:', error);
    console.error((error as Error).stack);
  }
}

// 테스트 실행
testExcelToPDF();