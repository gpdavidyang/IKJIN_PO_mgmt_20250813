import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { db } from '../db';
import { vendors, items, projects, itemCategories } from '@shared/schema';
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

  // Generate sample template files
  static generateImportTemplate(entity: 'vendors' | 'items' | 'projects', format: 'excel' | 'csv'): Buffer {
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