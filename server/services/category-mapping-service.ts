import { db } from '../db';
import { 
  categoryMappings, 
  itemCategories,
  CategoryMapping 
} from '@shared/schema';
import { eq, and, desc, like, sql } from 'drizzle-orm';

interface CategorySuggestion {
  major: string;
  middle: string;
  minor: string;
  confidence: number;
}

export class CategoryMappingService {
  private cache: Map<string, CategorySuggestion> = new Map();

  /**
   * Suggest categories based on item name
   */
  async suggestCategories(itemName: string): Promise<CategorySuggestion | null> {
    if (!itemName || itemName.trim().length === 0) {
      return null;
    }

    const normalizedName = this.normalizeItemName(itemName);

    // Check cache first
    if (this.cache.has(normalizedName)) {
      return this.cache.get(normalizedName)!;
    }

    // Look for existing mappings
    const existingMapping = await this.findExistingMapping(normalizedName);
    if (existingMapping) {
      const suggestion = {
        major: existingMapping.majorCategory || '',
        middle: existingMapping.middleCategory || '',
        minor: existingMapping.minorCategory || '',
        confidence: Number(existingMapping.confidence),
      };
      
      // Update usage count
      await this.updateUsageCount(existingMapping.id);
      
      // Cache the result
      this.cache.set(normalizedName, suggestion);
      return suggestion;
    }

    // Try pattern matching
    const patternMatch = await this.findByPattern(itemName);
    if (patternMatch) {
      // Cache the result
      this.cache.set(normalizedName, patternMatch);
      return patternMatch;
    }

    // Try rule-based mapping
    const ruleBasedMatch = this.applyRuleBasedMapping(itemName);
    if (ruleBasedMatch) {
      // Store new mapping for future use
      await this.storeMapping(itemName, ruleBasedMatch);
      
      // Cache the result
      this.cache.set(normalizedName, ruleBasedMatch);
      return ruleBasedMatch;
    }

    return null;
  }

  /**
   * Find existing mapping for item name
   */
  private async findExistingMapping(itemName: string): Promise<CategoryMapping | null> {
    const mapping = await db.query.categoryMappings.findFirst({
      where: eq(categoryMappings.itemName, itemName),
      orderBy: [desc(categoryMappings.confidence), desc(categoryMappings.usageCount)],
    });

    return mapping || null;
  }

  /**
   * Find categories by pattern matching
   */
  private async findByPattern(itemName: string): Promise<CategorySuggestion | null> {
    // Search for similar item names
    const similarMappings = await db.query.categoryMappings.findMany({
      where: like(categoryMappings.itemName, `%${itemName}%`),
      orderBy: [desc(categoryMappings.confidence), desc(categoryMappings.usageCount)],
      limit: 5,
    });

    if (similarMappings.length === 0) {
      return null;
    }

    // Calculate weighted average based on similarity and confidence
    const suggestions: CategorySuggestion[] = similarMappings.map(mapping => ({
      major: mapping.majorCategory || '',
      middle: mapping.middleCategory || '',
      minor: mapping.minorCategory || '',
      confidence: this.calculateSimilarity(itemName, mapping.itemName) * Number(mapping.confidence),
    }));

    // Return the best match
    suggestions.sort((a, b) => b.confidence - a.confidence);
    return suggestions[0];
  }

  /**
   * Apply rule-based mapping
   */
  private applyRuleBasedMapping(itemName: string): CategorySuggestion | null {
    const lowerName = itemName.toLowerCase();
    
    // Construction materials
    if (this.containsAny(lowerName, ['철근', '철골', 'h빔', 'h-beam', 'steel'])) {
      return { major: '건축자재', middle: '철골', minor: '구조재', confidence: 85 };
    }
    
    if (this.containsAny(lowerName, ['시멘트', 'cement', '콘크리트', 'concrete'])) {
      return { major: '건축자재', middle: '콘크리트', minor: '시멘트', confidence: 85 };
    }
    
    if (this.containsAny(lowerName, ['벽돌', 'brick', '블록', 'block'])) {
      return { major: '건축자재', middle: '조적', minor: '벽돌', confidence: 85 };
    }

    // Electrical
    if (this.containsAny(lowerName, ['전선', 'cable', '케이블', 'wire'])) {
      return { major: '전기자재', middle: '전선', minor: '일반전선', confidence: 80 };
    }
    
    if (this.containsAny(lowerName, ['스위치', 'switch', '콘센트', 'outlet'])) {
      return { major: '전기자재', middle: '배선기구', minor: '스위치', confidence: 80 };
    }

    // Plumbing
    if (this.containsAny(lowerName, ['파이프', 'pipe', '배관'])) {
      return { major: '설비자재', middle: '배관', minor: '일반배관', confidence: 80 };
    }
    
    if (this.containsAny(lowerName, ['밸브', 'valve', '벨브'])) {
      return { major: '설비자재', middle: '배관', minor: '밸브', confidence: 80 };
    }

    // Interior
    if (this.containsAny(lowerName, ['도배', '벽지', 'wallpaper'])) {
      return { major: '인테리어', middle: '벽지', minor: '일반벽지', confidence: 75 };
    }
    
    if (this.containsAny(lowerName, ['타일', 'tile'])) {
      return { major: '인테리어', middle: '바닥재', minor: '타일', confidence: 75 };
    }

    // Safety equipment
    if (this.containsAny(lowerName, ['안전모', '헬멧', 'helmet', '안전'])) {
      return { major: '안전장비', middle: '보호구', minor: '머리보호', confidence: 70 };
    }

    // Tools
    if (this.containsAny(lowerName, ['드릴', 'drill', '공구', 'tool'])) {
      return { major: '공구', middle: '전동공구', minor: '드릴', confidence: 70 };
    }

    // Default fallback
    return null;
  }

  /**
   * Check if text contains any of the keywords
   */
  private containsAny(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  /**
   * Calculate similarity between two strings (Levenshtein distance based)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) {
      return 1.0;
    }
    
    const distance = this.levenshteinDistance(longer, shorter);
    return ((longer.length - distance) / longer.length) * 100;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Normalize item name for comparison
   */
  private normalizeItemName(itemName: string): string {
    return itemName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s가-힣]/g, '');
  }

  /**
   * Update usage count for a mapping
   */
  private async updateUsageCount(mappingId: number): Promise<void> {
    await db.update(categoryMappings)
      .set({
        usageCount: sql`${categoryMappings.usageCount} + 1`,
        lastUsedAt: new Date(),
      })
      .where(eq(categoryMappings.id, mappingId));
  }

  /**
   * Store new mapping for future use
   */
  async storeMapping(
    itemName: string,
    suggestion: CategorySuggestion,
    userId?: number
  ): Promise<void> {
    const normalizedName = this.normalizeItemName(itemName);
    
    // Check if mapping already exists
    const existing = await this.findExistingMapping(normalizedName);
    if (existing) {
      // Update existing mapping if new confidence is higher
      if (suggestion.confidence > Number(existing.confidence)) {
        await db.update(categoryMappings)
          .set({
            majorCategory: suggestion.major,
            middleCategory: suggestion.middle,
            minorCategory: suggestion.minor,
            confidence: suggestion.confidence.toString(),
            lastUsedAt: new Date(),
          })
          .where(eq(categoryMappings.id, existing.id));
      }
      return;
    }

    // Insert new mapping
    await db.insert(categoryMappings).values({
      itemName: normalizedName,
      majorCategory: suggestion.major,
      middleCategory: suggestion.middle,
      minorCategory: suggestion.minor,
      confidence: suggestion.confidence.toString(),
      usageCount: 1,
      createdBy: userId,
    });
  }

  /**
   * Get all available categories from the database
   */
  async getAllCategories(): Promise<{
    major: string[];
    middle: Map<string, string[]>;
    minor: Map<string, string[]>;
  }> {
    const categories = await db.query.itemCategories.findMany({
      where: eq(itemCategories.isActive, true),
      orderBy: [itemCategories.displayOrder],
    });

    const result = {
      major: [] as string[],
      middle: new Map<string, string[]>(),
      minor: new Map<string, string[]>(),
    };

    for (const cat of categories) {
      if (cat.categoryType === 'major') {
        result.major.push(cat.categoryName);
      } else if (cat.categoryType === 'middle' && cat.parentId) {
        const parent = categories.find(c => c.id === cat.parentId);
        if (parent) {
          const key = parent.categoryName;
          if (!result.middle.has(key)) {
            result.middle.set(key, []);
          }
          result.middle.get(key)!.push(cat.categoryName);
        }
      } else if (cat.categoryType === 'minor' && cat.parentId) {
        const parent = categories.find(c => c.id === cat.parentId);
        if (parent) {
          const key = parent.categoryName;
          if (!result.minor.has(key)) {
            result.minor.set(key, []);
          }
          result.minor.get(key)!.push(cat.categoryName);
        }
      }
    }

    return result;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Learn from user corrections
   */
  async learnFromCorrection(
    itemName: string,
    correctedCategories: CategorySuggestion,
    userId?: number
  ): Promise<void> {
    // Store the correction with high confidence
    const enhancedSuggestion = {
      ...correctedCategories,
      confidence: Math.min(correctedCategories.confidence + 10, 100), // Boost confidence for user corrections
    };

    await this.storeMapping(itemName, enhancedSuggestion, userId);
    
    // Update cache
    const normalizedName = this.normalizeItemName(itemName);
    this.cache.set(normalizedName, enhancedSuggestion);
  }
}