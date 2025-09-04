import * as XLSX from 'xlsx';
import { db } from '../db';
import { 
  validationSessions, 
  validationResults,
  purchaseOrders,
  purchaseOrderItems,
  ValidationSession,
  ValidationResult,
  InsertValidationResult
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { ValidationService } from './validation-service';
import { CategoryMappingService } from './category-mapping-service';
import { VendorValidationService } from './vendor-validation-service';
import { WebSocketService } from './websocket-service';
import { DuplicateDetectionService, DuplicateCheckResult } from './duplicate-detection-service';

interface ParsedRow {
  rowIndex: number;
  projectName?: string;
  vendorName?: string;
  vendorEmail?: string;
  deliveryDate?: string;
  itemName?: string;
  specification?: string;
  unit?: string;
  quantity?: number;
  unitPrice?: number;
  totalAmount?: number;
  majorCategory?: string;
  middleCategory?: string;
  minorCategory?: string;
  notes?: string;
}

interface ProcessingResult {
  totalItems: number;
  validItems: number;
  warningItems: number;
  errorItems: number;
  parsedData: ParsedRow[];
}

export class SmartUploadService {
  private validationService: ValidationService;
  private categoryMappingService: CategoryMappingService;
  private vendorValidationService: VendorValidationService;
  private duplicateDetectionService: DuplicateDetectionService;
  private wsService: WebSocketService;

  constructor() {
    this.validationService = new ValidationService();
    this.categoryMappingService = new CategoryMappingService();
    this.vendorValidationService = new VendorValidationService();
    this.duplicateDetectionService = new DuplicateDetectionService();
    this.wsService = WebSocketService.getInstance();
  }

  /**
   * Process Excel file asynchronously with real-time updates
   */
  async processFileAsync(
    sessionId: string, 
    buffer: Buffer, 
    userId: number
  ): Promise<ProcessingResult> {
    try {
      // Parse Excel file
      const parsedData = await this.parseExcelFile(buffer);
      
      // Update session with total items
      await db.update(validationSessions)
        .set({ totalItems: parsedData.length })
        .where(eq(validationSessions.id, sessionId));

      // Emit parsing complete event
      this.wsService.emitToUser(userId, 'parsing:complete', {
        sessionId,
        totalItems: parsedData.length,
      });

      // Process each row with validation
      const results = await this.validateRows(sessionId, parsedData, userId);

      // Update session with final results
      await db.update(validationSessions)
        .set({
          validItems: results.validItems,
          warningItems: results.warningItems,
          errorItems: results.errorItems,
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(validationSessions.id, sessionId));

      return results;
    } catch (error) {
      // Update session with error status
      await db.update(validationSessions)
        .set({
          status: 'failed',
          completedAt: new Date(),
          metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
        })
        .where(eq(validationSessions.id, sessionId));

      throw error;
    }
  }

  /**
   * Parse Excel file and extract data
   */
  private async parseExcelFile(buffer: Buffer): Promise<ParsedRow[]> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with header row
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (jsonData.length < 2) {
      throw new Error('Excel file must contain at least a header row and one data row');
    }

    const headers = jsonData[0];
    const dataRows = jsonData.slice(1);

    // Map column names to indices
    const columnMap = this.createColumnMap(headers);

    // Parse each row
    const parsedRows: ParsedRow[] = [];
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
        continue; // Skip empty rows
      }

      parsedRows.push({
        rowIndex: i + 2, // Excel row number (1-indexed, skip header)
        projectName: this.getCellValue(row, columnMap, ['프로젝트', 'project', '프로젝트명']),
        vendorName: this.getCellValue(row, columnMap, ['거래처', 'vendor', '거래처명', '업체명']),
        vendorEmail: this.getCellValue(row, columnMap, ['이메일', 'email', '거래처이메일']),
        deliveryDate: this.getCellValue(row, columnMap, ['납기', '납기일', 'delivery', '배송일']),
        itemName: this.getCellValue(row, columnMap, ['품목', 'item', '품목명', '자재명']),
        specification: this.getCellValue(row, columnMap, ['규격', 'spec', 'specification']),
        unit: this.getCellValue(row, columnMap, ['단위', 'unit']),
        quantity: this.getNumericValue(row, columnMap, ['수량', 'quantity', 'qty']),
        unitPrice: this.getNumericValue(row, columnMap, ['단가', 'price', 'unit_price']),
        totalAmount: this.getNumericValue(row, columnMap, ['금액', 'amount', 'total']),
        majorCategory: this.getCellValue(row, columnMap, ['대분류', 'major_category']),
        middleCategory: this.getCellValue(row, columnMap, ['중분류', 'middle_category']),
        minorCategory: this.getCellValue(row, columnMap, ['소분류', 'minor_category']),
        notes: this.getCellValue(row, columnMap, ['비고', 'notes', 'memo', '메모']),
      });
    }

    return parsedRows;
  }

  /**
   * Create a mapping of column names to indices
   */
  private createColumnMap(headers: any[]): Map<string, number> {
    const map = new Map<string, number>();
    headers.forEach((header, index) => {
      if (header && typeof header === 'string') {
        map.set(header.toLowerCase().trim(), index);
      }
    });
    return map;
  }

  /**
   * Get cell value by possible column names
   */
  private getCellValue(row: any[], columnMap: Map<string, number>, possibleNames: string[]): string | undefined {
    for (const name of possibleNames) {
      const index = columnMap.get(name.toLowerCase());
      if (index !== undefined && row[index] !== undefined && row[index] !== null) {
        return String(row[index]).trim();
      }
    }
    return undefined;
  }

  /**
   * Get numeric value from cell
   */
  private getNumericValue(row: any[], columnMap: Map<string, number>, possibleNames: string[]): number | undefined {
    const value = this.getCellValue(row, columnMap, possibleNames);
    if (value === undefined) return undefined;
    
    const numeric = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return isNaN(numeric) ? undefined : numeric;
  }

  /**
   * Validate all rows and store results
   */
  private async validateRows(
    sessionId: string,
    rows: ParsedRow[],
    userId: number
  ): Promise<ProcessingResult> {
    let validItems = 0;
    let warningItems = 0;
    let errorItems = 0;

    const validationResultsToInsert: InsertValidationResult[] = [];

    // Step 1: Detect duplicates first
    const duplicateResults = await this.duplicateDetectionService.detectDuplicates(
      rows,
      sessionId,
      {
        checkExisting: false, // Temporarily disable database check
        similarityThreshold: 0.85,
        groupSimilar: true,
        detectPartialDuplicates: true
      }
    );

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const validationErrors: string[] = [];
      const validationWarnings: string[] = [];
      
      // Check for duplicates
      const duplicateCheck = duplicateResults.get(i);
      if (duplicateCheck && duplicateCheck.isDuplicate) {
        if (duplicateCheck.duplicateType === 'exact') {
          validationErrors.push(`중복 항목: 행 ${duplicateCheck.matches[0].rowIndex + 1}과 동일`);
        } else if (duplicateCheck.duplicateType === 'similar') {
          validationWarnings.push(
            `유사 항목 발견 (${duplicateCheck.confidence}% 일치): ` +
            `행 ${duplicateCheck.matches[0].rowIndex + 1}`
          );
        }
        
        // Add merge strategy suggestion
        if (duplicateCheck.mergeStrategy) {
          validationWarnings.push(`추천: ${duplicateCheck.mergeStrategy.reason}`);
        }
      }

      // Required field validation
      if (!row.projectName) validationErrors.push('프로젝트명 필수');
      if (!row.vendorName) validationErrors.push('거래처명 필수');
      if (!row.itemName) validationErrors.push('품목명 필수');
      if (!row.quantity || row.quantity <= 0) validationErrors.push('수량 필수');
      if (!row.unitPrice || row.unitPrice <= 0) validationErrors.push('단가 필수');

      // Email validation
      if (row.vendorEmail && !this.isValidEmail(row.vendorEmail)) {
        validationWarnings.push('이메일 형식 확인 필요');
      }

      // Date validation
      if (row.deliveryDate && !this.isValidDate(row.deliveryDate)) {
        validationWarnings.push('날짜 형식 확인 필요');
      }

      // Auto-calculate total amount if missing
      if (!row.totalAmount && row.quantity && row.unitPrice) {
        row.totalAmount = row.quantity * row.unitPrice;
      }

      // Category validation and auto-mapping
      if (!row.majorCategory || !row.middleCategory || !row.minorCategory) {
        const mappedCategories = await this.categoryMappingService.suggestCategories(row.itemName || '');
        if (mappedCategories) {
          row.majorCategory = row.majorCategory || mappedCategories.major;
          row.middleCategory = row.middleCategory || mappedCategories.middle;
          row.minorCategory = row.minorCategory || mappedCategories.minor;
          validationWarnings.push('카테고리 자동 매핑됨');
        } else {
          validationWarnings.push('카테고리 확인 필요');
        }
      }

      // Vendor validation
      const vendorValidation = await this.vendorValidationService.validateVendor(row.vendorName || '');
      if (!vendorValidation.isValid) {
        if (vendorValidation.suggestions && vendorValidation.suggestions.length > 0) {
          validationWarnings.push(`유사 거래처 발견: ${vendorValidation.suggestions[0].name}`);
        } else {
          validationWarnings.push('신규 거래처 등록 필요');
        }
      }

      // Determine validation status
      let status: 'valid' | 'warning' | 'error' = 'valid';
      if (validationErrors.length > 0) {
        status = 'error';
        errorItems++;
      } else if (validationWarnings.length > 0) {
        status = 'warning';
        warningItems++;
      } else {
        validItems++;
      }

      // Store validation results for each field
      const fieldsToValidate = [
        'projectName', 'vendorName', 'vendorEmail', 'itemName', 
        'quantity', 'unitPrice', 'majorCategory'
      ];

      for (const field of fieldsToValidate) {
        validationResultsToInsert.push({
          sessionId,
          rowIndex: row.rowIndex,
          fieldName: field,
          originalValue: String(row[field as keyof ParsedRow] || ''),
          validatedValue: String(row[field as keyof ParsedRow] || ''),
          validationStatus: status,
          errorMessage: validationErrors.join(', ') || null,
          suggestion: validationWarnings.join(', ') || null,
          confidence: status === 'valid' ? 100 : status === 'warning' ? 75 : 0,
          metadata: duplicateCheck ? {
            isDuplicate: duplicateCheck.isDuplicate,
            duplicateType: duplicateCheck.duplicateType,
            duplicateMatches: duplicateCheck.matches,
            mergeStrategy: duplicateCheck.mergeStrategy
          } : null,
        });
      }

      // Emit progress update
      if (i % 10 === 0 || i === rows.length - 1) {
        this.wsService.emitToUser(userId, 'validation:progress', {
          sessionId,
          current: i + 1,
          total: rows.length,
          validItems,
          warningItems,
          errorItems,
        });
      }
    }

    // Batch insert validation results
    if (validationResultsToInsert.length > 0) {
      await db.insert(validationResults).values(validationResultsToInsert);
    }

    return {
      totalItems: rows.length,
      validItems,
      warningItems,
      errorItems,
      parsedData: rows,
    };
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate date format
   */
  private isValidDate(dateStr: string): boolean {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }

  /**
   * Finalize session and create purchase orders
   */
  async finalizeSession(sessionId: string, userId: number): Promise<{ ordersCreated: number; totalAmount: number }> {
    // Get session data
    const session = await db.query.validationSessions.findFirst({
      where: and(
        eq(validationSessions.id, sessionId),
        eq(validationSessions.userId, userId)
      ),
      with: {
        results: true,
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Get validated data
    const validatedData = await this.getValidatedData(sessionId);

    // Group by project and vendor
    const groupedOrders = this.groupByProjectAndVendor(validatedData);

    let ordersCreated = 0;
    let totalAmount = 0;

    // Create purchase orders
    for (const group of groupedOrders) {
      const order = await db.insert(purchaseOrders).values({
        orderNumber: this.generateOrderNumber(),
        projectId: group.projectId,
        vendorId: group.vendorId,
        orderDate: new Date(),
        deliveryDate: group.deliveryDate,
        status: 'draft',
        totalAmount: String(group.totalAmount),
        notes: group.notes,
        createdBy: userId,
        updatedBy: userId,
      }).returning();

      // Create order items
      for (const item of group.items) {
        await db.insert(purchaseOrderItems).values({
          orderId: order[0].id,
          itemId: item.itemId,
          specification: item.specification,
          unit: item.unit,
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice),
          totalAmount: String(item.totalAmount),
          notes: item.notes,
        });
      }

      ordersCreated++;
      totalAmount += group.totalAmount;
    }

    return { ordersCreated, totalAmount };
  }

  /**
   * Get validated data from session
   */
  private async getValidatedData(sessionId: string): Promise<any[]> {
    const results = await db.query.validationResults.findMany({
      where: eq(validationResults.sessionId, sessionId),
    });

    // Group results by row index
    const groupedByRow = new Map<number, any>();
    
    for (const result of results) {
      if (!groupedByRow.has(result.rowIndex)) {
        groupedByRow.set(result.rowIndex, {});
      }
      
      const row = groupedByRow.get(result.rowIndex);
      if (result.fieldName) {
        row[result.fieldName] = result.validatedValue || result.originalValue;
      }
    }

    return Array.from(groupedByRow.values());
  }

  /**
   * Group validated data by project and vendor
   */
  private groupByProjectAndVendor(data: any[]): any[] {
    const groups = new Map<string, any>();

    for (const row of data) {
      const key = `${row.projectName}-${row.vendorName}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          projectId: 1, // TODO: Resolve actual project ID
          vendorId: 1, // TODO: Resolve actual vendor ID
          deliveryDate: row.deliveryDate ? new Date(row.deliveryDate) : null,
          totalAmount: 0,
          notes: row.notes,
          items: [],
        });
      }

      const group = groups.get(key);
      group.items.push({
        itemId: 1, // TODO: Resolve actual item ID
        specification: row.specification,
        unit: row.unit,
        quantity: row.quantity || 0,
        unitPrice: row.unitPrice || 0,
        totalAmount: row.totalAmount || (row.quantity * row.unitPrice) || 0,
        notes: row.notes,
      });
      
      group.totalAmount += row.totalAmount || 0;
    }

    return Array.from(groups.values());
  }

  /**
   * Generate order number
   */
  private generateOrderNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PO-${year}${month}${day}-${random}`;
  }

  /**
   * Cleanup session and related data
   */
  async cleanupSession(sessionId: string, userId: number): Promise<void> {
    // Verify ownership
    const session = await db.query.validationSessions.findFirst({
      where: and(
        eq(validationSessions.id, sessionId),
        eq(validationSessions.userId, userId)
      ),
    });

    if (!session) {
      throw new Error('Session not found or unauthorized');
    }

    // Delete related data
    await db.delete(validationResults).where(eq(validationResults.sessionId, sessionId));
    
    // Delete session
    await db.delete(validationSessions).where(eq(validationSessions.id, sessionId));
  }
}