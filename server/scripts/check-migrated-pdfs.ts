/**
 * System Migration으로 생성된 PDF 파일들 확인
 */

import { db } from '../db';
import { attachments } from '../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';

async function checkMigratedPDFs() {
  console.log('🔍 System Migration으로 생성된 PDF 파일 확인 중...\n');
  
  try {
    const migratedPDFs = await db
      .select({
        id: attachments.id,
        orderId: attachments.orderId,
        originalName: attachments.originalName,
        fileSize: attachments.fileSize,
        mimeType: attachments.mimeType,
        uploadedBy: attachments.uploadedBy,
        uploadedAt: attachments.uploadedAt,
        hasBase64: attachments.fileData ? true : false,
      })
      .from(attachments)
      .where(
        and(
          eq(attachments.uploadedBy, 'System Migration'),
          eq(attachments.mimeType, 'application/pdf')
        )
      )
      .orderBy(desc(attachments.id));
    
    if (migratedPDFs.length === 0) {
      console.log('⚠️ System Migration으로 생성된 PDF 파일이 없습니다.');
      return;
    }
    
    console.log(`✅ 총 ${migratedPDFs.length}개의 PDF 파일이 발견되었습니다:\n`);
    
    migratedPDFs.forEach((pdf, index) => {
      console.log(`${index + 1}. ID: ${pdf.id}`);
      console.log(`   Order ID: ${pdf.orderId}`);
      console.log(`   파일명: ${pdf.originalName}`);
      console.log(`   크기: ${(pdf.fileSize / 1024).toFixed(2)} KB`);
      console.log(`   Base64 데이터: ${pdf.hasBase64 ? '✅ 있음' : '❌ 없음'}`);
      console.log(`   생성일: ${pdf.uploadedAt}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 조회 중 오류 발생:', error);
  }
}

checkMigratedPDFs()
  .then(() => {
    console.log('✨ 확인 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 오류:', error);
    process.exit(1);
  });