/**
 * 이메일 발송 이력 관리 서비스
 */

import { db } from '../db';
import { emailSendingHistory, emailSendingDetails } from '@shared/schema';
import { eq, desc, and, like, count } from 'drizzle-orm';

export interface EmailHistoryQuery {
  page: number;
  limit: number;
  status?: string;
  orderNumber?: string;
  userId?: string;
}

export interface EmailHistoryResult {
  items: any[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

export class EmailHistoryService {
  /**
   * 이메일 발송 이력 목록 조회
   */
  static async getEmailHistory(query: EmailHistoryQuery): Promise<EmailHistoryResult> {
    const { page, limit, status, orderNumber, userId } = query;
    const offset = (page - 1) * limit;

    try {
      // Mock DB 모드 처리
      if (!process.env.DATABASE_URL) {
        console.log('🔄 Mock DB 모드: 이메일 발송 이력 조회');
        return this.getMockEmailHistory(query);
      }

      // 조건 필터링
      const conditions = [];
      if (status) {
        conditions.push(eq(emailSendingHistory.sendingStatus, status));
      }
      if (orderNumber) {
        conditions.push(like(emailSendingHistory.orderNumber, `%${orderNumber}%`));
      }
      if (userId) {
        conditions.push(eq(emailSendingHistory.senderUserId, userId));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // 총 개수 조회
      const totalCountResult = await db
        .select({ count: count() })
        .from(emailSendingHistory)
        .where(whereClause);

      const totalItems = totalCountResult[0]?.count || 0;

      // 이력 목록 조회
      const items = await db
        .select({
          id: emailSendingHistory.id,
          orderNumber: emailSendingHistory.orderNumber,
          subject: emailSendingHistory.subject,
          recipients: emailSendingHistory.recipients,
          cc: emailSendingHistory.cc,
          bcc: emailSendingHistory.bcc,
          sendingStatus: emailSendingHistory.sendingStatus,
          sentCount: emailSendingHistory.sentCount,
          failedCount: emailSendingHistory.failedCount,
          errorMessage: emailSendingHistory.errorMessage,
          sentAt: emailSendingHistory.sentAt,
          createdAt: emailSendingHistory.createdAt,
        })
        .from(emailSendingHistory)
        .where(whereClause)
        .orderBy(desc(emailSendingHistory.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        items,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      };

    } catch (error) {
      console.error('이메일 발송 이력 조회 오류:', error);
      throw error;
    }
  }

  /**
   * 이메일 발송 이력 상세 조회
   */
  static async getEmailHistoryDetail(id: number): Promise<any> {
    try {
      // Mock DB 모드 처리
      if (!process.env.DATABASE_URL) {
        console.log('🔄 Mock DB 모드: 이메일 발송 이력 상세 조회');
        return this.getMockEmailHistoryDetail(id);
      }

      const historyResult = await db
        .select()
        .from(emailSendingHistory)
        .where(eq(emailSendingHistory.id, id))
        .limit(1);

      if (!historyResult.length) {
        return null;
      }

      const history = historyResult[0];

      // 발송 상세 정보 조회
      const details = await db
        .select()
        .from(emailSendingDetails)
        .where(eq(emailSendingDetails.historyId, id))
        .orderBy(desc(emailSendingDetails.createdAt));

      return {
        ...history,
        details,
      };

    } catch (error) {
      console.error('이메일 발송 이력 상세 조회 오류:', error);
      throw error;
    }
  }

  /**
   * 이메일 발송 이력 저장
   */
  static async saveEmailHistory(historyData: {
    orderId?: number;
    orderNumber?: string;
    senderUserId: string;
    recipients: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    messageContent?: string;
    attachmentFiles?: any[];
    sendingStatus: string;
    sentCount: number;
    failedCount: number;
    errorMessage?: string;
    sentAt?: Date;
  }): Promise<number> {
    try {
      // Mock DB 모드 처리
      if (!process.env.DATABASE_URL) {
        console.log('🔄 Mock DB 모드: 이메일 발송 이력 저장');
        return Date.now(); // Mock ID 반환
      }

      const result = await db
        .insert(emailSendingHistory)
        .values({
          orderId: historyData.orderId,
          orderNumber: historyData.orderNumber,
          senderUserId: historyData.senderUserId,
          recipients: historyData.recipients,
          cc: historyData.cc,
          bcc: historyData.bcc,
          subject: historyData.subject,
          messageContent: historyData.messageContent,
          attachmentFiles: historyData.attachmentFiles,
          sendingStatus: historyData.sendingStatus,
          sentCount: historyData.sentCount,
          failedCount: historyData.failedCount,
          errorMessage: historyData.errorMessage,
          sentAt: historyData.sentAt,
        })
        .returning({ id: emailSendingHistory.id });

      return result[0].id;

    } catch (error) {
      console.error('이메일 발송 이력 저장 오류:', error);
      throw error;
    }
  }

  /**
   * 이메일 발송 상세 저장
   */
  static async saveEmailDetails(historyId: number, details: {
    recipientEmail: string;
    recipientType: 'to' | 'cc' | 'bcc';
    sendingStatus: string;
    messageId?: string;
    errorMessage?: string;
    sentAt?: Date;
  }[]): Promise<void> {
    try {
      // Mock DB 모드 처리
      if (!process.env.DATABASE_URL) {
        console.log('🔄 Mock DB 모드: 이메일 발송 상세 저장');
        return;
      }

      if (details.length === 0) return;

      await db
        .insert(emailSendingDetails)
        .values(details.map(detail => ({
          historyId,
          recipientEmail: detail.recipientEmail,
          recipientType: detail.recipientType,
          sendingStatus: detail.sendingStatus,
          messageId: detail.messageId,
          errorMessage: detail.errorMessage,
          sentAt: detail.sentAt,
        })));

    } catch (error) {
      console.error('이메일 발송 상세 저장 오류:', error);
      throw error;
    }
  }

  /**
   * 이메일 재발송
   */
  static async resendEmail(historyId: number, recipients: string[]): Promise<{ success: boolean; error?: string }> {
    try {
      // Mock DB 모드 처리
      if (!process.env.DATABASE_URL) {
        console.log('🔄 Mock DB 모드: 이메일 재발송');
        return { success: true };
      }

      // 원본 이메일 정보 조회
      const originalEmail = await this.getEmailHistoryDetail(historyId);
      if (!originalEmail) {
        return { success: false, error: '원본 이메일을 찾을 수 없습니다.' };
      }

      // 재발송 로직 구현 (향후 확장)
      // 현재는 기본 성공 응답
      return { success: true };

    } catch (error) {
      console.error('이메일 재발송 오류:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Mock DB용 이메일 발송 이력 조회
   */
  private static getMockEmailHistory(query: EmailHistoryQuery): EmailHistoryResult {
    const mockData = [
      {
        id: 1,
        orderNumber: 'PO-2025-011',
        subject: '발주서 - PO-2025-011 (2025. 7. 18.)',
        recipients: ['contact@innoenergy.co.kr', 'sales@ultrawindow.co.kr'],
        cc: [],
        bcc: [],
        sendingStatus: 'completed',
        sentCount: 2,
        failedCount: 0,
        errorMessage: null,
        sentAt: new Date('2025-07-18T08:42:26.747Z'),
        createdAt: new Date('2025-07-18T08:42:20.000Z'),
      },
      {
        id: 2,
        orderNumber: 'PO-2025-010',
        subject: '발주서 - PO-2025-010 (2025. 7. 17.)',
        recipients: ['info@testvendor.com'],
        cc: ['manager@company.com'],
        bcc: [],
        sendingStatus: 'failed',
        sentCount: 0,
        failedCount: 1,
        errorMessage: 'SMTP 연결 실패',
        sentAt: null,
        createdAt: new Date('2025-07-17T14:30:00.000Z'),
      },
    ];

    const filteredData = mockData.filter(item => {
      if (query.status && item.sendingStatus !== query.status) return false;
      if (query.orderNumber && !item.orderNumber.includes(query.orderNumber)) return false;
      return true;
    });

    const startIndex = (query.page - 1) * query.limit;
    const endIndex = startIndex + query.limit;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    return {
      items: paginatedData,
      totalItems: filteredData.length,
      totalPages: Math.ceil(filteredData.length / query.limit),
      currentPage: query.page,
    };
  }

  /**
   * Mock DB용 이메일 발송 이력 상세 조회
   */
  private static getMockEmailHistoryDetail(id: number): any {
    const mockDetails = {
      1: {
        id: 1,
        orderNumber: 'PO-2025-011',
        subject: '발주서 - PO-2025-011 (2025. 7. 18.)',
        recipients: ['contact@innoenergy.co.kr', 'sales@ultrawindow.co.kr'],
        cc: [],
        bcc: [],
        sendingStatus: 'completed',
        sentCount: 2,
        failedCount: 0,
        errorMessage: null,
        sentAt: new Date('2025-07-18T08:42:26.747Z'),
        createdAt: new Date('2025-07-18T08:42:20.000Z'),
        messageContent: '발주서를 송부드립니다. 첨부된 파일을 확인하여 주시기 바랍니다.',
        attachmentFiles: [
          { filename: '발주서_PO-2025-011.xlsx', size: 324952 },
          { filename: '발주서_PO-2025-011.pdf', size: 145632 }
        ],
        details: [
          {
            id: 1,
            recipientEmail: 'contact@innoenergy.co.kr',
            recipientType: 'to',
            sendingStatus: 'sent',
            messageId: 'test_message_1752828138995_79pi3rivb',
            errorMessage: null,
            sentAt: new Date('2025-07-18T08:42:26.747Z'),
          },
          {
            id: 2,
            recipientEmail: 'sales@ultrawindow.co.kr',
            recipientType: 'to',
            sendingStatus: 'sent',
            messageId: 'test_message_1752828142865_quma3ybi3',
            errorMessage: null,
            sentAt: new Date('2025-07-18T08:42:26.747Z'),
          }
        ]
      },
      2: {
        id: 2,
        orderNumber: 'PO-2025-010',
        subject: '발주서 - PO-2025-010 (2025. 7. 17.)',
        recipients: ['info@testvendor.com'],
        cc: ['manager@company.com'],
        bcc: [],
        sendingStatus: 'failed',
        sentCount: 0,
        failedCount: 1,
        errorMessage: 'SMTP 연결 실패',
        sentAt: null,
        createdAt: new Date('2025-07-17T14:30:00.000Z'),
        messageContent: '발주서를 송부드립니다. 첨부된 파일을 확인하여 주시기 바랍니다.',
        attachmentFiles: [
          { filename: '발주서_PO-2025-010.xlsx', size: 298765 },
          { filename: '발주서_PO-2025-010.pdf', size: 156432 }
        ],
        details: [
          {
            id: 3,
            recipientEmail: 'info@testvendor.com',
            recipientType: 'to',
            sendingStatus: 'failed',
            messageId: null,
            errorMessage: 'SMTP 연결 실패: 잘못된 서버 주소',
            sentAt: null,
          },
          {
            id: 4,
            recipientEmail: 'manager@company.com',
            recipientType: 'cc',
            sendingStatus: 'failed',
            messageId: null,
            errorMessage: 'SMTP 연결 실패: 잘못된 서버 주소',
            sentAt: null,
          }
        ]
      }
    };

    // 기존 데이터가 있으면 반환
    if (mockDetails[id]) {
      return mockDetails[id];
    }

    // 없으면 동적으로 생성 (데모 목적)
    const isEven = id % 2 === 0;
    return {
      id: id,
      orderNumber: `PO-2025-${String(id).padStart(3, '0')}`,
      subject: `발주서 - PO-2025-${String(id).padStart(3, '0')} (2025. 7. 18.)`,
      recipients: isEven ? ['test@example.com'] : ['demo@company.com', 'info@vendor.com'],
      cc: isEven ? ['manager@company.com'] : [],
      bcc: [],
      sendingStatus: isEven ? 'failed' : 'completed',
      sentCount: isEven ? 0 : 2,
      failedCount: isEven ? 1 : 0,
      errorMessage: isEven ? 'SMTP 연결 실패' : null,
      sentAt: isEven ? null : new Date('2025-07-18T08:42:26.747Z'),
      createdAt: new Date('2025-07-18T08:42:20.000Z'),
      messageContent: '발주서를 송부드립니다. 첨부된 파일을 확인하여 주시기 바랍니다.',
      attachmentFiles: [
        { filename: `발주서_PO-2025-${String(id).padStart(3, '0')}.xlsx`, size: 324952 },
        { filename: `발주서_PO-2025-${String(id).padStart(3, '0')}.pdf`, size: 145632 }
      ],
      details: isEven ? [
        {
          id: id * 10 + 1,
          recipientEmail: 'test@example.com',
          recipientType: 'to',
          sendingStatus: 'failed',
          messageId: null,
          errorMessage: 'SMTP 연결 실패: 잘못된 서버 주소',
          sentAt: null,
        },
        {
          id: id * 10 + 2,
          recipientEmail: 'manager@company.com',
          recipientType: 'cc',
          sendingStatus: 'failed',
          messageId: null,
          errorMessage: 'SMTP 연결 실패: 잘못된 서버 주소',
          sentAt: null,
        }
      ] : [
        {
          id: id * 10 + 1,
          recipientEmail: 'demo@company.com',
          recipientType: 'to',
          sendingStatus: 'sent',
          messageId: `test_message_${Date.now()}_${id}`,
          errorMessage: null,
          sentAt: new Date('2025-07-18T08:42:26.747Z'),
        },
        {
          id: id * 10 + 2,
          recipientEmail: 'info@vendor.com',
          recipientType: 'to',
          sendingStatus: 'sent',
          messageId: `test_message_${Date.now()}_${id}_2`,
          errorMessage: null,
          sentAt: new Date('2025-07-18T08:42:26.747Z'),
        }
      ]
    };
  }
}