import { ProfessionalPDFGenerationService } from './server/services/professional-pdf-generation-service';
import { db } from './server/db';
import { purchaseOrders, attachments } from './shared/schema';
import { eq, and, or, inArray, sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

/**
 * PDF 재생성 스크립트
 * 기존 간단한 PDF를 새로운 전문적인 PDF로 재생성
 */

// 명령줄 인자 파싱
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isAll = args.includes('--all');
const statusArg = args.find(arg => arg.startsWith('--status='));
const batchArg = args.find(arg => arg.startsWith('--batch='));
const batchSize = batchArg ? parseInt(batchArg.split('=')[1]) : 5;

// 상태 필터링
const targetStatuses = statusArg 
  ? [statusArg.split('=')[1]]
  : ['created', 'sent', 'delivered'];

console.log('🚀 PDF 재생성 스크립트 시작');
console.log(`📋 설정:
  - 드라이런: ${isDryRun}
  - 대상 상태: ${targetStatuses.join(', ')}
  - 배치 크기: ${batchSize}
`);

/**
 * 백업 테이블 생성
 */
async function createBackupTable() {
  if (isDryRun) {
    console.log('🔄 [드라이런] 백업 테이블 생성 스킵');
    return;
  }

  try {
    // 백업 테이블이 없으면 생성
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS attachments_backup AS 
      SELECT * FROM attachments 
      WHERE mime_type = 'application/pdf'
      AND uploaded_at < NOW()
      LIMIT 0
    `);

    // 현재 PDF 데이터를 백업 테이블에 삽입
    const backupResult = await db.execute(sql`
      INSERT INTO attachments_backup 
      SELECT * FROM attachments 
      WHERE mime_type = 'application/pdf'
      AND NOT EXISTS (
        SELECT 1 FROM attachments_backup ab 
        WHERE ab.id = attachments.id
      )
    `);

    console.log(`✅ 백업 완료: ${backupResult.rowCount}개 PDF 백업됨`);
  } catch (error) {
    console.error('❌ 백업 테이블 생성/백업 실패:', error);
    throw error;
  }
}

/**
 * 임시저장(draft) 상태의 PDF 삭제
 */
async function deleteDraftPDFs() {
  try {
    // draft 상태 발주서의 PDF 조회
    const draftPDFs = await db
      .select({
        attachmentId: attachments.id,
        orderId: attachments.orderId,
        fileName: attachments.originalName,
        orderNumber: purchaseOrders.orderNumber,
        orderStatus: purchaseOrders.orderStatus
      })
      .from(attachments)
      .innerJoin(purchaseOrders, eq(attachments.orderId, purchaseOrders.id))
      .where(and(
        eq(attachments.mimeType, 'application/pdf'),
        eq(purchaseOrders.orderStatus, 'draft')
      ));

    if (draftPDFs.length === 0) {
      console.log('ℹ️ 삭제할 draft 상태 PDF가 없습니다.');
      return;
    }

    console.log(`🗑️ draft 상태 PDF ${draftPDFs.length}개 발견:`);
    draftPDFs.forEach(pdf => {
      console.log(`  - ${pdf.orderNumber}: ${pdf.fileName}`);
    });

    if (!isDryRun) {
      // PDF 삭제 실행
      const deleteResult = await db
        .delete(attachments)
        .where(and(
          eq(attachments.mimeType, 'application/pdf'),
          inArray(attachments.id, draftPDFs.map(p => p.attachmentId))
        ));

      console.log(`✅ ${draftPDFs.length}개 draft PDF 삭제 완료`);
    } else {
      console.log(`🔄 [드라이런] ${draftPDFs.length}개 draft PDF 삭제 예정`);
    }
  } catch (error) {
    console.error('❌ Draft PDF 삭제 실패:', error);
    throw error;
  }
}

/**
 * PDF 재생성 함수
 */
async function regeneratePDFs() {
  try {
    // 재생성 대상 발주서 조회
    const orders = await db
      .select()
      .from(purchaseOrders)
      .where(inArray(purchaseOrders.orderStatus, targetStatuses));

    console.log(`\n📊 재생성 대상: ${orders.length}개 발주서`);

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    // 배치 처리
    for (let i = 0; i < orders.length; i += batchSize) {
      const batch = orders.slice(i, i + batchSize);
      console.log(`\n🔄 배치 ${Math.floor(i / batchSize) + 1}/${Math.ceil(orders.length / batchSize)} 처리 중...`);

      for (const order of batch) {
        try {
          console.log(`\n📄 처리 중: ${order.orderNumber} (${order.orderStatus})`);

          // 기존 PDF 조회
          const existingPDFs = await db
            .select()
            .from(attachments)
            .where(and(
              eq(attachments.orderId, order.id),
              eq(attachments.mimeType, 'application/pdf')
            ));

          if (existingPDFs.length > 0) {
            console.log(`  기존 PDF ${existingPDFs.length}개 발견`);
            
            if (!isDryRun) {
              // 기존 PDF 삭제
              await db
                .delete(attachments)
                .where(and(
                  eq(attachments.orderId, order.id),
                  eq(attachments.mimeType, 'application/pdf')
                ));
              console.log(`  기존 PDF 삭제 완료`);
            }
          }

          // 새 PDF 생성
          console.log('  새 PDF 생성 중...');
          
          if (!isDryRun) {
            // 포괄적인 데이터 수집
            const orderData = await ProfessionalPDFGenerationService
              .gatherComprehensiveOrderData(order.id);
            
            if (!orderData) {
              console.warn(`  ⚠️ 데이터 수집 실패: ${order.orderNumber}`);
              failCount++;
              continue;
            }

            // PDF 버퍼 생성
            const pdfBuffer = await ProfessionalPDFGenerationService
              .generateProfessionalPDF(orderData);

            // 새 PDF를 attachments 테이블에 삽입
            const timestamp = Date.now();
            const fileName = `PO_Professional_${order.orderNumber}_${timestamp}.pdf`;
            
            const [newAttachment] = await db
              .insert(attachments)
              .values({
                orderId: order.id,
                originalName: fileName,
                storedName: fileName,
                filePath: `professional://${fileName}`,
                fileSize: pdfBuffer.length,
                mimeType: 'application/pdf',
                uploadedBy: 'test_admin_001', // Using admin user for system regeneration
                fileData: pdfBuffer.toString('base64')
              })
              .returning();

            console.log(`  ✅ 새 PDF 생성 완료: ${fileName} (${Math.round(pdfBuffer.length / 1024)}KB)`);
            successCount++;
          } else {
            console.log('  [드라이런] PDF 생성 시뮬레이션');
            successCount++;
          }

        } catch (error) {
          console.error(`  ❌ 처리 실패: ${order.orderNumber}`, error);
          failCount++;
        }
      }

      // 배치 간 대기 (메모리 관리)
      if (i + batchSize < orders.length && !isDryRun) {
        console.log('⏳ 다음 배치 처리 전 2초 대기...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // 결과 요약
    console.log(`
╔══════════════════════════════════════╗
║           재생성 완료 요약           ║
╠══════════════════════════════════════╣
║ 총 대상:     ${String(orders.length).padStart(4)} 개                 ║
║ 성공:        ${String(successCount).padStart(4)} 개                 ║
║ 실패:        ${String(failCount).padStart(4)} 개                 ║
║ 건너뜀:      ${String(skipCount).padStart(4)} 개                 ║
╚══════════════════════════════════════╝
`);

  } catch (error) {
    console.error('❌ PDF 재생성 실패:', error);
    throw error;
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    console.log('🏁 스크립트 시작\n');

    // Step 1: 백업 테이블 생성
    console.log('📦 Step 1: 백업 테이블 생성');
    await createBackupTable();

    // Step 2: Draft 상태 PDF 삭제
    console.log('\n🗑️ Step 2: Draft 상태 PDF 삭제');
    await deleteDraftPDFs();

    // Step 3: PDF 재생성
    console.log('\n🔄 Step 3: PDF 재생성');
    await regeneratePDFs();

    console.log('\n🎉 모든 작업이 완료되었습니다!');
    
    if (isDryRun) {
      console.log('\n⚠️ 드라이런 모드였습니다. 실제 변경사항은 없습니다.');
      console.log('실제 실행하려면 --dry-run 옵션을 제거하고 다시 실행하세요.');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n💥 스크립트 실행 중 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
main();