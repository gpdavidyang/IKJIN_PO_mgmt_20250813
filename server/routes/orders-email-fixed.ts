/**
 * Fixed Email Route for Purchase Order Management
 * Fixes critical email issues: Excel attachments, custom messages, email history recording
 */

import { Router } from "express";
import { requireAuth } from "../local-auth";
import { attachments as attachmentsTable, purchaseOrders, emailSendHistory } from "@shared/schema";
import * as database from "../db";
import { eq, desc } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as XLSX from "xlsx";
import { POEmailService } from "../utils/po-email-service";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Database instance
const db = database.db;
const emailService = new POEmailService();

// Helper function to update order status after successful email sending
async function updateOrderStatusAfterEmail(orderNumber: string): Promise<void> {
  console.log(`📧 이메일 발송 후 상태 업데이트: ${orderNumber} → sent`);
  
  await database.db.update(purchaseOrders)
    .set({
      orderStatus: 'sent', // 발주상태: 이메일 발송 완료 후 'sent'로 변경
      updatedAt: new Date()
    })
    .where(eq(purchaseOrders.orderNumber, orderNumber));
}

// 이메일 발송 (POEmailService 사용으로 완전히 재작성)
router.post("/orders/send-email", requireAuth, async (req, res) => {
  try {
    const { 
      orderData, 
      to, 
      cc, 
      subject, 
      message, 
      selectedAttachmentIds = []
    } = req.body;
    
    console.log('📧 이메일 발송 요청 (POEmailService 사용):', { 
      orderData, 
      to, 
      cc, 
      subject, 
      message: message ? '[메시지 있음]' : '[메시지 없음]',
      selectedAttachmentIds
    });
    
    // 수신자 검증
    if (!to || to.length === 0) {
      return res.status(400).json({ error: '수신자가 필요합니다.' });
    }

    // 주문 정보 검증
    if (!orderData || !orderData.orderNumber) {
      return res.status(400).json({ error: '주문 정보가 필요합니다.' });
    }

    // 첨부파일 처리: selectedAttachmentIds에서 Excel 파일 찾기
    let excelFilePath = '';
    let additionalAttachments: any[] = [];
    
    if (selectedAttachmentIds && selectedAttachmentIds.length > 0) {
      console.log('📎 선택된 첨부파일 처리:', selectedAttachmentIds);
      
      for (const attachmentId of selectedAttachmentIds) {
        try {
          const [attachment] = await database.db
            .select({
              id: attachmentsTable.id,
              originalName: attachmentsTable.originalName,
              filePath: attachmentsTable.filePath,
              mimeType: attachmentsTable.mimeType,
              fileData: attachmentsTable.fileData
            })
            .from(attachmentsTable)
            .where(eq(attachmentsTable.id, attachmentId));
            
          if (attachment) {
            const isExcelFile = attachment.mimeType?.includes('excel') || 
                              attachment.mimeType?.includes('spreadsheet') ||
                              attachment.originalName?.toLowerCase().endsWith('.xlsx') ||
                              attachment.originalName?.toLowerCase().endsWith('.xls');
                              
            if (isExcelFile && !excelFilePath) {
              // 첫 번째 Excel 파일을 주 첨부파일로 사용
              if (attachment.fileData) {
                // Base64 데이터를 임시 파일로 저장
                const tempDir = path.join(__dirname, '../../uploads');
                const tempFilePath = path.join(tempDir, `temp-${Date.now()}-${attachment.originalName}`);
                
                if (!fs.existsSync(tempDir)) {
                  fs.mkdirSync(tempDir, { recursive: true });
                }
                
                fs.writeFileSync(tempFilePath, Buffer.from(attachment.fileData, 'base64'));
                excelFilePath = tempFilePath;
                console.log('✅ Excel 파일 임시 저장 (Base64):', tempFilePath);
              } else if (attachment.filePath) {
                // 파일 경로가 있으면 존재 여부 확인
                if (fs.existsSync(attachment.filePath)) {
                  excelFilePath = attachment.filePath;
                  console.log('✅ Excel 파일 경로 사용:', attachment.filePath);
                } else {
                  console.warn('⚠️ Excel 파일 경로가 존재하지 않음:', attachment.filePath);
                  console.log('🔄 해당 첨부파일은 건너뛰고 기본 Excel 파일을 생성합니다');
                }
              } else {
                console.warn('⚠️ Excel 첨부파일에 Base64 데이터와 파일 경로가 모두 없음:', attachment.originalName);
              }
            } else {
              // Excel이 아닌 파일들은 추가 첨부파일로 처리
              if (attachment.fileData) {
                additionalAttachments.push({
                  filename: attachment.originalName,
                  content: Buffer.from(attachment.fileData, 'base64'),
                  contentType: attachment.mimeType || 'application/octet-stream'
                });
                console.log('✅ 추가 첨부파일 추가 (Base64):', attachment.originalName);
              } else if (attachment.filePath && fs.existsSync(attachment.filePath)) {
                additionalAttachments.push({
                  filename: attachment.originalName,
                  path: attachment.filePath,
                  contentType: attachment.mimeType || 'application/octet-stream'
                });
                console.log('✅ 추가 첨부파일 추가 (파일 경로):', attachment.originalName);
              }
            }
          }
        } catch (error) {
          console.error('❌ 첨부파일 처리 오류, ID:', attachmentId, error);
          console.log('🔄 첨부파일 처리 실패 - 해당 파일을 건너뛰고 계속 진행합니다');
          // 첨부파일 처리 실패해도 이메일 발송은 계속 진행
        }
      }
    }

    // Excel 파일이 없으면 기본 빈 Excel 파일 생성
    if (!excelFilePath) {
      console.log('📎 Excel 파일이 없어 기본 파일 생성');
      try {
        const tempDir = path.join(__dirname, '../../uploads');
        const tempFilePath = path.join(tempDir, `default-po-${Date.now()}.xlsx`);
        
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // 기본 Excel 파일 생성
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet([{
          '발주번호': orderData.orderNumber || 'N/A',
          '거래처': orderData.vendorName || 'N/A',
          '발주금액': orderData.totalAmount || 0,
          '발주일자': orderData.orderDate || new Date().toISOString().split('T')[0]
        }]);
        XLSX.utils.book_append_sheet(workbook, worksheet, '발주서');
        XLSX.writeFile(workbook, tempFilePath);
        
        excelFilePath = tempFilePath;
        console.log('✅ 기본 Excel 파일 생성 성공:', tempFilePath);
      } catch (error) {
        console.error('❌ 기본 Excel 파일 생성 실패:', error);
        // Excel 파일 생성 실패해도 이메일 발송은 시도 (PDF만이라도)
        console.log('🔄 Excel 파일 없이 이메일 발송을 시도합니다');
      }
    }

    // POEmailService를 사용하여 이메일 발송 (이메일 히스토리 자동 기록 포함)
    console.log('📧 POEmailService를 사용하여 이메일 발송 시작');
    
    // 이메일 옵션 구성
    const emailOptions = {
      to: to,
      cc: cc,
      subject: subject || `발주서 - ${orderData.orderNumber}`,
      orderNumber: orderData.orderNumber,
      vendorName: orderData.vendorName,
      orderDate: orderData.orderDate,
      totalAmount: orderData.totalAmount,
      additionalMessage: message, // 사용자 메시지를 올바르게 전달
      additionalAttachments: additionalAttachments // 추가 첨부파일
    };
    
    console.log('📧 이메일 옵션:', {
      to: emailOptions.to,
      cc: emailOptions.cc,
      subject: emailOptions.subject,
      hasMessage: !!emailOptions.additionalMessage,
      additionalAttachmentsCount: additionalAttachments.length,
      excelFile: excelFilePath ? '있음' : '없음'
    });
    
    // 주문 정보 (이메일 히스토리용)
    console.log('📧 주문 정보 구성 전 orderData:', {
      orderData,
      orderDataKeys: Object.keys(orderData || {}),
      hasOrderId: !!(orderData.orderId),
      hasId: !!(orderData.id),
      userInfo: {
        hasUser: !!(req as any).user,
        userId: (req as any).user?.id,
        userEmail: (req as any).user?.email
      }
    });
    
    const orderInfo = {
      orderId: orderData.orderId || orderData.id,
      orderNumber: orderData.orderNumber,
      senderUserId: (req as any).user?.id || (req as any).user?.email
    };
    
    console.log('📧 구성된 orderInfo:', orderInfo);
    
    try {
      // POEmailService.sendPOWithOriginalFormat 사용 (자동으로 이메일 히스토리 기록)
      const result = await emailService.sendPOWithOriginalFormat(
        excelFilePath,
        emailOptions,
        orderInfo
      );
      
      // 임시 파일 정리 (Base64에서 생성한 파일들)
      if (excelFilePath.includes('temp-')) {
        try {
          fs.unlinkSync(excelFilePath);
          console.log('🗑️ 임시 Excel 파일 삭제:', excelFilePath);
        } catch (cleanupError) {
          console.warn('⚠️ 임시 파일 삭제 실패:', cleanupError);
        }
      }
      
      if (result.success) {
        console.log('✅ POEmailService 이메일 발송 성공:', result.messageId);
        
        // 발주서 상태 업데이트
        if (orderData.orderNumber) {
          try {
            console.log(`🔄 발주서 상태 업데이트 시도: ${orderData.orderNumber} → sent`);
            await updateOrderStatusAfterEmail(orderData.orderNumber);
            console.log(`✅ 발주서 상태 업데이트 완료: ${orderData.orderNumber} → sent`);
          } catch (updateError) {
            console.error(`❌ 발주서 상태 업데이트 실패: ${orderData.orderNumber}`, updateError);
            // 상태 업데이트 실패는 이메일 발송 성공에 영향을 주지 않음
          }
        }
        
        res.json({
          success: true,
          messageId: result.messageId,
          message: '이메일이 성공적으로 발송되었습니다. 이메일 히스토리가 자동으로 기록되었습니다.'
        });
      } else {
        console.error('❌ POEmailService 이메일 발송 실패:', result.error);
        res.status(500).json({
          error: '이메일 발송 실패',
          details: result.error
        });
      }
    } catch (error) {
      console.error('❌ POEmailService 호출 오류:', error);
      
      // 임시 파일 정리 (오류 발생 시에도)
      if (excelFilePath.includes('temp-')) {
        try {
          fs.unlinkSync(excelFilePath);
          console.log('🗑️ 임시 Excel 파일 삭제 (오류 시):', excelFilePath);
        } catch (cleanupError) {
          console.warn('⚠️ 임시 파일 삭제 실패 (오류 시):', cleanupError);
        }
      }
      
      res.status(500).json({
        error: '이메일 발송 중 오류 발생',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

  } catch (error) {
    console.error('이메일 발송 오류:', error);
    res.status(500).json({ 
      error: '이메일 발송 실패',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 이메일 히스토리 조회
router.get("/orders/:orderId/email-history", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    
    console.log('📧 이메일 히스토리 조회:', { orderId });
    
    const emailHistoryData = await db
      .select({
        id: emailSendHistory.id,
        orderNumber: emailSendHistory.orderNumber,
        recipients: emailSendHistory.recipients,
        cc: emailSendHistory.cc,
        bcc: emailSendHistory.bcc,
        subject: emailSendHistory.subject,
        messageContent: emailSendHistory.messageContent,
        attachmentFiles: emailSendHistory.attachmentFiles,
        status: emailSendHistory.status,
        sentCount: emailSendHistory.sentCount,
        failedCount: emailSendHistory.failedCount,
        errorMessage: emailSendHistory.errorMessage,
        sentAt: emailSendHistory.sentAt,
        createdAt: emailSendHistory.createdAt,
        senderUserId: emailSendHistory.senderUserId
      })
      .from(emailSendHistory)
      .where(eq(emailSendHistory.orderId, orderId))
      .orderBy(desc(emailSendHistory.createdAt));
    
    console.log('📧 이메일 히스토리 결과:', { count: emailHistoryData.length });
    
    res.json(emailHistoryData);
  } catch (error) {
    console.error('이메일 히스토리 조회 오류:', error);
    res.status(500).json({ 
      error: '이메일 히스토리 조회 실패',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;