/**
 * 첨부파일이 없는 주문들에 대해 새로운 PDF 생성
 */

import { db } from '../db';
import { attachments, purchaseOrders, purchaseOrderItems, vendors, projects, companies, users } from '../../shared/schema';
import { eq, notExists, sql } from 'drizzle-orm';
import { ProfessionalPDFGenerationService, ComprehensivePurchaseOrderData } from '../services/professional-pdf-generation-service';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

// 이전에 삭제된 Excel 파일들의 Order ID들
const ORDERS_NEED_PDF = [
  'PO-2025-00057', 'PO-2025-00058', 'PO-2025-00059', 'PO-2025-00060',
  'PO-2025-00061', 'PO-2025-00062', 'PO-2025-00063', 'PO-2025-00065',
  'PO-2025-00071', 'PO-2025-00074', 'PO-2025-00067', 'PO-2025-00094',
  'PO-2025-00047', 'PO-2025-00048', 'PO-2025-00049'
];

async function generateMissingPDFs() {
  console.log('🚀 누락된 PDF 파일 생성 작업 시작...');
  
  try {
    // 1. 해당 주문들 조회
    const ordersWithoutAttachments = await db
      .select()
      .from(purchaseOrders)
      .where(sql`"order_number" = ANY(${ORDERS_NEED_PDF})`);
    
    console.log(`📊 처리할 주문: ${ordersWithoutAttachments.length}개`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // 2. 각 주문에 대해 처리
    for (const order of ordersWithoutAttachments) {
      console.log(`\n📄 처리 중: ${order.orderNumber}`);
      
      try {
        // 거래처 정보 조회
        let vendor = null;
        if (order.vendorId) {
          const vendorData = await db
            .select()
            .from(vendors)
            .where(eq(vendors.id, order.vendorId))
            .limit(1);
          vendor = vendorData[0];
        }
        
        // 프로젝트 정보 조회
        let project = null;
        if (order.projectId) {
          const projectData = await db
            .select()
            .from(projects)
            .where(eq(projects.id, order.projectId))
            .limit(1);
          project = projectData[0];
        }
        
        // 작성자 정보 조회
        let creator = null;
        if (order.createdBy) {
          const creatorData = await db
            .select()
            .from(users)
            .where(eq(users.id, order.createdBy))
            .limit(1);
          creator = creatorData[0];
        }
        
        // 품목 정보 조회
        const items = await db
          .select()
          .from(purchaseOrderItems)
          .where(eq(purchaseOrderItems.orderId, order.id));
        
        // 회사 정보 조회 (IKJIN)
        const companyInfo = await db
          .select()
          .from(companies)
          .where(eq(companies.id, 1)) // IKJIN
          .limit(1);
        
        const company = companyInfo[0] || {
          name: 'IKJIN',
          businessNumber: '123-45-67890',
          representative: '대표이사',
          address: '서울특별시',
          phone: '02-1234-5678',
          email: 'info@ikjin.co.kr'
        };
        
        // PDF 생성을 위한 데이터 준비
        const pdfData: ComprehensivePurchaseOrderData = {
          // 기본 발주 정보
          orderNumber: order.orderNumber,
          orderDate: order.orderDate ? new Date(order.orderDate) : new Date(),
          deliveryDate: order.deliveryDate ? new Date(order.deliveryDate) : null,
          createdAt: order.createdAt ? new Date(order.createdAt) : new Date(),
          
          // 발주업체 정보 (IKJIN)
          issuerCompany: {
            name: company.name,
            businessNumber: company.businessNumber || undefined,
            representative: company.representative || undefined,
            address: company.address || undefined,
            phone: company.phone || undefined,
            email: company.email || undefined,
          },
          
          // 수주업체 정보 (거래처)
          vendorCompany: {
            name: vendor?.name || '미지정',
            businessNumber: vendor?.businessNumber || undefined,
            representative: vendor?.representative || undefined,
            address: vendor?.address || undefined,
            phone: vendor?.phone || undefined,
            email: vendor?.email || undefined,
            contactPerson: vendor?.contactPerson || undefined,
          },
          
          // 현장 정보
          project: {
            name: project?.name || '미지정',
            code: project?.code || undefined,
            location: project?.location || undefined,
            projectManager: project?.projectManager || undefined,
            projectManagerContact: project?.projectManagerContact || undefined,
            orderManager: creator?.name || undefined,
            orderManagerContact: creator?.email || undefined,
          },
          
          // 작성자 정보
          creator: {
            name: creator?.name || 'System',
            email: creator?.email || undefined,
            phone: undefined,
          },
          
          // 품목 정보
          items: items
            .sort((a, b) => (a.sequenceNo || 0) - (b.sequenceNo || 0))
            .map((item, index) => ({
              sequenceNo: item.sequenceNo || index + 1,
              name: item.name,
              specification: item.specification || undefined,
              quantity: item.quantity,
              unit: item.unit || undefined,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              deliveryLocation: item.deliveryLocation || undefined,
              deliveryEmail: item.deliveryEmail || undefined,
              remarks: item.remarks || undefined,
            })),
          
          // 금액 정보
          financial: {
            subtotalAmount: items.reduce((sum, item) => sum + item.totalPrice, 0),
            vatRate: 10,
            vatAmount: Math.round(items.reduce((sum, item) => sum + item.totalPrice, 0) * 0.1),
            totalAmount: order.totalAmount || Math.round(items.reduce((sum, item) => sum + item.totalPrice, 0) * 1.1),
            discountAmount: undefined,
            currencyCode: 'KRW',
          },
          
          // 메타데이터
          metadata: {
            notes: order.notes || undefined,
            documentId: `PDF-${order.orderNumber}-${Date.now()}`,
            generatedAt: new Date(),
            generatedBy: 'System Recovery Script',
            templateVersion: '2.0',
          },
        };
        
        // PDF 생성
        console.log('📝 PDF 생성 중...');
        const pdfBuffer = await ProfessionalPDFGenerationService.generateProfessionalPDF(pdfData);
        const pdfBase64 = pdfBuffer.toString('base64');
        
        // 새 PDF 파일명 생성
        const dateStr = format(new Date(), 'yyyyMMdd', { locale: ko });
        const newFileName = `IKJIN_${order.orderNumber}_${dateStr}.pdf`;
        
        // 새 PDF 파일 추가
        const [newAttachment] = await db
          .insert(attachments)
          .values({
            orderId: order.id,
            originalName: newFileName,
            storedName: newFileName,
            filePath: `/uploads/${newFileName}`,
            fileSize: pdfBuffer.length,
            mimeType: 'application/pdf',
            fileData: pdfBase64,
            uploadedBy: 'System Recovery',
            uploadedAt: new Date(),
          })
          .returning();
        
        console.log(`✅ 새 PDF 파일 생성됨: ${newFileName} (ID: ${newAttachment.id})`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ 처리 실패:`, error);
        errorCount++;
      }
    }
    
    // 결과 요약
    console.log('\n' + '='.repeat(50));
    console.log('📊 작업 완료 요약:');
    console.log(`✅ 성공적으로 생성: ${successCount}개`);
    console.log(`❌ 처리 실패: ${errorCount}개`);
    console.log(`📁 총 처리 대상: ${ordersWithoutAttachments.length}개`);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('전체 작업 실패:', error);
    process.exit(1);
  }
}

// 스크립트 실행
generateMissingPDFs()
  .then(() => {
    console.log('\n✨ 모든 작업이 완료되었습니다!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 작업 중 오류 발생:', error);
    process.exit(1);
  });