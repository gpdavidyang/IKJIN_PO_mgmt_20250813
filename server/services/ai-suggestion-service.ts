import { db } from '../db';
import { 
  aiSuggestions,
  validationResults,
  AISuggestion,
  InsertAISuggestion
} from '@shared/schema';
import { eq } from 'drizzle-orm';
import { CategoryMappingService } from './category-mapping-service';
import { VendorValidationService } from './vendor-validation-service';
import { ValidationService } from './validation-service';

interface ValidationError {
  rowIndex: number;
  field: string;
  originalValue: any;
  errorMessage: string;
  validationStatus: 'error' | 'warning';
}

interface SuggestionOptions {
  includeCategories?: boolean;
  includeVendors?: boolean;
  includeEmails?: boolean;
  confidenceThreshold?: number;
}

interface GeneratedSuggestion {
  rowIndex: number;
  fieldName: string;
  originalValue: string;
  suggestedValue: string;
  suggestionType: 'vendor' | 'email' | 'category' | 'date' | 'duplicate';
  confidence: number;
  reason: string;
}

export class AISuggestionService {
  private categoryService: CategoryMappingService;
  private vendorService: VendorValidationService;
  private validationService: ValidationService;

  constructor() {
    this.categoryService = new CategoryMappingService();
    this.vendorService = new VendorValidationService();
    this.validationService = new ValidationService();
  }

  /**
   * Generate AI suggestions for validation errors
   */
  async generateSuggestions(
    errors: ValidationError[],
    options: SuggestionOptions = {}
  ): Promise<GeneratedSuggestion[]> {
    const {
      includeCategories = true,
      includeVendors = true,
      includeEmails = true,
      confidenceThreshold = 60,
    } = options;

    const suggestions: GeneratedSuggestion[] = [];

    for (const error of errors) {
      // Generate suggestions based on field type
      switch (error.field.toLowerCase()) {
        case 'vendorname':
        case 'vendor':
        case '거래처':
        case '거래처명':
          if (includeVendors) {
            const vendorSuggestion = await this.generateVendorSuggestion(error);
            if (vendorSuggestion && vendorSuggestion.confidence >= confidenceThreshold) {
              suggestions.push(vendorSuggestion);
            }
          }
          break;

        case 'vendoremail':
        case 'email':
        case '이메일':
        case '거래처이메일':
          if (includeEmails) {
            const emailSuggestion = this.generateEmailSuggestion(error);
            if (emailSuggestion && emailSuggestion.confidence >= confidenceThreshold) {
              suggestions.push(emailSuggestion);
            }
          }
          break;

        case 'majorcategory':
        case 'middlecategory':
        case 'minorcategory':
        case '대분류':
        case '중분류':
        case '소분류':
          if (includeCategories) {
            const categorySuggestion = await this.generateCategorySuggestion(error);
            if (categorySuggestion && categorySuggestion.confidence >= confidenceThreshold) {
              suggestions.push(categorySuggestion);
            }
          }
          break;

        case 'deliverydate':
        case '납기':
        case '납기일':
          const dateSuggestion = this.generateDateSuggestion(error);
          if (dateSuggestion && dateSuggestion.confidence >= confidenceThreshold) {
            suggestions.push(dateSuggestion);
          }
          break;

        case 'quantity':
        case '수량':
        case 'unitprice':
        case '단가':
        case 'totalamount':
        case '금액':
          const numericSuggestion = this.generateNumericSuggestion(error);
          if (numericSuggestion && numericSuggestion.confidence >= confidenceThreshold) {
            suggestions.push(numericSuggestion);
          }
          break;
      }
    }

    // Use advanced AI if available (placeholder for OpenAI integration)
    if (process.env.OPENAI_API_KEY) {
      const aiEnhancedSuggestions = await this.enhanceWithOpenAI(errors, suggestions);
      return aiEnhancedSuggestions;
    }

    return suggestions;
  }

  /**
   * Generate vendor name suggestion
   */
  private async generateVendorSuggestion(error: ValidationError): Promise<GeneratedSuggestion | null> {
    const result = await this.vendorService.validateVendor(error.originalValue);
    
    if (result.suggestions && result.suggestions.length > 0) {
      const topSuggestion = result.suggestions[0];
      return {
        rowIndex: error.rowIndex,
        fieldName: error.field,
        originalValue: error.originalValue,
        suggestedValue: topSuggestion.name,
        suggestionType: 'vendor',
        confidence: topSuggestion.similarity,
        reason: `유사 거래처 발견 (${topSuggestion.similarity}% 일치)`,
      };
    }

    return null;
  }

  /**
   * Generate email suggestion
   */
  private generateEmailSuggestion(error: ValidationError): GeneratedSuggestion | null {
    const result = this.validationService.validateEmail(error.originalValue);
    
    if (result.suggestion) {
      return {
        rowIndex: error.rowIndex,
        fieldName: error.field,
        originalValue: error.originalValue,
        suggestedValue: result.suggestion,
        suggestionType: 'email',
        confidence: 85,
        reason: '이메일 형식 자동 수정',
      };
    }

    // Try to fix common email patterns
    const emailPatterns = this.fixCommonEmailPatterns(error.originalValue);
    if (emailPatterns) {
      return {
        rowIndex: error.rowIndex,
        fieldName: error.field,
        originalValue: error.originalValue,
        suggestedValue: emailPatterns,
        suggestionType: 'email',
        confidence: 75,
        reason: '일반적인 이메일 패턴 적용',
      };
    }

    return null;
  }

  /**
   * Fix common email patterns
   */
  private fixCommonEmailPatterns(email: string): string | null {
    let fixed = email.trim().toLowerCase();

    // Common fixes
    const fixes = [
      { pattern: /^([^@]+)at([^@]+)\.(.+)$/, replacement: '$1@$2.$3' },
      { pattern: /^([^@]+)@([^.]+)$/, replacement: '$1@$2.com' },
      { pattern: /^([^@]+)\s+([^@]+)@(.+)$/, replacement: '$2@$3' },
      { pattern: /^([^@]+)@([^@]+)\s+\.(.+)$/, replacement: '$1@$2.$3' },
    ];

    for (const fix of fixes) {
      if (fix.pattern.test(fixed)) {
        fixed = fixed.replace(fix.pattern, fix.replacement);
        const validation = this.validationService.validateEmail(fixed);
        if (validation.isValid) {
          return fixed;
        }
      }
    }

    return null;
  }

  /**
   * Generate category suggestion
   */
  private async generateCategorySuggestion(error: ValidationError): Promise<GeneratedSuggestion | null> {
    // Need item name context for category suggestion
    // This would typically come from the same row data
    const itemName = error.originalValue; // Assuming the error contains item name
    
    const suggestion = await this.categoryService.suggestCategories(itemName);
    
    if (suggestion) {
      return {
        rowIndex: error.rowIndex,
        fieldName: error.field,
        originalValue: error.originalValue,
        suggestedValue: `${suggestion.major}/${suggestion.middle}/${suggestion.minor}`,
        suggestionType: 'category',
        confidence: suggestion.confidence,
        reason: '카테고리 자동 분류',
      };
    }

    return null;
  }

  /**
   * Generate date suggestion
   */
  private generateDateSuggestion(error: ValidationError): GeneratedSuggestion | null {
    const result = this.validationService.validateDate(error.originalValue);
    
    if (result.standardized) {
      return {
        rowIndex: error.rowIndex,
        fieldName: error.field,
        originalValue: error.originalValue,
        suggestedValue: result.standardized,
        suggestionType: 'date',
        confidence: 90,
        reason: '날짜 형식 표준화',
      };
    }

    // Try to infer date from context
    const inferredDate = this.inferDateFromContext(error.originalValue);
    if (inferredDate) {
      return {
        rowIndex: error.rowIndex,
        fieldName: error.field,
        originalValue: error.originalValue,
        suggestedValue: inferredDate,
        suggestionType: 'date',
        confidence: 70,
        reason: '날짜 추론',
      };
    }

    return null;
  }

  /**
   * Infer date from context
   */
  private inferDateFromContext(dateStr: string): string | null {
    const today = new Date();
    const patterns = [
      { pattern: /오늘|today/i, days: 0 },
      { pattern: /내일|tomorrow/i, days: 1 },
      { pattern: /모레|day after tomorrow/i, days: 2 },
      { pattern: /다음주|next week/i, days: 7 },
      { pattern: /다음달|next month/i, days: 30 },
    ];

    for (const { pattern, days } of patterns) {
      if (pattern.test(dateStr)) {
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + days);
        return futureDate.toISOString().split('T')[0];
      }
    }

    return null;
  }

  /**
   * Generate numeric suggestion
   */
  private generateNumericSuggestion(error: ValidationError): GeneratedSuggestion | null {
    const result = this.validationService.validateNumeric(error.originalValue);
    
    if (result.parsed !== undefined) {
      return {
        rowIndex: error.rowIndex,
        fieldName: error.field,
        originalValue: error.originalValue,
        suggestedValue: String(result.parsed),
        suggestionType: 'duplicate', // Using 'duplicate' as generic type
        confidence: 95,
        reason: '숫자 형식 정규화',
      };
    }

    return null;
  }

  /**
   * Enhance suggestions with OpenAI (placeholder)
   */
  private async enhanceWithOpenAI(
    errors: ValidationError[],
    basicSuggestions: GeneratedSuggestion[]
  ): Promise<GeneratedSuggestion[]> {
    // This is a placeholder for OpenAI integration
    // In production, this would call the OpenAI API to get more sophisticated suggestions
    
    // For now, return basic suggestions with boosted confidence
    return basicSuggestions.map(suggestion => ({
      ...suggestion,
      confidence: Math.min(suggestion.confidence + 10, 100),
      reason: `${suggestion.reason} (AI 검증됨)`,
    }));
  }

  /**
   * Store suggestions in database
   */
  async storeSuggestions(
    sessionId: string,
    suggestions: GeneratedSuggestion[]
  ): Promise<void> {
    const suggestionsToInsert: InsertAISuggestion[] = suggestions.map(suggestion => ({
      sessionId,
      rowIndex: suggestion.rowIndex,
      fieldName: suggestion.fieldName,
      originalValue: suggestion.originalValue,
      suggestedValue: suggestion.suggestedValue,
      suggestionType: suggestion.suggestionType,
      confidence: suggestion.confidence.toString(),
      reason: suggestion.reason,
      applied: false,
    }));

    if (suggestionsToInsert.length > 0) {
      await db.insert(aiSuggestions).values(suggestionsToInsert);
    }
  }

  /**
   * Apply suggestions to validation results
   */
  async applySuggestions(
    sessionId: string,
    suggestionIds: number[],
    userId: number
  ): Promise<{ applied: number; failed: number }> {
    let applied = 0;
    let failed = 0;

    for (const id of suggestionIds) {
      try {
        // Get suggestion
        const suggestion = await db.query.aiSuggestions.findFirst({
          where: eq(aiSuggestions.id, id),
        });

        if (!suggestion || suggestion.sessionId !== sessionId) {
          failed++;
          continue;
        }

        // Update validation result
        await db.update(validationResults)
          .set({
            validatedValue: suggestion.suggestedValue,
            validationStatus: 'valid',
            errorMessage: null,
            suggestion: `Applied: ${suggestion.reason}`,
            confidence: suggestion.confidence,
          })
          .where(eq(validationResults.sessionId, sessionId))
          .where(eq(validationResults.rowIndex, suggestion.rowIndex))
          .where(eq(validationResults.fieldName, suggestion.fieldName));

        // Mark suggestion as applied
        await db.update(aiSuggestions)
          .set({
            applied: true,
            appliedAt: new Date(),
            appliedBy: userId,
          })
          .where(eq(aiSuggestions.id, id));

        applied++;
      } catch (error) {
        console.error(`Failed to apply suggestion ${id}:`, error);
        failed++;
      }
    }

    return { applied, failed };
  }

  /**
   * Get suggestions for a session
   */
  async getSessionSuggestions(sessionId: string): Promise<AISuggestion[]> {
    return db.query.aiSuggestions.findMany({
      where: eq(aiSuggestions.sessionId, sessionId),
    });
  }

  /**
   * Clear session suggestions
   */
  async clearSessionSuggestions(sessionId: string): Promise<void> {
    await db.delete(aiSuggestions).where(eq(aiSuggestions.sessionId, sessionId));
  }
}