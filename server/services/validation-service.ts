import { db } from '../db';
import { 
  validationResults, 
  validationSessions,
  ValidationResult 
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';

interface ValidationError {
  rowIndex: number;
  field: string;
  originalValue: any;
  errorMessage: string;
  validationStatus: 'error' | 'warning';
}

interface CorrectionData {
  rowIndex: number;
  field: string;
  value: any;
}

interface ValidationSummary {
  validItems: number;
  warningItems: number;
  errorItems: number;
}

export class ValidationService {
  /**
   * Apply corrections to validation results
   */
  async applyCorrections(
    sessionId: string,
    corrections: CorrectionData[],
    userId: number
  ): Promise<ValidationSummary> {
    // Verify session ownership
    const session = await db.query.validationSessions.findFirst({
      where: and(
        eq(validationSessions.id, sessionId),
        eq(validationSessions.userId, userId)
      ),
    });

    if (!session) {
      throw new Error('Session not found or unauthorized');
    }

    // Apply each correction
    for (const correction of corrections) {
      await db.update(validationResults)
        .set({
          validatedValue: String(correction.value),
          validationStatus: 'valid',
          errorMessage: null,
          confidence: 100,
        })
        .where(and(
          eq(validationResults.sessionId, sessionId),
          eq(validationResults.rowIndex, correction.rowIndex),
          eq(validationResults.fieldName, correction.field)
        ));
    }

    // Recalculate summary
    return this.calculateValidationSummary(sessionId);
  }

  /**
   * Get session errors for AI processing
   */
  async getSessionErrors(sessionId: string, userId: number): Promise<ValidationError[]> {
    // Verify session ownership
    const session = await db.query.validationSessions.findFirst({
      where: and(
        eq(validationSessions.id, sessionId),
        eq(validationSessions.userId, userId)
      ),
    });

    if (!session) {
      throw new Error('Session not found or unauthorized');
    }

    // Get all errors and warnings
    const results = await db.query.validationResults.findMany({
      where: and(
        eq(validationResults.sessionId, sessionId),
      ),
    });

    const errors: ValidationError[] = [];
    
    for (const result of results) {
      if (result.validationStatus === 'error' || result.validationStatus === 'warning') {
        errors.push({
          rowIndex: result.rowIndex,
          field: result.fieldName || '',
          originalValue: result.originalValue,
          errorMessage: result.errorMessage || result.suggestion || '',
          validationStatus: result.validationStatus as 'error' | 'warning',
        });
      }
    }

    return errors;
  }

  /**
   * Calculate validation summary for a session
   */
  async calculateValidationSummary(sessionId: string): Promise<ValidationSummary> {
    const results = await db.query.validationResults.findMany({
      where: eq(validationResults.sessionId, sessionId),
    });

    // Group by row to count unique items
    const rowStatuses = new Map<number, string>();
    
    for (const result of results) {
      const currentStatus = rowStatuses.get(result.rowIndex);
      
      // Prioritize error > warning > valid
      if (result.validationStatus === 'error') {
        rowStatuses.set(result.rowIndex, 'error');
      } else if (result.validationStatus === 'warning' && currentStatus !== 'error') {
        rowStatuses.set(result.rowIndex, 'warning');
      } else if (!currentStatus) {
        rowStatuses.set(result.rowIndex, 'valid');
      }
    }

    let validItems = 0;
    let warningItems = 0;
    let errorItems = 0;

    for (const status of rowStatuses.values()) {
      switch (status) {
        case 'valid':
          validItems++;
          break;
        case 'warning':
          warningItems++;
          break;
        case 'error':
          errorItems++;
          break;
      }
    }

    // Update session summary
    await db.update(validationSessions)
      .set({
        validItems,
        warningItems,
        errorItems,
      })
      .where(eq(validationSessions.id, sessionId));

    return { validItems, warningItems, errorItems };
  }

  /**
   * Validate email format
   */
  validateEmail(email: string): { isValid: boolean; suggestion?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (emailRegex.test(email)) {
      return { isValid: true };
    }

    // Try to fix common email issues
    let suggestion = email.trim().toLowerCase();
    
    // Add missing @ symbol
    if (!suggestion.includes('@') && suggestion.includes('.')) {
      const parts = suggestion.split('.');
      if (parts.length >= 2) {
        const lastDot = suggestion.lastIndexOf('.');
        suggestion = suggestion.substring(0, lastDot).replace('.', '@') + suggestion.substring(lastDot);
      }
    }

    // Add missing domain extension
    if (suggestion.includes('@') && !suggestion.includes('.', suggestion.indexOf('@'))) {
      suggestion += '.com';
    }

    return {
      isValid: false,
      suggestion: emailRegex.test(suggestion) ? suggestion : undefined,
    };
  }

  /**
   * Validate date format and convert to standard format
   */
  validateDate(dateStr: string): { isValid: boolean; standardized?: string } {
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
      /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
      /^\d{8}$/, // YYYYMMDD
    ];

    // Try parsing with different formats
    let parsedDate: Date | null = null;
    
    // Direct parse attempt
    const directParse = new Date(dateStr);
    if (!isNaN(directParse.getTime())) {
      parsedDate = directParse;
    }

    // Try YYYYMMDD format
    if (!parsedDate && /^\d{8}$/.test(dateStr)) {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      parsedDate = new Date(`${year}-${month}-${day}`);
    }

    // Try DD/MM/YYYY or DD-MM-YYYY format
    if (!parsedDate && /^\d{2}[/-]\d{2}[/-]\d{4}$/.test(dateStr)) {
      const parts = dateStr.split(/[/-]/);
      parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }

    if (parsedDate && !isNaN(parsedDate.getTime())) {
      // Return standardized format (YYYY-MM-DD)
      const year = parsedDate.getFullYear();
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const day = String(parsedDate.getDate()).padStart(2, '0');
      
      return {
        isValid: true,
        standardized: `${year}-${month}-${day}`,
      };
    }

    return { isValid: false };
  }

  /**
   * Validate numeric values
   */
  validateNumeric(value: any, minValue?: number, maxValue?: number): { 
    isValid: boolean; 
    parsed?: number; 
    error?: string;
  } {
    // Try to parse the value
    let parsed: number;
    
    if (typeof value === 'number') {
      parsed = value;
    } else if (typeof value === 'string') {
      // Remove common formatting characters
      const cleaned = value.replace(/[,\s₩$]/g, '');
      parsed = parseFloat(cleaned);
    } else {
      return { isValid: false, error: 'Invalid type' };
    }

    if (isNaN(parsed)) {
      return { isValid: false, error: 'Not a valid number' };
    }

    if (minValue !== undefined && parsed < minValue) {
      return { isValid: false, parsed, error: `Value must be at least ${minValue}` };
    }

    if (maxValue !== undefined && parsed > maxValue) {
      return { isValid: false, parsed, error: `Value must be at most ${maxValue}` };
    }

    return { isValid: true, parsed };
  }

  /**
   * Validate required fields
   */
  validateRequired(value: any, fieldName: string): { isValid: boolean; error?: string } {
    if (value === null || value === undefined || value === '' || 
        (typeof value === 'string' && value.trim() === '')) {
      return { isValid: false, error: `${fieldName} is required` };
    }
    return { isValid: true };
  }

  /**
   * Check for duplicate entries
   */
  async checkDuplicates(sessionId: string, field: string, value: any): Promise<{
    hasDuplicates: boolean;
    duplicateRows: number[];
  }> {
    const results = await db.query.validationResults.findMany({
      where: and(
        eq(validationResults.sessionId, sessionId),
        eq(validationResults.fieldName, field),
        eq(validationResults.originalValue, String(value))
      ),
    });

    const duplicateRows = results.map(r => r.rowIndex);
    
    return {
      hasDuplicates: duplicateRows.length > 1,
      duplicateRows: duplicateRows.length > 1 ? duplicateRows : [],
    };
  }

  /**
   * Batch validate multiple fields
   */
  async batchValidate(sessionId: string, rows: any[]): Promise<ValidationResult[]> {
    const validationResults: ValidationResult[] = [];

    for (const row of rows) {
      // Validate each field
      const fieldValidations = [
        { field: 'projectName', validation: this.validateRequired(row.projectName, '프로젝트명') },
        { field: 'vendorName', validation: this.validateRequired(row.vendorName, '거래처명') },
        { field: 'vendorEmail', validation: this.validateEmail(row.vendorEmail) },
        { field: 'deliveryDate', validation: this.validateDate(row.deliveryDate) },
        { field: 'quantity', validation: this.validateNumeric(row.quantity, 0) },
        { field: 'unitPrice', validation: this.validateNumeric(row.unitPrice, 0) },
      ];

      for (const { field, validation } of fieldValidations) {
        const status = validation.isValid ? 'valid' : 'error';
        
        validationResults.push({
          id: 0, // Will be set by database
          sessionId,
          rowIndex: row.rowIndex,
          fieldName: field,
          originalValue: String(row[field] || ''),
          validatedValue: validation.isValid ? String(row[field]) : null,
          validationStatus: status,
          errorMessage: validation.error || validation.suggestion || null,
          suggestion: null,
          confidence: validation.isValid ? 100 : 0,
          metadata: null,
          createdAt: new Date(),
        } as ValidationResult);
      }
    }

    return validationResults;
  }
}