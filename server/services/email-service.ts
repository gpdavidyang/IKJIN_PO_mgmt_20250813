import nodemailer from "nodemailer";
import path from "path";
import fs from "fs/promises";
import { db } from "../db";
import { emailSendHistory } from "@shared/schema";

/**
 * Naver 메일 발송 서비스
 * 익진엔지니어링 발주서 자동 발송 시스템
 */

// Naver 메일 전송 설정
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.naver.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// 이메일 템플릿
const emailTemplates = {
  purchaseOrder: {
    subject: (orderNumber: string, projectName: string) => 
      `[발주서] ${orderNumber} - ${projectName}`,
    
    html: (data: any) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; }
          .header { background-color: #f8f9fa; padding: 20px; border-bottom: 3px solid #0066cc; }
          .content { padding: 20px; }
          .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .info-table th { background-color: #e9ecef; padding: 10px; text-align: left; width: 150px; }
          .info-table td { padding: 10px; border-bottom: 1px solid #dee2e6; }
          .footer { background-color: #f8f9fa; padding: 20px; margin-top: 30px; font-size: 12px; color: #6c757d; }
          .warning { color: #dc3545; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>(주)익진엔지니어링 발주서</h2>
        </div>
        
        <div class="content">
          <p>안녕하세요, ${data.vendorName} 담당자님</p>
          
          <p>아래와 같이 발주서를 송부드리오니 확인 부탁드립니다.</p>
          
          <table class="info-table">
            <tr>
              <th>발주번호</th>
              <td>${data.orderNumber}</td>
            </tr>
            <tr>
              <th>프로젝트명</th>
              <td>${data.projectName}</td>
            </tr>
            <tr>
              <th>현장명</th>
              <td>${data.location}</td>
            </tr>
            <tr>
              <th>발주일자</th>
              <td>${data.orderDate}</td>
            </tr>
            <tr>
              <th>납품요청일</th>
              <td>${data.deliveryDate}</td>
            </tr>
            <tr>
              <th>발주금액</th>
              <td>${data.totalAmount}원</td>
            </tr>
            <tr>
              <th>담당자</th>
              <td>${data.userName} (${data.userPhone})</td>
            </tr>
          </table>
          
          <p>상세 내역은 첨부된 엑셀 파일을 확인해 주시기 바랍니다.</p>
          
          <p class="warning">※ 본 메일은 자동 발송된 메일입니다. 문의사항은 담당자에게 연락 부탁드립니다.</p>
        </div>
        
        <div class="footer">
          <p>
            (주)익진엔지니어링<br>
            서울특별시 강남구 테헤란로 123<br>
            대표전화: 02-1234-5678 | 팩스: 02-1234-5679<br>
            홈페이지: https://ikjin.co.kr
          </p>
        </div>
      </body>
      </html>
    `
  }
};

/**
 * 발주서 이메일 발송
 */
export async function sendPurchaseOrderEmail(params: {
  orderData: any;
  excelFilePath: string;
  recipients: string[];
  cc?: string[];
  userId?: string;
  orderId?: number;
}) {
  const { orderData, excelFilePath, recipients, cc = [], userId, orderId } = params;

  try {
    // 엑셀 파일 존재 확인
    await fs.access(excelFilePath);

    // 이메일 옵션 설정
    const mailOptions = {
      from: `"(주)익진엔지니어링" <${process.env.SMTP_USER}>`,
      to: recipients.join(", "),
      cc: cc.join(", "),
      subject: emailTemplates.purchaseOrder.subject(
        orderData.orderNumber,
        orderData.projectName
      ),
      html: emailTemplates.purchaseOrder.html(orderData),
      attachments: [
        {
          filename: path.basename(excelFilePath),
          path: excelFilePath,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      ]
    };

    // 이메일 발송
    const info = await transporter.sendMail(mailOptions);
    
    console.log("✅ 이메일 발송 성공:", info.messageId);
    
    // 이메일 발송 이력 저장
    if (orderId && userId) {
      try {
        const trackingId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const fileStats = await fs.stat(excelFilePath);
        
        await db.insert(emailSendHistory).values({
          orderId,
          orderNumber: orderData.orderNumber,
          senderUserId: userId,
          recipients: recipients,
          cc: cc.length > 0 ? cc : null,
          bcc: null,
          subject: mailOptions.subject,
          messageContent: mailOptions.html,
          attachmentFiles: [{
            filename: path.basename(excelFilePath),
            path: excelFilePath,
            size: fileStats.size
          }],
          status: 'sent',
          sentCount: 1,
          failedCount: 0,
          sentAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } catch (historyError) {
        console.error("⚠️ 이메일 이력 저장 실패:", historyError);
        // 이력 저장 실패는 이메일 발송에 영향을 주지 않도록 함
      }
    }
    
    return {
      success: true,
      messageId: info.messageId,
      acceptedRecipients: info.accepted,
      rejectedRecipients: info.rejected
    };

  } catch (error) {
    console.error("❌ 이메일 발송 실패:", error);
    
    // 이메일 발송 실패 이력 저장
    if (orderId && userId) {
      try {
        const trackingId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        await db.insert(emailSendHistory).values({
          orderId,
          orderNumber: orderData.orderNumber,
          senderUserId: userId,
          recipients: recipients,
          cc: cc.length > 0 ? cc : null,
          bcc: null,
          subject: emailTemplates.purchaseOrder.subject(
            orderData.orderNumber,
            orderData.projectName
          ),
          messageContent: emailTemplates.purchaseOrder.html(orderData),
          attachmentFiles: null,
          status: 'failed',
          sentCount: 0,
          failedCount: 1,
          errorMessage: error.message,
          sentAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } catch (historyError) {
        console.error("⚠️ 이메일 실패 이력 저장 실패:", historyError);
      }
    }
    
    throw new Error(`이메일 발송 중 오류가 발생했습니다: ${error.message}`);
  }
}

/**
 * 대량 발주서 이메일 발송
 */
export async function sendBulkPurchaseOrderEmails(orders: any[]) {
  const results = [];
  
  for (const order of orders) {
    try {
      const result = await sendPurchaseOrderEmail(order);
      results.push({
        orderNumber: order.orderData.orderNumber,
        ...result
      });
      
      // 과도한 발송 방지를 위한 딜레이
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      results.push({
        orderNumber: order.orderData.orderNumber,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * 이메일 연결 테스트
 */
export async function testEmailConnection() {
  try {
    await transporter.verify();
    console.log("✅ Naver 메일 서버 연결 성공");
    return true;
  } catch (error) {
    console.error("❌ Naver 메일 서버 연결 실패:", error);
    return false;
  }
}

export const emailService = {
  sendPurchaseOrderEmail,
  sendBulkPurchaseOrderEmails,
  testEmailConnection
};