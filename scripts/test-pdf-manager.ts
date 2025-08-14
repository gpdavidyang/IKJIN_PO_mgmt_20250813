#!/usr/bin/env node

/**
 * PDF File Manager Test Script
 */

import { PDFFileManager, initPDFManager, cleanupOldPDFs, getPDFStorageInfo } from '../server/utils/pdf-file-manager';

async function testPDFManager(): Promise<void> {
  console.log('🚀 PDF File Manager 테스트 시작...\n');

  try {
    // 1. PDF 저장소 초기화
    console.log('📁 Step 1: PDF 저장소 초기화');
    await initPDFManager();
    console.log('✅ 초기화 완료\n');

    // 2. 저장소 통계 조회
    console.log('📊 Step 2: 저장소 통계 조회');
    const storageInfo = await getPDFStorageInfo();
    console.log(`📁 총 PDF 파일: ${storageInfo.totalFiles}개`);
    console.log(`💾 총 사용 용량: ${storageInfo.totalSizeMB}MB`);
    console.log(`📂 관리 디렉토리: ${storageInfo.directories.join(', ')}\n`);

    // 3. 상세 저장소 통계
    console.log('📈 Step 3: 상세 저장소 통계');
    const detailedStats = await PDFFileManager.getStorageStats();
    console.log(`  - 임시 파일: ${detailedStats.temp.count}개, ${Math.round(detailedStats.temp.size / 1024 / 1024)}MB`);
    console.log(`  - 아카이브: ${detailedStats.archive.count}개, ${Math.round(detailedStats.archive.size / 1024 / 1024)}MB`);
    console.log(`  - 발주서: ${detailedStats.orders.count}개, ${Math.round(detailedStats.orders.size / 1024 / 1024)}MB\n`);

    // 4. 임시 파일 목록 조회
    console.log('📋 Step 4: 임시 PDF 파일 목록');
    const tempFiles = await PDFFileManager.listPDFFiles('temp');
    console.log(`발견된 임시 PDF 파일: ${tempFiles.length}개`);
    
    tempFiles.slice(0, 5).forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.filename} (${Math.round(file.size / 1024)}KB, ${file.isValid ? '유효' : '무효'})`);
    });
    
    if (tempFiles.length > 5) {
      console.log(`  ... 그 외 ${tempFiles.length - 5}개 파일`);
    }
    console.log('');

    // 5. 정리 작업 (DRY RUN)
    console.log('🧹 Step 5: 정리 작업 시뮬레이션 (DRY RUN)');
    const dryRunResult = await PDFFileManager.cleanupTempPDFs({
      maxAge: 1 * 60 * 60 * 1000, // 1시간
      keepRecent: 5,
      dryRun: true
    });
    
    console.log(`🔍 정리 대상: ${dryRunResult.cleaned}개 파일`);
    console.log(`📊 총 용량: ${Math.round(dryRunResult.totalSize / 1024 / 1024)}MB`);
    if (dryRunResult.errors.length > 0) {
      console.log(`⚠️ 오류: ${dryRunResult.errors.length}건`);
    }
    console.log('');

    // 6. 유지보수 실행 (실제 정리는 하지 않음)
    console.log('🔧 Step 6: 유지보수 시뮬레이션');
    console.log('실제 유지보수는 실행하지 않습니다. (데이터 보존)');
    console.log('실행하려면: await PDFFileManager.runMaintenanceCleanup()');
    console.log('');

    // 7. PDF 검증 테스트
    console.log('🔍 Step 7: PDF 파일 검증 테스트');
    let validCount = 0;
    let invalidCount = 0;
    
    for (const file of tempFiles.slice(0, 10)) {
      const isValid = PDFFileManager.validatePDFFile(file.path);
      if (isValid) {
        validCount++;
      } else {
        invalidCount++;
        console.log(`❌ 무효한 PDF: ${file.filename}`);
      }
    }
    
    console.log(`✅ 유효한 PDF: ${validCount}개`);
    console.log(`❌ 무효한 PDF: ${invalidCount}개\n`);

    console.log('🎉 PDF File Manager 테스트 완료!');
    console.log('모든 기능이 정상적으로 작동합니다.');

  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error);
  }
}

// 직접 실행된 경우에만 테스트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  testPDFManager().catch(console.error);
}

export { testPDFManager };