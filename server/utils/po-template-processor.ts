import { db } from '../db';
import { purchaseOrders, purchaseOrderItems, vendors, projects } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { removeAllInputSheets } from './excel-input-sheet-remover';

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

export class POTemplateProcessor {
  /**
   * Excel 파일에서 Input 시트를 파싱하여 발주서 데이터 추출
   */
  static parseInputSheet(filePath: string): POTemplateParseResult {
    try {
      const buffer = fs.readFileSync(filePath);
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      
      // 'Input' 시트 찾기
      const inputSheetName = workbook.SheetNames.find(name => 
        name === 'Input'
      );
      
      if (!inputSheetName) {
        return {
          success: false,
          totalOrders: 0,
          totalItems: 0,
          orders: [],
          error: 'Input 시트를 찾을 수 없습니다.'
        };
      }

      const worksheet = workbook.Sheets[inputSheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // 헤더 행 제거
      const rows = data.slice(1) as any[][];
      
      // 발주서별로 그룹화
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
            vendorName,
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
   * 파싱된 발주서 데이터를 DB에 저장
   */
  static async saveToDatabase(
    orders: POTemplateOrder[],
    userId: string
  ): Promise<{ success: boolean; savedOrders: number; error?: string }> {
    try {
      let savedOrders = 0;

      await db.transaction(async (tx: any) => {
        for (const orderData of orders) {
          // 1. 거래처 조회 또는 생성
          const vendorId = await this.findOrCreateVendor(tx, orderData.vendorName);
          
          // 2. 프로젝트 조회 또는 생성
          const projectId = await this.findOrCreateProject(tx, orderData.siteName);
          
          // 3. 발주서 생성
          const [purchaseOrder] = await tx.insert(purchaseOrders).values({
            orderNumber: orderData.orderNumber,
            projectId,
            vendorId,
            userId,
            orderDate: new Date(orderData.orderDate + 'T00:00:00Z'),
            deliveryDate: orderData.dueDate ? new Date(orderData.dueDate + 'T00:00:00Z') : null,
            totalAmount: orderData.totalAmount,
            status: 'draft',
            notes: `PO Template에서 자동 생성됨`
          }).returning();

          // 4. 발주서 아이템들 생성
          for (const item of orderData.items) {
            await tx.insert(purchaseOrderItems).values({
              orderId: purchaseOrder.id,
              itemName: item.itemName,
              specification: item.specification,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalAmount: item.totalAmount,
              majorCategory: item.categoryLv1,
              middleCategory: item.categoryLv2,
              minorCategory: item.categoryLv3,
              notes: item.notes
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
   * 특정 시트들을 별도 파일로 추출 (Input 시트 제거)
   * xlwings 기반 완벽한 서식 보존
   */
  static async extractSheetsToFile(
    sourcePath: string,
    targetPath: string,
    sheetNames: string[] = ['갑지', '을지']
  ): Promise<{ success: boolean; extractedSheets: string[]; error?: string }> {
    try {
      console.log(`📄 시트 추출 시작 (xlwings 기반): ${sourcePath} -> ${targetPath}`);
      console.log(`[DEBUG] POTemplateProcessor.extractSheetsToFile called at ${new Date().toISOString()}`);
      console.log(`[DEBUG] sourcePath: ${sourcePath}`);
      console.log(`[DEBUG] targetPath: ${targetPath}`);
      console.log(`[DEBUG] sheetNames: ${JSON.stringify(sheetNames)}`);
      
      // xlwings 기반 Input 시트 제거 처리 사용
      const result = await POTemplateProcessor.removeInputSheetOnly(
        sourcePath,
        targetPath,
        'Input'
      );
      
      if (result.success) {
        // 추출된 시트 목록 반환
        const extractedSheets = result.remainingSheets.filter(sheetName => 
          sheetNames.includes(sheetName)
        );
        
        console.log(`✅ 시트 추출 완료: ${extractedSheets.join(', ')}`);
        
        return {
          success: true,
          extractedSheets
        };
      } else {
        console.error(`❌ 시트 추출 실패: ${result.error}`);
        return {
          success: false,
          extractedSheets: [],
          error: result.error
        };
      }
      
    } catch (error) {
      console.error(`❌ 시트 추출 오류:`, error);
      return {
        success: false,
        extractedSheets: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Input 시트만 제거하고 원본 형식을 유지한 엑셀 파일 생성
   * 기존 엑셀 파일의 모든 형식(셀 테두리, 병합, 색상, 서식 등)을 그대로 유지
   */
  static async removeInputSheetOnly(
    sourcePath: string,
    targetPath: string,
    inputSheetName: string = 'Input'
  ): Promise<{ success: boolean; removedSheet: boolean; remainingSheets: string[]; error?: string }> {
    try {
      console.log(`📄 Input 시트 제거 시작: ${sourcePath} -> ${targetPath}`);
      console.log(`[DEBUG] POTemplateProcessor.removeInputSheetOnly called at ${new Date().toISOString()}`);
      console.log(`[DEBUG] sourcePath: ${sourcePath}`);
      console.log(`[DEBUG] targetPath: ${targetPath}`);
      console.log(`[DEBUG] inputSheetName: ${inputSheetName}`);
      
      // 새로운 안전한 방식으로 Input 시트 제거
      const result = await removeAllInputSheets(sourcePath, targetPath);
      
      if (result.success) {
        console.log(`✅ Input 시트 제거 완료 (원본 서식 보존됨)`);
      }
      
      return {
        success: result.success,
        removedSheet: result.removedSheets.length > 0,
        remainingSheets: result.remainingSheets,
        error: result.error
      };

    } catch (error) {
      console.error(`❌ Input 시트 제거 중 오류:`, error);
      return {
        success: false,
        removedSheet: false,
        remainingSheets: [],
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

  private static async findOrCreateVendor(tx: any, vendorName: string): Promise<number> {
    if (!vendorName) {
      // 기본 거래처 생성
      const [vendor] = await tx.insert(vendors).values({
        name: '미지정 거래처',
        contactPerson: '미지정',
        email: `unknown-${uuidv4()}@example.com`,
        mainContact: '미지정'
      }).returning();
      return vendor.id;
    }

    // 기존 거래처 조회
    const existingVendor = await tx.select().from(vendors).where(eq(vendors.name, vendorName)).limit(1);
    
    if (existingVendor.length > 0) {
      return existingVendor[0].id;
    }

    // 새 거래처 생성
    const [newVendor] = await tx.insert(vendors).values({
      name: vendorName,
      contactPerson: '자동생성',
      email: `auto-${uuidv4()}@example.com`,
      mainContact: '자동생성'
    }).returning();
    
    return newVendor.id;
  }

  private static async findOrCreateProject(tx: any, siteName: string): Promise<number> {
    if (!siteName) {
      // 기본 프로젝트 생성
      const [project] = await tx.insert(projects).values({
        projectName: '미지정 현장',
        projectCode: `AUTO-${uuidv4().slice(0, 8)}`,
        status: 'active'
      }).returning();
      return project.id;
    }

    // 기존 프로젝트 조회
    const existingProject = await tx.select().from(projects).where(eq(projects.projectName, siteName)).limit(1);
    
    if (existingProject.length > 0) {
      return existingProject[0].id;
    }

    // 새 프로젝트 생성
    const [newProject] = await tx.insert(projects).values({
      projectName: siteName,
      projectCode: `AUTO-${uuidv4().slice(0, 8)}`,
      status: 'active'
    }).returning();
    
    return newProject.id;
  }
}