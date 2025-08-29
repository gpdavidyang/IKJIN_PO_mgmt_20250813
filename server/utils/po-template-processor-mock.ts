import XLSX from 'xlsx';
import { removeAllInputSheets } from './excel-input-sheet-remover';
import { db } from "../db";
import { vendors, projects, purchaseOrders, purchaseOrderItems } from "@shared/schema";
import { eq } from "drizzle-orm";
import { DebugLogger } from './debug-logger';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import { PDFGenerationService } from '../services/pdf-generation-service';

export interface POTemplateItem {
  itemName: string;
  specification: string;
  quantity: number;
  unitPrice: number;
  supplyAmount: number;
  taxAmount: number;
  totalAmount: number;
  categoryLv1: string;
  categoryLv2: string;
  categoryLv3: string;
  // 클라이언트 호환성을 위한 필드
  majorCategory?: string;
  middleCategory?: string;
  minorCategory?: string;
  vendorName: string;
  deliveryName: string;
  notes: string;
}

export interface POTemplateOrder {
  orderNumber: string;
  orderDate: string;
  siteName: string;
  dueDate: string;
  vendorName: string;
  totalAmount: number;
  items: POTemplateItem[];
}

export interface POTemplateParseResult {
  success: boolean;
  totalOrders: number;
  totalItems: number;
  orders: POTemplateOrder[];
  error?: string;
}

export class POTemplateProcessorMock {
  /**
   * Excel 파일에서 Input 시트를 파싱하여 발주서 데이터 추출
   */
  static parseInputSheet(filePath: string): POTemplateParseResult {
    try {
      const workbook = XLSX.readFile(filePath);
      
      if (!workbook.SheetNames.includes('Input')) {
        return {
          success: false,
          totalOrders: 0,
          totalItems: 0,
          orders: [],
          error: 'Input 시트를 찾을 수 없습니다.'
        };
      }

      const worksheet = workbook.Sheets['Input'];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // 헤더 행 제거
      const rows = data.slice(1) as any[][];
      
      // 발주서별로 그룹화 (발주번호로만 구분)
      const ordersByNumber = new Map<string, POTemplateOrder>();
      
      for (const row of rows) {
        // 빈 행이거나 필수 데이터가 없는 경우 건너뛰기
        if (!row || row.length === 0 || (!row[0] && !row[2] && !row[10])) continue;
        
        // 컬럼 수가 부족한 경우 빈 값으로 채우기 (Q열까지 포함하여 17개)
        while (row.length < 17) {
          row.push('');
        }
        
        // 디버깅: 원본 row 데이터 확인
        console.log('🔍 [파싱] 원본 row 데이터:', {
          row길이: row.length,
          모든값: row,
          H열_인덱스7: row[7],
          I열_인덱스8: row[8],
          J열_인덱스9: row[9],
          N열_인덱스13: row[13],
          O열_인덱스14: row[14],
          P열_인덱스15: row[15]
        });
        
        // Input 시트의 실제 컬럼 매핑 (A:P)
        // 실제 Excel 파일 구조에 맞춘 컬럼 매핑
        const vendorName = String(row[0] || '').trim(); // A열: 거래처명
        const siteName = String(row[1] || '').trim(); // B열: 현장명
        const orderDate = this.formatDate(row[2]) || new Date().toISOString().split('T')[0]; // C열: 발주일
        const dueDate = this.formatDate(row[3]) || ''; // D열: 납기일
        const excelOrderNumber = String(row[4] || '').trim(); // E열: 발주번호
        const itemName = String(row[5] || '').trim(); // F열: 품목
        const specification = String(row[6] || '-').trim(); // G열: 규격
        const quantity = this.safeNumber(row[7]); // H열: 수량
        const unit = String(row[8] || '').trim(); // I열: 단위
        const unitPrice = this.safeNumber(row[9]); // J열: 단가
        const supplyAmount = this.safeNumber(row[10]); // K열: 공급가액
        const taxAmount = this.safeNumber(row[11]); // L열: 부가세
        const totalAmount = this.safeNumber(row[12]); // M열: 합계
        const categoryLv1 = String(row[13] || '').trim(); // N열: 대분류 (인덱스 13)
        const categoryLv2 = String(row[14] || '').trim(); // O열: 중분류 (인덱스 14)
        const categoryLv3 = String(row[15] || '').trim(); // P열: 소분류 (인덱스 15)
        const notes = String(row[16] || '').trim(); // Q열: 비고
        
        // 디버깅: 분류 값 확인
        console.log('🔍 [파싱] 분류 값 확인:', {
          row길이: row.length,
          categoryLv1: `"${categoryLv1}" (인덱스 13)`,
          categoryLv2: `"${categoryLv2}" (인덱스 14)`,
          categoryLv3: `"${categoryLv3}" (인덱스 15)`,
          row13값: row[13],
          row14값: row[14],
          row15값: row[15]
        });
        
        // 거래처 관련 정보 (Excel에는 없지만 기본값 설정)
        const vendorEmail = ''; // Excel에 없음
        const deliveryName = vendorName; // 거래처명을 납품처명으로 사용
        const deliveryEmail = ''; // Excel에 없음
        
        // 발주번호 생성 (Excel에서 가져온 것이 있으면 사용, 없으면 생성)
        const orderNumber = excelOrderNumber || this.generateOrderNumber(orderDate, vendorName);
        
        // Excel에서 읽어온 값들을 그대로 사용 (K, L, M열에서 이미 계산된 값)

        // 발주서 정보 생성 또는 업데이트
        if (!ordersByNumber.has(orderNumber)) {
          ordersByNumber.set(orderNumber, {
            orderNumber,
            orderDate,
            siteName,
            dueDate,
            vendorName, // 첫 번째 행의 거래처명 사용
            totalAmount: 0,
            items: []
          });
        }

        const order = ordersByNumber.get(orderNumber)!;
        
        // 아이템 추가
        if (itemName) {
          const item: POTemplateItem = {
            itemName,
            specification,
            quantity,
            unitPrice,
            supplyAmount,
            taxAmount,
            totalAmount,
            categoryLv1,
            categoryLv2,
            categoryLv3,
            // 클라이언트 호환성을 위한 필드 추가
            majorCategory: categoryLv1,
            middleCategory: categoryLv2,
            minorCategory: categoryLv3,
            vendorName,
            deliveryName,
            notes
          };
          
          order.items.push(item);
          order.totalAmount += totalAmount;
        }
      }

      const orders = Array.from(ordersByNumber.values());
      
      return {
        success: true,
        totalOrders: orders.length,
        totalItems: orders.reduce((sum, order) => sum + order.items.length, 0),
        orders
      };
      
    } catch (error) {
      return {
        success: false,
        totalOrders: 0,
        totalItems: 0,
        orders: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 파싱된 발주서 데이터를 Mock DB에 저장
   */
  static async saveToDatabase(
    orders: POTemplateOrder[],
    userId: string
  ): Promise<{ success: boolean; savedOrders: number; error?: string }> {
    console.log(`🔍 [DB] saveToDatabase 시작: ${orders.length}개 발주서, 사용자 ID: ${userId}`);
    
    try {
      let savedOrders = 0;

      console.log(`🔍 [DB] 트랜잭션 시작`);
      await db.transaction(async (tx: PgTransaction<any, any, any>) => {
        console.log(`🔍 [DB] 트랜잭션 내부 진입 성공`);
        
        for (const orderData of orders) {
          console.log(`🔍 [DB] 발주서 처리 중: ${orderData.orderNumber}, 거래처: ${orderData.vendorName}`);
          // 1. 거래처 조회 또는 생성
          console.log(`🔍 [DB] 거래처 조회: ${orderData.vendorName}`);
          let vendor = await tx.select().from(vendors).where(eq(vendors.name, orderData.vendorName)).limit(1);
          let vendorId: number;
          if (vendor.length === 0) {
            console.log(`🔍 [DB] 거래처 생성: ${orderData.vendorName}`);
            const newVendor = await tx.insert(vendors).values({
              name: orderData.vendorName,
              contactPerson: 'Unknown',
              email: 'noemail@example.com',
              phone: null,
              isActive: true
            }).returning({ id: vendors.id });
            vendorId = newVendor[0].id;
            console.log(`✅ [DB] 거래처 생성됨: ID ${vendorId}`);
          } else {
            vendorId = vendor[0].id;
            console.log(`✅ [DB] 거래처 기존 발견: ID ${vendorId}`);
          }
          
          // 2. 프로젝트 조회 또는 생성
          console.log(`🔍 [DB] 프로젝트 조회: ${orderData.siteName}`);
          let project = await tx.select().from(projects).where(eq(projects.projectName, orderData.siteName)).limit(1);
          let projectId: number;
          if (project.length === 0) {
            console.log(`🔍 [DB] 프로젝트 생성: ${orderData.siteName}`);
            const newProject = await tx.insert(projects).values({
              projectName: orderData.siteName,
              projectCode: `AUTO-${Date.now()}`,
              description: '',
              startDate: new Date().toISOString().split('T')[0],
              endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1년 후
              isActive: true,
              projectManagerId: null,
              orderManagerId: null
            }).returning({ id: projects.id });
            projectId = newProject[0].id;
            console.log(`✅ [DB] 프로젝트 생성됨: ID ${projectId}`);
          } else {
            projectId = project[0].id;
            console.log(`✅ [DB] 프로젝트 기존 발견: ID ${projectId}`);
          }
          
          // 3. 발주서 생성
          const newOrder = await tx.insert(purchaseOrders).values({
            orderNumber: orderData.orderNumber,
            projectId,
            vendorId,
            userId,
            orderDate: orderData.orderDate,
            deliveryDate: orderData.dueDate,
            totalAmount: orderData.totalAmount,
            notes: `PO Template에서 자동 생성됨`
          }).returning({ id: purchaseOrders.id });

          const orderId = newOrder[0].id;

          // 4. 발주서 아이템들 생성
          const itemsForPDF = [];
          for (const item of orderData.items) {
            await tx.insert(purchaseOrderItems).values({
              orderId: orderId,
              itemName: item.itemName,
              specification: item.specification || '',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalAmount: item.totalAmount,
              // 카테고리 필드를 올바른 컬럼에 저장
              majorCategory: item.categoryLv1 || null,
              middleCategory: item.categoryLv2 || null,
              minorCategory: item.categoryLv3 || null,
              notes: item.notes || null
            });
            
            // PDF 생성을 위한 아이템 정보 수집
            itemsForPDF.push({
              category: item.categoryLv1 || '',
              subCategory1: item.categoryLv2 || '',
              subCategory2: item.categoryLv3 || '',
              name: item.itemName,
              specification: item.specification || '',
              quantity: item.quantity,
              unit: '개', // 기본 단위
              unitPrice: item.unitPrice,
              price: item.totalAmount,
              deliveryLocation: item.deliveryName || ''
            });
          }

          // 5. PDF 생성 (트랜잭션 밖에서 처리)
          try {
            console.log(`📄 [DB] PDF 생성 시작: 발주서 ${orderData.orderNumber}`);
            
            // 거래처 정보 조회
            const vendorInfo = await tx.select().from(vendors).where(eq(vendors.id, vendorId)).limit(1);
            const projectInfo = await tx.select().from(projects).where(eq(projects.id, projectId)).limit(1);
            
            const pdfData = {
              orderNumber: orderData.orderNumber,
              orderDate: new Date(orderData.orderDate),
              deliveryDate: new Date(orderData.dueDate),
              projectName: projectInfo[0]?.projectName,
              vendorName: vendorInfo[0]?.name,
              vendorContact: vendorInfo[0]?.contactPerson,
              vendorEmail: vendorInfo[0]?.email,
              items: itemsForPDF,
              totalAmount: orderData.totalAmount,
              notes: `PO Template에서 자동 생성됨`,
              site: orderData.siteName
            };
            
            const pdfResult = await PDFGenerationService.generatePurchaseOrderPDF(
              orderId,
              pdfData,
              userId
            );
            
            if (pdfResult.success) {
              console.log(`✅ [DB] PDF 생성 완료: ${pdfResult.pdfPath}`);
            } else {
              console.error(`⚠️ [DB] PDF 생성 실패: ${pdfResult.error}`);
            }
          } catch (pdfError) {
            console.error(`❌ [DB] PDF 생성 오류:`, pdfError);
            // PDF 생성 실패해도 발주서 저장은 계속 진행
          }

          savedOrders++;
        }
      });

      return {
        success: true,
        savedOrders
      };
      
    } catch (error) {
      return {
        success: false,
        savedOrders: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 특정 시트들을 별도 파일로 추출 - 완전한 ZIP 구조 처리로 100% 서식 보존
   */
  static async extractSheetsToFile(
    sourcePath: string,
    targetPath: string,
    sheetNames: string[] = ['갑지', '을지']
  ): Promise<{ success: boolean; extractedSheets: string[]; error?: string }> {
    DebugLogger.logFunctionEntry('POTemplateProcessorMock.extractSheetsToFile', {
      sourcePath,
      targetPath,
      sheetNames
    });
    
    try {
      
      // Input으로 시작하는 모든 시트를 완전히 제거하고 나머지 시트 보존
      const result = await removeAllInputSheets(sourcePath, targetPath);
      
      if (result.success) {
        const returnValue = {
          success: true,
          extractedSheets: result.remainingSheets
        };
        
        DebugLogger.logFunctionExit('POTemplateProcessorMock.extractSheetsToFile', returnValue);
        return returnValue;
      } else {
        console.error(`❌ 완전한 서식 보존 추출 실패: ${result.error}`);
        
        // 폴백: 기존 XLSX 라이브러리 방식
        console.log(`🔄 폴백: 기본 XLSX 라이브러리로 시도`);
        const workbook = XLSX.readFile(sourcePath);
        const newWorkbook = XLSX.utils.book_new();
        
        const extractedSheets: string[] = [];
        
        for (const sheetName of sheetNames) {
          if (workbook.SheetNames.includes(sheetName)) {
            const worksheet = workbook.Sheets[sheetName];
            XLSX.utils.book_append_sheet(newWorkbook, worksheet, sheetName);
            extractedSheets.push(sheetName);
          }
        }
        
        if (extractedSheets.length > 0) {
          XLSX.writeFile(newWorkbook, targetPath);
        }
        
        return {
          success: true,
          extractedSheets
        };
      }
      
    } catch (error) {
      console.error(`❌ 시트 추출 완전 실패:`, error);
      return {
        success: false,
        extractedSheets: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 유틸리티 메서드들
   */
  private static formatDate(dateValue: any): string {
    if (!dateValue) return '';
    
    try {
      if (dateValue instanceof Date) {
        return dateValue.toISOString().split('T')[0];
      }
      
      if (typeof dateValue === 'number') {
        // Excel 날짜 시리얼 번호 변환
        const date = new Date((dateValue - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
      }
      
      if (typeof dateValue === 'string') {
        // 한국식 날짜 형식 (YYYY.M.D 또는 YYYY.MM.DD)을 JavaScript가 인식 가능한 형식으로 변환
        let dateStr = dateValue.trim();
        if (/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(dateStr)) {
          dateStr = dateStr.replace(/\./g, '-'); // 2024.6.12 -> 2024-6-12
        }
        
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
      
      return String(dateValue);
    } catch {
      return String(dateValue);
    }
  }

  private static safeNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[,\s]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * 발주번호 생성 (PO-YYYYMMDD-VENDOR-XXX 형식)
   */
  private static generateOrderNumber(orderDate: string, vendorName: string): string {
    const date = orderDate ? orderDate.replace(/-/g, '') : new Date().toISOString().split('T')[0].replace(/-/g, '');
    const vendorCode = vendorName ? vendorName.substring(0, 3).toUpperCase() : 'UNK';
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PO-${date}-${vendorCode}-${random}`;
  }

  /**
   * 기본 납기일자 생성 (발주일 + 7일)
   */
  private static getDefaultDueDate(orderDateValue: any): string {
    try {
      const orderDate = this.formatDate(orderDateValue);
      if (!orderDate) {
        // 발주일도 없으면 오늘부터 7일 후
        const date = new Date();
        date.setDate(date.getDate() + 7);
        return date.toISOString().split('T')[0];
      }
      
      const date = new Date(orderDate);
      date.setDate(date.getDate() + 7);
      return date.toISOString().split('T')[0];
    } catch {
      // 오류 시 오늘부터 7일 후
      const date = new Date();
      date.setDate(date.getDate() + 7);
      return date.toISOString().split('T')[0];
    }
  }
}