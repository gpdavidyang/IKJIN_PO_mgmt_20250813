import XLSX from 'xlsx';
import { removeAllInputSheets } from './excel-input-sheet-remover';
import { db } from "../db";
import { vendors, projects, purchaseOrders, purchaseOrderItems } from "@shared/schema";
import { eq } from "drizzle-orm";
import { DebugLogger } from './debug-logger';

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
        // 빈 행이거나 발주번호가 없는 경우 건너뛰기
        if (!row || !row[0]) continue;
        
        const orderNumber = String(row[0]).trim();
        const orderDate = this.formatDate(row[1]);
        const siteName = String(row[2] || '').trim();
        const categoryLv1 = String(row[3] || '').trim();
        const categoryLv2 = String(row[4] || '').trim();
        const categoryLv3 = String(row[5] || '').trim();
        const itemName = String(row[6] || '').trim();
        const specification = String(row[7] || '').trim();
        const quantity = this.safeNumber(row[8]);
        const unitPrice = this.safeNumber(row[9]);
        const supplyAmount = this.safeNumber(row[10]);
        const taxAmount = this.safeNumber(row[11]);
        const totalAmount = this.safeNumber(row[12]);
        const dueDate = this.formatDate(row[13]);
        const vendorName = String(row[14] || '').trim();
        const deliveryName = String(row[15] || '').trim();
        const notes = String(row[16] || '').trim();

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
    try {
      let savedOrders = 0;

      await db.transaction(async (tx) => {
        for (const orderData of orders) {
          // 1. 거래처 조회 또는 생성
          let vendor = await tx.select().from(vendors).where(eq(vendors.name, orderData.vendorName)).limit(1);
          let vendorId: number;
          if (vendor.length === 0) {
            const newVendor = await tx.insert(vendors).values({
              name: orderData.vendorName,
              contactPerson: 'Unknown',
              email: null,
              phone: null,
              isActive: true
            }).returning({ id: vendors.id });
            vendorId = newVendor[0].id;
          } else {
            vendorId = vendor[0].id;
          }
          
          // 2. 프로젝트 조회 또는 생성
          let project = await tx.select().from(projects).where(eq(projects.name, orderData.siteName)).limit(1);
          let projectId: number;
          if (project.length === 0) {
            const newProject = await tx.insert(projects).values({
              name: orderData.siteName,
              description: '',
              startDate: new Date(),
              endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1년 후
              isActive: true,
              projectManagerId: null,
              orderManagerId: null
            }).returning({ id: projects.id });
            projectId = newProject[0].id;
          } else {
            projectId = project[0].id;
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
          for (const item of orderData.items) {
            await tx.insert(purchaseOrderItems).values({
              purchaseOrderId: orderId,
              itemName: item.itemName,
              specification: item.specification || '',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalAmount: item.totalAmount,
              notes: `${item.categoryLv1 || ''} ${item.categoryLv2 || ''} ${item.categoryLv3 || ''}`.trim() || null
            });
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
}