import { db } from '../db';
import { purchaseOrders, purchaseOrderItems, vendors, projects } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface EmailTemplateData {
  orderNumber: string;
  vendorName: string;
  projectName?: string;
  orderDate?: string;
  deliveryDate?: string;
  totalAmount: number;
  items?: Array<{
    itemName: string;
    specification?: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
  }>;
  additionalMessage?: string;
  attachmentsList?: string[];
}

/**
 * 주문 ID로부터 이메일 템플릿 데이터 생성
 */
export async function generateEmailTemplateData(orderId: number): Promise<EmailTemplateData | null> {
  try {
    // 1. 주문 정보 조회
    const [order] = await db
      .select({
        orderNumber: purchaseOrders.orderNumber,
        vendorId: purchaseOrders.vendorId,
        projectId: purchaseOrders.projectId,
        orderDate: purchaseOrders.orderDate,
        deliveryDate: purchaseOrders.deliveryDate,
        totalAmount: purchaseOrders.totalAmount,
        notes: purchaseOrders.notes
      })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, orderId));
    
    if (!order) {
      console.error(`주문을 찾을 수 없음: ${orderId}`);
      return null;
    }

    // 2. 거래처 정보 조회
    let vendorName = '거래처 미지정';
    if (order.vendorId) {
      const [vendor] = await db
        .select({ name: vendors.name })
        .from(vendors)
        .where(eq(vendors.id, order.vendorId));
      
      if (vendor) {
        vendorName = vendor.name;
      }
    }

    // 3. 프로젝트 정보 조회
    let projectName = '프로젝트 미지정';
    if (order.projectId) {
      const [project] = await db
        .select({ name: projects.name })
        .from(projects)
        .where(eq(projects.id, order.projectId));
      
      if (project) {
        projectName = project.name;
      }
    }

    // 4. 주문 아이템 조회
    const items = await db
      .select({
        itemName: purchaseOrderItems.itemName,
        specification: purchaseOrderItems.specification,
        quantity: purchaseOrderItems.quantity,
        unitPrice: purchaseOrderItems.unitPrice,
        totalAmount: purchaseOrderItems.totalAmount
      })
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.orderId, orderId));

    return {
      orderNumber: order.orderNumber,
      vendorName,
      projectName,
      orderDate: order.orderDate,
      deliveryDate: order.deliveryDate,
      totalAmount: order.totalAmount,
      items,
      additionalMessage: order.notes
    };
  } catch (error) {
    console.error('이메일 템플릿 데이터 생성 오류:', error);
    return null;
  }
}

/**
 * 이메일 HTML 템플릿 생성
 */
export function generateEmailHTML(data: EmailTemplateData): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '미정';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // 아이템 테이블 생성
  let itemsTable = '';
  if (data.items && data.items.length > 0) {
    const itemRows = data.items.map((item, index) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.itemName}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.specification || '-'}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.quantity.toLocaleString()}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(item.unitPrice)}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(item.totalAmount)}</td>
      </tr>
    `).join('');

    itemsTable = `
      <h3 style="color: #333; margin-top: 30px;">📋 발주 품목 내역</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">번호</th>
            <th style="padding: 10px; border: 1px solid #ddd;">품목명</th>
            <th style="padding: 10px; border: 1px solid #ddd;">규격</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">수량</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">단가</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">금액</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
        <tfoot>
          <tr style="background-color: #f8f9fa; font-weight: bold;">
            <td colspan="5" style="padding: 10px; border: 1px solid #ddd; text-align: right;">총 합계:</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: #007bff;">
              ${formatCurrency(data.totalAmount)}
            </td>
          </tr>
        </tfoot>
      </table>
    `;
  }

  // 첨부파일 목록
  let attachmentSection = '';
  if (data.attachmentsList && data.attachmentsList.length > 0) {
    const attachmentItems = data.attachmentsList.map(file => 
      `<li style="margin: 5px 0;">${file}</li>`
    ).join('');
    
    attachmentSection = `
      <div style="margin-top: 30px; padding: 15px; background-color: #e8f4fd; border-radius: 5px;">
        <h4 style="color: #333; margin: 0 0 10px 0;">📎 첨부파일</h4>
        <ul style="margin: 0; padding-left: 20px;">
          ${attachmentItems}
        </ul>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Malgun Gothic', 'Noto Sans KR', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
        </style>
      </head>
      <body>
        <div style="background-color: #007bff; color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">📦 구매 발주서</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px;">Purchase Order</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            안녕하세요, <strong>${data.vendorName}</strong>님
          </p>
          
          <p style="margin-bottom: 20px;">
            아래와 같이 발주서를 송부드리오니 확인 부탁드립니다.
          </p>
          
          <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">📝 발주 정보</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; width: 30%; font-weight: bold;">발주번호:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${data.orderNumber}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">프로젝트:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${data.projectName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">발주일자:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${formatDate(data.orderDate)}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">납기일자:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${formatDate(data.deliveryDate)}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold;">총 금액:</td>
                <td style="padding: 10px; font-size: 18px; color: #007bff; font-weight: bold;">
                  ${formatCurrency(data.totalAmount)}
                </td>
              </tr>
            </table>
          </div>
          
          ${itemsTable}
          
          ${data.additionalMessage ? `
            <div style="margin-top: 30px; padding: 15px; background-color: #fff3cd; border-radius: 5px;">
              <h4 style="color: #333; margin: 0 0 10px 0;">💬 추가 메시지</h4>
              <p style="margin: 0; white-space: pre-wrap;">${data.additionalMessage}</p>
            </div>
          ` : ''}
          
          ${attachmentSection}
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666;">
            <p style="margin: 5px 0;">
              본 메일은 발주 관리 시스템에서 자동으로 발송되었습니다.
            </p>
            <p style="margin: 5px 0;">
              문의사항이 있으시면 담당자에게 연락 부탁드립니다.
            </p>
            <p style="margin: 15px 0 0 0; font-size: 12px;">
              © 2025 IKJIN Construction. All rights reserved.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}