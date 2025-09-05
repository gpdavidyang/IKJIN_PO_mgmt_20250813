/**
 * 발주서 상태 마이그레이션 스크립트
 * 기존 status 필드를 새로운 orderStatus로 매핑
 */

import { db } from '../db';
import { purchaseOrders, orderHistory } from '@shared/schema';
import { eq, isNull } from 'drizzle-orm';

export async function migrateOrderStatus() {
  console.log('🚀 발주서 상태 마이그레이션 시작...');

  try {
    // 1. orderStatus가 NULL인 기존 데이터를 조회
    const ordersToMigrate = await db
      .select()
      .from(purchaseOrders)
      .where(isNull(purchaseOrders.orderStatus));

    console.log(`📊 마이그레이션 대상: ${ordersToMigrate.length}개 발주서`);

    if (ordersToMigrate.length === 0) {
      console.log('✅ 마이그레이션이 필요한 데이터가 없습니다.');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    // 2. 각 발주서별로 상태 매핑 및 업데이트
    for (const order of ordersToMigrate) {
      try {
        // status를 orderStatus로 매핑
        let newOrderStatus: 'draft' | 'created' | 'sent' | 'delivered' = 'draft';
        let newApprovalStatus: 'not_required' | 'pending' | 'approved' | 'rejected' = 'not_required';

        switch (order.status) {
          case 'draft':
            newOrderStatus = 'draft';
            newApprovalStatus = 'not_required';
            break;
          case 'pending':
            newOrderStatus = 'draft'; // pending은 아직 생성되지 않은 상태
            newApprovalStatus = 'pending';
            break;
          case 'approved':
            newOrderStatus = 'created'; // 승인됨 = 발주서 생성됨
            newApprovalStatus = 'approved';
            break;
          case 'sent':
            newOrderStatus = 'sent';
            newApprovalStatus = 'approved';
            break;
          case 'completed':
            newOrderStatus = 'delivered';
            newApprovalStatus = 'approved';
            break;
          default:
            newOrderStatus = 'draft';
            newApprovalStatus = 'not_required';
        }

        // 3. 발주서 상태 업데이트
        await db
          .update(purchaseOrders)
          .set({
            orderStatus: newOrderStatus,
            approvalStatus: newApprovalStatus,
            updatedAt: new Date()
          })
          .where(eq(purchaseOrders.id, order.id));

        // 4. 히스토리 기록
        await db.insert(orderHistory).values({
          orderId: order.id,
          userId: 'system',
          action: 'status_migrated',
          changes: {
            from: { status: order.status },
            to: { 
              orderStatus: newOrderStatus,
              approvalStatus: newApprovalStatus
            },
            migrationType: 'legacy_to_dual_status'
          },
          createdAt: new Date()
        });

        successCount++;
        console.log(`✅ 발주서 ${order.orderNumber} 마이그레이션 완료: ${order.status} → ${newOrderStatus}`);

      } catch (error) {
        errorCount++;
        console.error(`❌ 발주서 ${order.orderNumber} 마이그레이션 실패:`, error);
      }
    }

    console.log(`\n📈 마이그레이션 결과:`);
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`❌ 실패: ${errorCount}개`);
    console.log(`📊 전체: ${ordersToMigrate.length}개`);

    if (errorCount === 0) {
      console.log('🎉 모든 발주서 상태 마이그레이션이 성공적으로 완료되었습니다!');
    } else {
      console.warn('⚠️  일부 발주서 마이그레이션에 실패했습니다. 로그를 확인해주세요.');
    }

  } catch (error) {
    console.error('💥 마이그레이션 중 치명적인 오류 발생:', error);
    throw error;
  }
}

// PDF 없는 발주서에 대한 PDF 생성 함수
export async function generateMissingPDFs() {
  console.log('📄 PDF 없는 발주서 PDF 생성 시작...');

  try {
    // PDF 첨부파일이 없고 orderStatus가 draft가 아닌 발주서 조회
    const ordersNeedingPDF = await db.query.purchaseOrders.findMany({
      where: (orders, { and, ne, notExists }) => and(
        ne(orders.orderStatus, 'draft'),
        notExists(
          db.query.attachments.findFirst({
            where: (attachments, { and, eq, like }) => and(
              eq(attachments.orderId, orders.id),
              like(attachments.mimeType, 'application/pdf%')
            )
          })
        )
      ),
      with: {
        vendor: true,
        project: true,
        items: true,
        user: true
      },
      limit: 50 // 한 번에 50개씩 처리
    });

    console.log(`📊 PDF 생성 대상: ${ordersNeedingPDF.length}개 발주서`);

    if (ordersNeedingPDF.length === 0) {
      console.log('✅ PDF 생성이 필요한 발주서가 없습니다.');
      return;
    }

    // 동적으로 PDF 생성 서비스 import
    const { PDFGenerationService } = await import('../services/pdf-generation-service');

    let successCount = 0;
    let errorCount = 0;

    for (const order of ordersNeedingPDF) {
      try {
        console.log(`📄 발주서 ${order.orderNumber} PDF 생성 중...`);

        const pdfData = {
          orderNumber: order.orderNumber,
          orderDate: new Date(order.orderDate),
          deliveryDate: order.deliveryDate ? new Date(order.deliveryDate) : null,
          projectName: order.project?.projectName,
          vendorName: order.vendor?.name,
          vendorContact: order.vendor?.contactPerson,
          vendorEmail: order.vendor?.email,
          items: order.items.map(item => ({
            category: item.majorCategory || '',
            subCategory1: item.middleCategory || '',
            subCategory2: item.minorCategory || '',
            name: item.itemName,
            specification: item.specification || '',
            quantity: Number(item.quantity),
            unit: item.unit || '개',
            unitPrice: Number(item.unitPrice),
            price: Number(item.totalAmount),
            deliveryLocation: order.project?.location || ''
          })),
          totalAmount: Number(order.totalAmount),
          notes: order.notes || '',
          site: order.project?.projectName
        };

        const pdfResult = await PDFGenerationService.generatePurchaseOrderPDF(
          order.id,
          pdfData,
          'system' // system user로 생성
        );

        if (pdfResult.success) {
          successCount++;
          console.log(`✅ 발주서 ${order.orderNumber} PDF 생성 완료`);
          
          // 히스토리 기록
          await db.insert(orderHistory).values({
            orderId: order.id,
            userId: 'system',
            action: 'pdf_generated',
            changes: {
              pdfPath: pdfResult.pdfPath,
              attachmentId: pdfResult.attachmentId,
              generationType: 'migration_batch'
            },
            createdAt: new Date()
          });
        } else {
          errorCount++;
          console.error(`❌ 발주서 ${order.orderNumber} PDF 생성 실패:`, pdfResult.error);
        }

      } catch (error) {
        errorCount++;
        console.error(`❌ 발주서 ${order.orderNumber} PDF 생성 중 오류:`, error);
      }
    }

    console.log(`\n📈 PDF 생성 결과:`);
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`❌ 실패: ${errorCount}개`);
    console.log(`📊 전체: ${ordersNeedingPDF.length}개`);

  } catch (error) {
    console.error('💥 PDF 생성 중 치명적인 오류 발생:', error);
    throw error;
  }
}

// 스크립트 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      await migrateOrderStatus();
      await generateMissingPDFs();
    } catch (error) {
      console.error('스크립트 실행 실패:', error);
      process.exit(1);
    }
  })();
}