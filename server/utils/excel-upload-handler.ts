import { db } from '../database';
import { attachments } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { ProfessionalPDFGenerationService } from '../services/professional-pdf-generation-service';

export interface ExcelUploadResult {
  orderId: number;
  orderNumber: string;
  excelAttachmentId?: number;
  pdfAttachmentId?: number;
  attachments: Array<{
    id: number;
    type: 'excel' | 'pdf';
    originalName: string;
    downloadUrl: string;
  }>;
}

/**
 * Excel 업로드 후 PDF 생성 및 첨부파일 정보 반환
 */
export async function handleExcelUploadWithPDF(
  orderId: number,
  orderNumber: string,
  userId: string,
  excelAttachmentId?: number
): Promise<ExcelUploadResult> {
  console.log(`📋 Excel 업로드 후처리 시작: Order ${orderNumber} (ID: ${orderId})`);
  
  const result: ExcelUploadResult = {
    orderId,
    orderNumber,
    excelAttachmentId,
    attachments: []
  };

  try {
    // 1. Excel 첨부파일 정보 조회
    if (excelAttachmentId) {
      const [excelAttachment] = await db
        .select()
        .from(attachments)
        .where(eq(attachments.id, excelAttachmentId));
      
      if (excelAttachment) {
        result.attachments.push({
          id: excelAttachment.id,
          type: 'excel',
          originalName: excelAttachment.originalName,
          downloadUrl: `/api/attachments/${excelAttachment.id}/download`
        });
        console.log(`✅ Excel 첨부파일 확인: ${excelAttachment.originalName}`);
      }
    }

    // 2. PDF 생성
    console.log(`📄 PDF 생성 시작...`);
    const pdfResult = await ProfessionalPDFGenerationService.generateProfessionalPurchaseOrderPDF(
      orderId,
      userId
    );

    if (pdfResult.success && pdfResult.attachmentId) {
      result.pdfAttachmentId = pdfResult.attachmentId;
      
      // PDF 첨부파일 정보 조회
      const [pdfAttachment] = await db
        .select()
        .from(attachments)
        .where(eq(attachments.id, pdfResult.attachmentId));
      
      if (pdfAttachment) {
        result.attachments.push({
          id: pdfAttachment.id,
          type: 'pdf',
          originalName: pdfAttachment.originalName,
          downloadUrl: `/api/attachments/${pdfAttachment.id}/download`
        });
        console.log(`✅ PDF 생성 완료: ${pdfAttachment.originalName}`);
      }
    } else {
      console.error(`❌ PDF 생성 실패:`, pdfResult.error);
    }

    // 3. 모든 첨부파일 목록 반환
    console.log(`📎 총 ${result.attachments.length}개 첨부파일 처리 완료`);
    
    return result;
    
  } catch (error) {
    console.error(`❌ Excel 업로드 후처리 오류:`, error);
    return result;
  }
}

/**
 * 주문의 모든 첨부파일 목록 조회
 */
export async function getOrderAttachments(orderId: number) {
  try {
    const orderAttachments = await db
      .select({
        id: attachments.id,
        originalName: attachments.originalName,
        mimeType: attachments.mimeType,
        fileSize: attachments.fileSize,
        uploadedAt: attachments.uploadedAt
      })
      .from(attachments)
      .where(eq(attachments.orderId, orderId))
      .orderBy(attachments.uploadedAt);

    return orderAttachments.map(att => {
      // 파일 타입 판별
      let fileType: 'pdf' | 'excel' | 'other' = 'other';
      if (att.mimeType?.includes('pdf')) {
        fileType = 'pdf';
      } else if (att.mimeType?.includes('spreadsheet') || att.mimeType?.includes('excel')) {
        fileType = 'excel';
      }

      return {
        id: att.id,
        type: fileType,
        originalName: att.originalName,
        mimeType: att.mimeType,
        fileSize: att.fileSize,
        uploadedAt: att.uploadedAt,
        downloadUrl: `/api/attachments/${att.id}/download`
      };
    });
  } catch (error) {
    console.error(`❌ 첨부파일 목록 조회 오류:`, error);
    return [];
  }
}