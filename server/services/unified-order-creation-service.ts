/**
 * 통합 발주서 생성 서비스
 * 
 * 직접 입력과 엑셀 업로드 방식의 발주서 생성을 통합 처리
 * 
 * 주요 차이점:
 * - 직접 입력: 폼 데이터 → DB 저장 → PDF 생성 → 상태 업데이트
 * - 엑셀 업로드: 엑셀 파싱 → DB 저장 → PDF 생성 → 상태 업데이트
 */

import { db } from '../db';
import { purchaseOrders, purchaseOrderItems, vendors, projects, attachments as attachmentsTable } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { ProfessionalPDFGenerationService } from './professional-pdf-generation-service';
import { progressManager } from '../utils/progress-manager';
import { DebugLogger } from '../utils/debug-logger';
import fs from 'fs';
import path from 'path';

// ================== 타입 정의 ==================

export type OrderInputMethod = 'manual' | 'excel';

export interface OrderCreationData {
  method: OrderInputMethod;
  // 공통 필드
  projectId: number;
  vendorId: number;
  orderDate: string;
  deliveryDate?: string;
  notes?: string;
  userId: string;
  
  // 직접 입력용 필드
  items?: OrderItem[];
  attachedFiles?: Express.Multer.File[];
  customFields?: Record<string, any>;
  
  // 엑셀 업로드용 필드
  excelFilePath?: string;
  parsedItems?: ParsedOrderItem[];
}

export interface OrderItem {
  itemId?: number;
  itemName: string;
  specification?: string;
  unit?: string; // 단위 필드 추가
  majorCategory?: string;
  middleCategory?: string;
  minorCategory?: string;
  quantity: number;
  unitPrice: number;
  totalAmount?: number;
  notes?: string;
}

export interface ParsedOrderItem extends OrderItem {
  rowNumber?: number; // 엑셀 행 번호
  originalData?: Record<string, any>; // 원본 엑셀 데이터
}

export interface OrderCreationResult {
  success: boolean;
  orderId?: number;
  orderNumber?: string;
  pdfGenerated?: boolean;
  attachmentId?: number;
  error?: string;
  warnings?: string[];
}

export interface ProgressStep {
  step: string;
  message: string;
  progress: number;
  completed: boolean;
  error?: string;
}

// ================== 서비스 클래스 ==================

export class UnifiedOrderCreationService {
  
  /**
   * 통합 발주서 생성 메인 메서드
   */
  async createOrder(data: OrderCreationData, sessionId?: string): Promise<OrderCreationResult> {
    const logger = new DebugLogger('UnifiedOrderCreation');
    logger.log(`🚀 발주서 생성 시작 - 방식: ${data.method}, 세션: ${sessionId}`);
    
    try {
      // 1단계: 입력 데이터 검증
      await this.notifyProgress(sessionId, 'validation', '입력 데이터 검증 중...', 10);
      await this.validateInputData(data);
      
      // 2단계: 아이템 데이터 준비 (입력 방식에 따라 다름)
      await this.notifyProgress(sessionId, 'preparation', '데이터 준비 중...', 20);
      const preparedItems = await this.prepareItemsData(data);
      
      // 3단계: DB에 발주서 저장
      await this.notifyProgress(sessionId, 'saving', 'DB에 저장 중...', 40);
      const orderId = await this.saveOrderToDB(data, preparedItems);
      
      // 4단계: 첨부파일 처리 (있는 경우에만)
      await this.notifyProgress(sessionId, 'attachments', '첨부파일 처리 중...', 60);
      await this.processAttachments(orderId, data);
      
      // 5단계: PDF 생성
      await this.notifyProgress(sessionId, 'pdf', 'PDF 생성 중...', 75);
      const pdfResult = await this.generatePDF(orderId, data.userId);
      
      // 6단계: 상태 업데이트
      await this.notifyProgress(sessionId, 'status', '상태 업데이트 중...', 90);
      await this.updateOrderStatus(orderId, 'created');
      
      // 7단계: 완료
      await this.notifyProgress(sessionId, 'complete', '발주서 생성 완료!', 100);
      
      const orderNumber = await this.getOrderNumber(orderId);
      
      logger.log(`✅ 발주서 생성 완료 - ID: ${orderId}, 번호: ${orderNumber}`);
      
      return {
        success: true,
        orderId,
        orderNumber,
        pdfGenerated: pdfResult.success,
        attachmentId: pdfResult.attachmentId,
      };
      
    } catch (error) {
      logger.error(`❌ 발주서 생성 실패: ${error.message}`);
      await this.notifyProgress(sessionId, 'error', `오류 발생: ${error.message}`, 0);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * 입력 데이터 검증
   */
  private async validateInputData(data: OrderCreationData): Promise<void> {
    if (!data.projectId || !data.vendorId) {
      throw new Error('현장과 거래처는 필수 입력 항목입니다.');
    }
    
    if (!data.orderDate) {
      throw new Error('발주일자는 필수 입력 항목입니다.');
    }
    
    if (data.method === 'manual') {
      if (!data.items || data.items.length === 0) {
        throw new Error('최소 하나의 품목을 추가해야 합니다.');
      }
    } else if (data.method === 'excel') {
      if (!data.excelFilePath && (!data.parsedItems || data.parsedItems.length === 0)) {
        throw new Error('엑셀 파일 경로 또는 파싱된 아이템 데이터가 필요합니다.');
      }
    }
  }
  
  /**
   * 아이템 데이터 준비 (입력 방식에 따라 다름)
   */
  private async prepareItemsData(data: OrderCreationData): Promise<OrderItem[]> {
    if (data.method === 'manual') {
      // 직접 입력: 폼에서 받은 아이템 데이터 사용
      return data.items!.map(item => ({
        ...item,
        totalAmount: (item.quantity || 0) * (item.unitPrice || 0)
      }));
    } else {
      // 엑셀 업로드: 파싱된 아이템 데이터 사용 (이미 파싱되어 있다고 가정)
      if (data.parsedItems) {
        return data.parsedItems.map(item => ({
          ...item,
          totalAmount: (item.quantity || 0) * (item.unitPrice || 0)
        }));
      } else {
        // 엑셀 파싱이 필요한 경우 (향후 확장용)
        throw new Error('엑셀 파싱 로직이 구현되지 않았습니다. parsedItems를 제공해주세요.');
      }
    }
  }
  
  /**
   * DB에 발주서 저장
   */
  private async saveOrderToDB(data: OrderCreationData, items: OrderItem[]): Promise<number> {
    const logger = new DebugLogger('UnifiedOrderCreation');
    
    // 발주서 번호 생성
    const orderNumber = await this.generateOrderNumber();
    
    // 총 금액 계산
    const totalAmount = items.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    
    logger.log(`💾 DB 저장 시작 - 발주번호: ${orderNumber}, 품목수: ${items.length}, 총액: ${totalAmount}`);
    
    // 발주서 저장
    const [savedOrder] = await db.insert(purchaseOrders).values({
      orderNumber,
      projectId: data.projectId,
      vendorId: data.vendorId,
      userId: data.userId,
      orderDate: new Date(data.orderDate),
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
      totalAmount: String(totalAmount), // Convert to string for decimal type
      notes: data.notes || null,
      orderStatus: 'draft', // 초기 상태
      approvalStatus: 'not_required', // 승인 불필요로 시작
      // customFields 필드는 아직 DB에 추가되지 않음
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning({ id: purchaseOrders.id });
    
    const orderId = savedOrder.id;
    
    // 품목 저장
    if (items.length > 0) {
      const orderItemsToInsert = items.map(item => ({
        orderId,
        itemId: item.itemId || null,
        itemName: item.itemName,
        specification: item.specification || null,
        unit: item.unit || null, // 단위 필드 추가
        majorCategory: item.majorCategory || null,
        middleCategory: item.middleCategory || null,
        minorCategory: item.minorCategory || null,
        quantity: item.quantity,
        unitPrice: String(item.unitPrice), // Convert to string for decimal type
        totalAmount: String(item.totalAmount || 0), // Convert to string for decimal type
        notes: item.notes || null,
      }));
      
      await db.insert(purchaseOrderItems).values(orderItemsToInsert);
    }
    
    logger.log(`✅ DB 저장 완료 - 발주서 ID: ${orderId}`);
    
    return orderId;
  }
  
  /**
   * 첨부파일 처리 (엑셀 파일 또는 기타 첨부파일)
   */
  private async processAttachments(orderId: number, data: OrderCreationData): Promise<void> {
    const logger = new DebugLogger('UnifiedOrderCreation');
    
    // 직접 입력: 폼에서 업로드된 파일들 처리
    if (data.method === 'manual' && data.attachedFiles && data.attachedFiles.length > 0) {
      logger.log(`📎 직접 입력 첨부파일 처리 - ${data.attachedFiles.length}개`);
      
      for (const file of data.attachedFiles) {
        await db.insert(attachmentsTable).values({
          orderId,
          originalName: file.originalname,
          storedName: file.filename || file.originalname, // 서버에 저장된 파일명
          filePath: file.path,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedBy: data.userId,
          uploadedAt: new Date(),
        });
      }
    }
    
    // 엑셀 업로드: 원본 엑셀 파일 첨부 (있는 경우)
    if (data.method === 'excel' && data.excelFilePath) {
      logger.log(`📊 엑셀 원본 파일 첨부 - ${data.excelFilePath}`);
      
      if (fs.existsSync(data.excelFilePath)) {
        const stat = fs.statSync(data.excelFilePath);
        const fileName = path.basename(data.excelFilePath);
        
        await db.insert(attachmentsTable).values({
          orderId,
          originalName: fileName,
          storedName: fileName, // 엑셀 파일의 경우 원본명과 동일
          filePath: data.excelFilePath,
          fileSize: stat.size,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          uploadedBy: data.userId,
          uploadedAt: new Date(),
        });
      }
    }
  }
  
  /**
   * PDF 생성
   */
  private async generatePDF(orderId: number, userId: string): Promise<{success: boolean, attachmentId?: number}> {
    const logger = new DebugLogger('UnifiedOrderCreation');
    
    try {
      logger.log(`📄 PDF 생성 시작 - 발주서 ID: ${orderId}`);
      
      const result = await ProfessionalPDFGenerationService.generateProfessionalPurchaseOrderPDF(
        orderId, 
        userId
      );
      
      if (result.success) {
        logger.log(`✅ PDF 생성 완료 - 첨부파일 ID: ${result.attachmentId}`);
        return { success: true, attachmentId: result.attachmentId };
      } else {
        logger.error(`❌ PDF 생성 실패: ${result.error}`);
        return { success: false };
      }
    } catch (error) {
      logger.error(`❌ PDF 생성 중 예외 발생: ${error.message}`);
      return { success: false };
    }
  }
  
  /**
   * 발주서 상태 업데이트
   */
  private async updateOrderStatus(orderId: number, status: string): Promise<void> {
    const logger = new DebugLogger('UnifiedOrderCreation');
    logger.log(`📊 상태 업데이트 - 발주서 ID: ${orderId}, 상태: ${status}`);
    
    await db.update(purchaseOrders)
      .set({
        orderStatus: status,
        updatedAt: new Date()
      })
      .where(eq(purchaseOrders.id, orderId));
  }
  
  /**
   * 진행상황 알림 (SSE 사용)
   */
  private async notifyProgress(sessionId: string | undefined, step: string, message: string, progress: number): Promise<void> {
    if (!sessionId) return;
    
    const progressData: ProgressStep = {
      step,
      message,
      progress,
      completed: progress >= 100,
    };
    
    progressManager.updateProgress(sessionId, progressData);
  }
  
  /**
   * 발주서 번호 생성
   */
  private async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    // 오늘 날짜의 발주서 개수 조회
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(purchaseOrders)
      .where(sql`DATE(${purchaseOrders.createdAt}) = CURRENT_DATE`);
    
    const sequence = String(Number(count) + 1).padStart(3, '0');
    
    return `PO-${year}${month}${day}-${sequence}`;
  }
  
  /**
   * 발주서 번호 조회
   */
  private async getOrderNumber(orderId: number): Promise<string> {
    const [order] = await db
      .select({ orderNumber: purchaseOrders.orderNumber })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, orderId))
      .limit(1);
    
    return order?.orderNumber || `ORDER-${orderId}`;
  }
}