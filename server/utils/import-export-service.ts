import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { db } from '../db';
import { vendors, items, projects, itemCategories, purchaseOrders, purchaseOrderItems } from '@shared/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

// Define types for import data
interface VendorImportData {
  name: string;
  vendorCode?: string;
  aliases?: string; // JSON string array
  businessNumber?: string;
  contactPerson: string;
  email: string;
  phone?: string;
  address?: string;
  businessType?: string;
}

interface ItemImportData {
  name: string;
  specification?: string;
  unit: string;
  unitPrice?: number;
  majorCategory?: string;
  middleCategory?: string;
  minorCategory?: string;
  description?: string;
}

interface ProjectImportData {
  projectName: string;
  projectCode: string;
  clientName?: string;
  projectType?: 'commercial' | 'residential' | 'industrial' | 'infrastructure';
  location?: string;
  startDate?: string;
  endDate?: string;
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  totalBudget?: number;
  description?: string;
}

interface PurchaseOrderImportData {
  orderNumber: string;
  projectId: number;
  vendorId?: number;
  orderDate: string;
  deliveryDate?: string;
  itemName: string;
  specification?: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  majorCategory?: string;
  middleCategory?: string;
  minorCategory?: string;
  notes?: string;
}

interface ItemCategoryImportData {
  categoryType: 'major' | 'middle' | 'minor';
  categoryValue: string;
  parentId?: number;
  displayOrder?: number;
}

export class ImportExportService {
  // Parse Excel file
  private static parseExcelFile(filePath: string): any[] {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    return data;
  }

  // Parse CSV file
  private static parseCSVFile(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      Papa.parse(fileContent, {
        header: true,
        complete: (results) => {
          resolve(results.data);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }

  // Vendor Import Methods
  static async importVendors(filePath: string, fileType: 'excel' | 'csv'): Promise<{ imported: number; errors: any[] }> {
    try {
      const data = fileType === 'excel' 
        ? this.parseExcelFile(filePath)
        : await this.parseCSVFile(filePath);

      let imported = 0;
      const errors: any[] = [];

      for (const row of data) {
        try {
          const vendorData: VendorImportData = {
            name: row['거래처명'] || row['name'] || '',
            vendorCode: row['거래처코드'] || row['vendorCode'],
            businessNumber: row['사업자번호'] || row['businessNumber'],
            contactPerson: row['담당자'] || row['contactPerson'] || '',
            email: row['이메일'] || row['email'] || '',
            phone: row['전화번호'] || row['phone'],
            address: row['주소'] || row['address'],
            businessType: row['사업유형'] || row['businessType'],
          };

          // Parse aliases if provided
          if (row['별칭'] || row['aliases']) {
            const aliasesStr = row['별칭'] || row['aliases'];
            try {
              vendorData.aliases = JSON.stringify(
                typeof aliasesStr === 'string' 
                  ? aliasesStr.split(',').map((a: string) => a.trim())
                  : aliasesStr
              );
            } catch (e) {
              vendorData.aliases = '[]';
            }
          }

          // Validate required fields
          if (!vendorData.name || !vendorData.contactPerson || !vendorData.email) {
            errors.push({ row: imported + errors.length + 1, error: 'Missing required fields', data: row });
            continue;
          }

          await db.insert(vendors).values({
            ...vendorData,
            aliases: vendorData.aliases ? JSON.parse(vendorData.aliases) : [],
          });
          imported++;
        } catch (error) {
          errors.push({ row: imported + errors.length + 1, error: error.message, data: row });
        }
      }

      return { imported, errors };
    } catch (error) {
      throw new Error(`Failed to import vendors: ${error.message}`);
    }
  }

  // Item Import Methods
  static async importItems(filePath: string, fileType: 'excel' | 'csv'): Promise<{ imported: number; errors: any[] }> {
    try {
      const data = fileType === 'excel' 
        ? this.parseExcelFile(filePath)
        : await this.parseCSVFile(filePath);

      let imported = 0;
      const errors: any[] = [];

      for (const row of data) {
        try {
          const itemData: ItemImportData = {
            name: row['품목명'] || row['name'] || '',
            specification: row['규격'] || row['specification'],
            unit: row['단위'] || row['unit'] || '',
            unitPrice: parseFloat(row['단가'] || row['unitPrice']) || undefined,
            majorCategory: row['대분류'] || row['majorCategory'],
            middleCategory: row['중분류'] || row['middleCategory'],
            minorCategory: row['소분류'] || row['minorCategory'],
            description: row['설명'] || row['description'],
          };

          // Validate required fields
          if (!itemData.name || !itemData.unit) {
            errors.push({ row: imported + errors.length + 1, error: 'Missing required fields', data: row });
            continue;
          }

          await db.insert(items).values(itemData);
          imported++;
        } catch (error) {
          errors.push({ row: imported + errors.length + 1, error: error.message, data: row });
        }
      }

      return { imported, errors };
    } catch (error) {
      throw new Error(`Failed to import items: ${error.message}`);
    }
  }

  // Project Import Methods
  static async importProjects(filePath: string, fileType: 'excel' | 'csv'): Promise<{ imported: number; errors: any[] }> {
    try {
      const data = fileType === 'excel' 
        ? this.parseExcelFile(filePath)
        : await this.parseCSVFile(filePath);

      let imported = 0;
      const errors: any[] = [];

      // Map Korean project types to English
      const projectTypeMap: Record<string, string> = {
        '상업시설': 'commercial',
        '주거시설': 'residential',
        '산업시설': 'industrial',
        '인프라': 'infrastructure'
      };

      const statusMap: Record<string, string> = {
        '계획중': 'planning',
        '진행중': 'active',
        '보류': 'on_hold',
        '완료': 'completed',
        '취소': 'cancelled'
      };

      for (const row of data) {
        try {
          const projectData: ProjectImportData = {
            projectName: row['프로젝트명'] || row['projectName'] || '',
            projectCode: row['프로젝트코드'] || row['projectCode'] || '',
            clientName: row['발주처'] || row['clientName'],
            projectType: (projectTypeMap[row['프로젝트유형']] || row['projectType'] || 'commercial') as any,
            location: row['위치'] || row['location'],
            startDate: row['시작일'] || row['startDate'],
            endDate: row['종료일'] || row['endDate'],
            status: (statusMap[row['상태']] || row['status'] || 'active') as any,
            totalBudget: parseFloat(row['예산'] || row['totalBudget']) || undefined,
            description: row['설명'] || row['description'],
          };

          // Validate required fields
          if (!projectData.projectName || !projectData.projectCode) {
            errors.push({ row: imported + errors.length + 1, error: 'Missing required fields', data: row });
            continue;
          }

          await db.insert(projects).values(projectData);
          imported++;
        } catch (error) {
          errors.push({ row: imported + errors.length + 1, error: error.message, data: row });
        }
      }

      return { imported, errors };
    } catch (error) {
      throw new Error(`Failed to import projects: ${error.message}`);
    }
  }

  // Purchase Order Import Methods
  static async importPurchaseOrders(filePath: string, fileType: 'excel' | 'csv'): Promise<{ imported: number; errors: any[] }> {
    try {
      const data = fileType === 'excel' 
        ? this.parseExcelFile(filePath)
        : await this.parseCSVFile(filePath);

      let imported = 0;
      const errors: any[] = [];
      
      // Group data by order number to create orders and their items
      const orderGroups = new Map<string, any[]>();
      
      for (const row of data) {
        const orderNumber = row['발주번호'] || row['orderNumber'] || '';
        if (!orderNumber) {
          errors.push({ row: imported + errors.length + 1, error: 'Missing order number', data: row });
          continue;
        }
        
        if (!orderGroups.has(orderNumber)) {
          orderGroups.set(orderNumber, []);
        }
        orderGroups.get(orderNumber)!.push(row);
      }

      for (const [orderNumber, orderRows] of orderGroups) {
        try {
          const firstRow = orderRows[0];
          
          // Parse order data from first row
          const orderData = {
            orderNumber: orderNumber,
            projectId: parseInt(firstRow['현장ID'] || firstRow['projectId']) || null,
            vendorId: parseInt(firstRow['거래처ID'] || firstRow['vendorId']) || null,
            orderDate: this.parseDate(firstRow['발주일자'] || firstRow['orderDate']) || new Date(),
            deliveryDate: this.parseDate(firstRow['납기일자'] || firstRow['deliveryDate']) || null,
            status: 'pending' as const,
            totalAmount: 0,
            userId: 'system', // 시스템에서 가져온 경우 기본값
            notes: firstRow['비고'] || firstRow['notes'] || ''
          };

          // Validate required fields
          if (!orderData.projectId) {
            errors.push({ row: imported + errors.length + 1, error: 'Missing or invalid project ID', data: firstRow });
            continue;
          }

          // Calculate total amount from all items
          let totalAmount = 0;
          const orderItems = [];

          for (const [index, row] of orderRows.entries()) {
            try {
              const itemData = {
                itemName: row['품목명'] || row['itemName'] || '',
                specification: row['규격'] || row['specification'] || '',
                unit: row['단위'] || row['unit'] || '',
                quantity: parseFloat(row['수량'] || row['quantity']) || 0,
                unitPrice: parseFloat(row['단가'] || row['unitPrice']) || 0,
                totalAmount: parseFloat(row['총금액'] || row['totalAmount']) || 0,
                majorCategory: row['대분류'] || row['majorCategory'] || '',
                middleCategory: row['중분류'] || row['middleCategory'] || '',
                minorCategory: row['소분류'] || row['minorCategory'] || '',
                notes: row['품목비고'] || row['itemNotes'] || ''
              };

              // Validate item fields
              if (!itemData.itemName || itemData.quantity <= 0 || itemData.unitPrice < 0) {
                errors.push({ 
                  row: imported + errors.length + 1, 
                  error: `Invalid item data in row ${index + 1} for order ${orderNumber}`, 
                  data: row 
                });
                continue;
              }

              // Calculate total if not provided
              if (itemData.totalAmount === 0) {
                itemData.totalAmount = itemData.quantity * itemData.unitPrice;
              }

              totalAmount += itemData.totalAmount;
              orderItems.push(itemData);
            } catch (error) {
              errors.push({ 
                row: imported + errors.length + 1, 
                error: `Error processing item in order ${orderNumber}: ${error.message}`, 
                data: row 
              });
            }
          }

          if (orderItems.length === 0) {
            errors.push({ row: imported + errors.length + 1, error: `No valid items for order ${orderNumber}`, data: firstRow });
            continue;
          }

          orderData.totalAmount = totalAmount;

          // Insert purchase order
          const [insertedOrder] = await db.insert(purchaseOrders).values(orderData).returning({ id: purchaseOrders.id });
          
          // Insert purchase order items
          for (const itemData of orderItems) {
            await db.insert(purchaseOrderItems).values({
              orderId: insertedOrder.id,
              ...itemData
            });
          }

          imported++;
        } catch (error) {
          errors.push({ row: imported + errors.length + 1, error: `Error creating order ${orderNumber}: ${error.message}`, data: orderRows[0] });
        }
      }

      return { imported, errors };
    } catch (error) {
      throw new Error(`Failed to import purchase orders: ${error.message}`);
    }
  }

  // Helper method to parse dates
  private static parseDate(dateStr: string | Date | null): Date | null {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    
    // Try various date formats
    const formats = [
      /^\d{4}-\d{2}-\d{2}$/,     // YYYY-MM-DD
      /^\d{4}\/\d{2}\/\d{2}$/,   // YYYY/MM/DD
      /^\d{2}\/\d{2}\/\d{4}$/,   // MM/DD/YYYY
      /^\d{2}-\d{2}-\d{4}$/,     // MM-DD-YYYY
    ];

    const str = dateStr.toString().trim();
    if (formats.some(format => format.test(str))) {
      const parsed = new Date(str);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
  }

  // Export Methods
  static async exportVendors(format: 'excel' | 'csv'): Promise<Buffer> {
    const vendorData = await db.select().from(vendors).where(eq(vendors.isActive, true));
    
    const exportData = vendorData.map(vendor => ({
      '거래처명': vendor.name,
      '거래처코드': vendor.vendorCode || '',
      '별칭': vendor.aliases ? vendor.aliases.join(', ') : '',
      '사업자번호': vendor.businessNumber || '',
      '담당자': vendor.contactPerson,
      '이메일': vendor.email,
      '전화번호': vendor.phone || '',
      '주소': vendor.address || '',
      '사업유형': vendor.businessType || '',
      '생성일': vendor.createdAt?.toISOString().split('T')[0] || ''
    }));

    if (format === 'excel') {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '거래처목록');
      return Buffer.from(XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }));
    } else {
      const csv = Papa.unparse(exportData, {
        header: true,
        encoding: 'utf8'
      });
      return Buffer.from(csv, 'utf8');
    }
  }

  static async exportItems(format: 'excel' | 'csv'): Promise<Buffer> {
    const itemData = await db.select().from(items).where(eq(items.isActive, true));
    
    const exportData = itemData.map(item => ({
      '품목명': item.name,
      '규격': item.specification || '',
      '단위': item.unit,
      '단가': item.unitPrice || '',
      '대분류': item.majorCategory || '',
      '중분류': item.middleCategory || '',
      '소분류': item.minorCategory || '',
      '설명': item.description || '',
      '생성일': item.createdAt?.toISOString().split('T')[0] || ''
    }));

    if (format === 'excel') {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '품목목록');
      return Buffer.from(XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }));
    } else {
      const csv = Papa.unparse(exportData, {
        header: true,
        encoding: 'utf8'
      });
      return Buffer.from(csv, 'utf8');
    }
  }

  static async exportProjects(format: 'excel' | 'csv'): Promise<Buffer> {
    const projectData = await db.select().from(projects).where(eq(projects.isActive, true));
    
    const typeMap: Record<string, string> = {
      'commercial': '상업시설',
      'residential': '주거시설',
      'industrial': '산업시설',
      'infrastructure': '인프라'
    };

    const statusMap: Record<string, string> = {
      'planning': '계획중',
      'active': '진행중',
      'on_hold': '보류',
      'completed': '완료',
      'cancelled': '취소'
    };

    const exportData = projectData.map(project => ({
      '프로젝트명': project.projectName,
      '프로젝트코드': project.projectCode,
      '발주처': project.clientName || '',
      '프로젝트유형': typeMap[project.projectType] || project.projectType,
      '위치': project.location || '',
      '시작일': project.startDate || '',
      '종료일': project.endDate || '',
      '상태': statusMap[project.status] || project.status,
      '예산': project.totalBudget || '',
      '설명': project.description || '',
      '생성일': project.createdAt?.toISOString().split('T')[0] || ''
    }));

    if (format === 'excel') {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '프로젝트목록');
      return Buffer.from(XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }));
    } else {
      const csv = Papa.unparse(exportData, {
        header: true,
        encoding: 'utf8'
      });
      return Buffer.from(csv, 'utf8');
    }
  }

  static async exportPurchaseOrders(format: 'excel' | 'csv'): Promise<Buffer> {
    // Join purchase orders with their items and related data
    const orderData = await db.select({
      orderId: purchaseOrders.id,
      orderNumber: purchaseOrders.orderNumber,
      projectId: purchaseOrders.projectId,
      vendorId: purchaseOrders.vendorId,
      orderDate: purchaseOrders.orderDate,
      deliveryDate: purchaseOrders.deliveryDate,
      orderStatus: purchaseOrders.orderStatus,
      approvalStatus: purchaseOrders.approvalStatus,
      notes: purchaseOrders.notes,
      itemName: purchaseOrderItems.itemName,
      specification: purchaseOrderItems.specification,
      unit: purchaseOrderItems.unit,
      quantity: purchaseOrderItems.quantity,
      unitPrice: purchaseOrderItems.unitPrice,
      totalAmount: purchaseOrderItems.totalAmount,
      majorCategory: purchaseOrderItems.majorCategory,
      middleCategory: purchaseOrderItems.middleCategory,
      minorCategory: purchaseOrderItems.minorCategory,
      itemNotes: purchaseOrderItems.notes
    })
    .from(purchaseOrders)
    .leftJoin(purchaseOrderItems, eq(purchaseOrders.id, purchaseOrderItems.orderId))
    .where(eq(purchaseOrders.isActive, true));

    const orderStatusMap: Record<string, string> = {
      'draft': '임시저장',
      'created': '발주생성',
      'sent': '발주완료',
      'delivered': '납품완료'
    };
    
    const approvalStatusMap: Record<string, string> = {
      'not_required': '승인불필요',
      'pending': '승인대기',
      'approved': '승인완료',
      'rejected': '반려'
    };

    const exportData = orderData.map(order => ({
      '발주번호': order.orderNumber,
      '현장ID': order.projectId,
      '거래처ID': order.vendorId || '',
      '발주일자': order.orderDate?.toISOString().split('T')[0] || '',
      '납기일자': order.deliveryDate?.toISOString().split('T')[0] || '',
      '발주상태': orderStatusMap[order.orderStatus] || order.orderStatus,
      '승인상태': approvalStatusMap[order.approvalStatus] || order.approvalStatus,
      '품목명': order.itemName || '',
      '규격': order.specification || '',
      '단위': order.unit || '',
      '수량': order.quantity || 0,
      '단가': order.unitPrice || 0,
      '총금액': order.totalAmount || 0,
      '대분류': order.majorCategory || '',
      '중분류': order.middleCategory || '',
      '소분류': order.minorCategory || '',
      '비고': order.notes || '',
      '품목비고': order.itemNotes || ''
    }));

    if (format === 'excel') {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '발주서목록');
      return Buffer.from(XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }));
    } else {
      const csv = Papa.unparse(exportData, {
        header: true,
        encoding: 'utf8'
      });
      return Buffer.from(csv, 'utf8');
    }
  }

  // Generate sample template files
  static generateImportTemplate(entity: 'vendors' | 'items' | 'projects' | 'purchase_orders', format: 'excel' | 'csv'): Buffer {
    const templates = {
      vendors: [
        {
          '거래처명': '예시거래처',
          '거래처코드': 'VENDOR001',
          '별칭': '예시1, 예시2',
          '사업자번호': '123-45-67890',
          '담당자': '홍길동',
          '이메일': 'example@company.com',
          '전화번호': '02-1234-5678',
          '주소': '서울시 강남구 테헤란로 123',
          '사업유형': '제조업'
        }
      ],
      items: [
        {
          '품목명': '철근',
          '규격': 'HD10',
          '단위': 'TON',
          '단가': '850000',
          '대분류': '철근',
          '중분류': '이형철근',
          '소분류': 'HD10',
          '설명': '고강도 이형철근'
        }
      ],
      projects: [
        {
          '프로젝트명': '강남 오피스빌딩',
          '프로젝트코드': 'GN-2024-001',
          '발주처': 'ABC건설',
          '프로젝트유형': '상업시설',
          '위치': '서울시 강남구',
          '시작일': '2024-01-01',
          '종료일': '2024-12-31',
          '상태': '진행중',
          '예산': '50000000000',
          '설명': '20층 규모 오피스빌딩 신축공사'
        }
      ],
      purchase_orders: [
        {
          '발주번호': 'PO20250101001',
          '현장ID': '1',
          '거래처ID': '1',
          '발주일자': '2025-01-01',
          '납기일자': '2025-01-15',
          '품목명': '철근',
          '규격': 'D16',
          '단위': '톤',
          '수량': 10,
          '단가': 1500000,
          '총금액': 15000000,
          '대분류': '철강재료',
          '중분류': '철근',
          '소분류': '이형철근',
          '비고': '현장 직납'
        }
      ]
    };

    const data = templates[entity];

    if (format === 'excel') {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      return Buffer.from(XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }));
    } else {
      const csv = Papa.unparse(data, {
        header: true,
        encoding: 'utf8'
      });
      return Buffer.from(csv, 'utf8');
    }
  }
}