/**
 * DB에 저장된 모든 엑셀 파일에서 Input 시트를 제거하는 스크립트
 */

import { db } from '../db';
import { attachments, purchaseOrders } from '../../shared/schema';
import { eq, or, like, sql } from 'drizzle-orm';
import { removeAllInputSheets } from '../utils/excel-input-sheet-remover';
import fs from 'fs';
import path from 'path';
import { Buffer } from 'buffer';

async function processExcelFiles() {
  console.log('🚀 DB 엑셀 파일 Input 시트 제거 작업 시작...');
  
  try {
    // 1. 모든 엑셀 파일 조회
    const excelAttachments = await db
      .select({
        id: attachments.id,
        orderId: attachments.orderId,
        originalName: attachments.originalName,
        storedName: attachments.storedName,
        fileData: attachments.fileData,
        mimeType: attachments.mimeType,
        fileSize: attachments.fileSize,
        orderNumber: purchaseOrders.orderNumber,
      })
      .from(attachments)
      .leftJoin(purchaseOrders, eq(attachments.orderId, purchaseOrders.id))
      .where(
        or(
          like(attachments.mimeType, '%excel%'),
          like(attachments.mimeType, '%spreadsheet%'),
          like(attachments.originalName, '%.xlsx'),
          like(attachments.originalName, '%.xls')
        )
      );
    
    console.log(`📊 총 ${excelAttachments.length}개의 엑셀 파일 발견`);
    
    // 임시 디렉토리 생성
    const tempDir = path.join(process.cwd(), 'temp-excel-processing');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    // 2. 각 파일 처리
    for (const attachment of excelAttachments) {
      console.log(`\n📄 처리 중: ${attachment.originalName} (ID: ${attachment.id})`);
      
      try {
        // Base64 데이터가 없으면 건너뛰기
        if (!attachment.fileData) {
          console.log('⏭️ Base64 데이터 없음, 건너뜀');
          skipCount++;
          continue;
        }
        
        // 임시 파일 경로
        const tempInputPath = path.join(tempDir, `input_${attachment.id}.xlsx`);
        const tempOutputPath = path.join(tempDir, `output_${attachment.id}.xlsx`);
        
        // Base64를 파일로 저장
        const buffer = Buffer.from(attachment.fileData, 'base64');
        fs.writeFileSync(tempInputPath, buffer);
        
        // Input 시트 제거
        const result = await removeAllInputSheets(tempInputPath, tempOutputPath);
        
        if (result.success) {
          if (result.removedSheets.length > 0) {
            // 처리된 파일을 Base64로 변환
            const processedBuffer = fs.readFileSync(tempOutputPath);
            const newBase64 = processedBuffer.toString('base64');
            const newFileSize = processedBuffer.length;
            
            // DB 업데이트
            await db
              .update(attachments)
              .set({
                fileData: newBase64,
                fileSize: newFileSize,
              })
              .where(eq(attachments.id, attachment.id));
            
            console.log(`✅ 성공: ${result.removedSheets.length}개 Input 시트 제거됨`);
            console.log(`   제거된 시트: ${result.removedSheets.join(', ')}`);
            console.log(`   남은 시트: ${result.remainingSheets.join(', ')}`);
            successCount++;
          } else {
            console.log('ℹ️ Input 시트가 없어서 변경 없음');
            skipCount++;
          }
        } else {
          console.error(`❌ 처리 실패: ${result.error}`);
          errorCount++;
        }
        
        // 임시 파일 정리
        if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
        if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
        
      } catch (error) {
        console.error(`❌ 오류 발생:`, error);
        errorCount++;
      }
    }
    
    // 임시 디렉토리 정리
    try {
      fs.rmdirSync(tempDir);
    } catch (e) {
      // 디렉토리가 비어있지 않을 수 있음
    }
    
    // 결과 요약
    console.log('\n' + '='.repeat(50));
    console.log('📊 작업 완료 요약:');
    console.log(`✅ 성공적으로 처리: ${successCount}개`);
    console.log(`⏭️ 건너뛴 파일: ${skipCount}개`);
    console.log(`❌ 처리 실패: ${errorCount}개`);
    console.log(`📁 총 처리 파일: ${excelAttachments.length}개`);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('전체 작업 실패:', error);
    process.exit(1);
  }
}

// 스크립트 실행
processExcelFiles()
  .then(() => {
    console.log('\n✨ 모든 작업이 완료되었습니다!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 작업 중 오류 발생:', error);
    process.exit(1);
  });