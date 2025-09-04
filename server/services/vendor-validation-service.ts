import { db } from '../db';
import { 
  vendors, 
  vendorMappings,
  Vendor,
  VendorMapping 
} from '@shared/schema';
import { eq, like, desc, sql, and } from 'drizzle-orm';

interface VendorSuggestion {
  id: number;
  name: string;
  email?: string;
  similarity: number;
}

interface VendorValidationResult {
  isValid: boolean;
  vendorId?: number;
  suggestions?: VendorSuggestion[];
  needsRegistration?: boolean;
}

export class VendorValidationService {
  private cache: Map<string, VendorValidationResult> = new Map();

  /**
   * Validate vendor and provide suggestions
   */
  async validateVendor(vendorName: string): Promise<VendorValidationResult> {
    if (!vendorName || vendorName.trim().length === 0) {
      return { isValid: false, needsRegistration: true };
    }

    const normalizedName = this.normalizeVendorName(vendorName);

    // Check cache
    if (this.cache.has(normalizedName)) {
      return this.cache.get(normalizedName)!;
    }

    // Check for exact match
    const exactMatch = await this.findExactMatch(normalizedName);
    if (exactMatch) {
      const result = {
        isValid: true,
        vendorId: exactMatch.id,
      };
      this.cache.set(normalizedName, result);
      return result;
    }

    // Check mappings
    const mappedVendor = await this.findMappedVendor(normalizedName);
    if (mappedVendor) {
      const result = {
        isValid: true,
        vendorId: mappedVendor.mappedVendorId,
      };
      
      // Update usage count
      await this.updateMappingUsageCount(mappedVendor.id);
      
      this.cache.set(normalizedName, result);
      return result;
    }

    // Find similar vendors
    const suggestions = await this.findSimilarVendors(vendorName);
    
    if (suggestions.length > 0 && suggestions[0].similarity >= 90) {
      // Auto-accept high similarity match
      const result = {
        isValid: true,
        vendorId: suggestions[0].id,
        suggestions: [suggestions[0]],
      };
      
      // Create mapping for future use
      await this.createMapping(vendorName, suggestions[0].id, suggestions[0].name, suggestions[0].similarity);
      
      this.cache.set(normalizedName, result);
      return result;
    }

    // Return suggestions for manual selection
    const result = {
      isValid: false,
      needsRegistration: suggestions.length === 0,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
    
    this.cache.set(normalizedName, result);
    return result;
  }

  /**
   * Find exact match for vendor name
   */
  private async findExactMatch(vendorName: string): Promise<Vendor | null> {
    const vendor = await db.query.vendors.findFirst({
      where: eq(vendors.name, vendorName),
    });

    return vendor || null;
  }

  /**
   * Find mapped vendor from cache
   */
  private async findMappedVendor(vendorName: string): Promise<VendorMapping | null> {
    const mapping = await db.query.vendorMappings.findFirst({
      where: eq(vendorMappings.originalName, vendorName),
      orderBy: [desc(vendorMappings.confidence), desc(vendorMappings.usageCount)],
    });

    return mapping || null;
  }

  /**
   * Find similar vendors using various matching strategies
   */
  private async findSimilarVendors(vendorName: string): Promise<VendorSuggestion[]> {
    const allVendors = await db.query.vendors.findMany({
      where: eq(vendors.isActive, true),
    });

    const suggestions: VendorSuggestion[] = [];

    for (const vendor of allVendors) {
      const similarity = this.calculateSimilarity(vendorName, vendor.name);
      
      if (similarity >= 60) { // Minimum 60% similarity
        suggestions.push({
          id: vendor.id,
          name: vendor.name,
          email: vendor.email || undefined,
          similarity,
        });
      }
    }

    // Also check for partial matches
    const partialMatches = await this.findPartialMatches(vendorName);
    for (const vendor of partialMatches) {
      // Avoid duplicates
      if (!suggestions.some(s => s.id === vendor.id)) {
        suggestions.push({
          id: vendor.id,
          name: vendor.name,
          email: vendor.email || undefined,
          similarity: 70, // Fixed similarity for partial matches
        });
      }
    }

    // Sort by similarity
    suggestions.sort((a, b) => b.similarity - a.similarity);

    // Return top 5 suggestions
    return suggestions.slice(0, 5);
  }

  /**
   * Find vendors with partial name matches
   */
  private async findPartialMatches(vendorName: string): Promise<Vendor[]> {
    const searchTerms = this.extractSearchTerms(vendorName);
    
    if (searchTerms.length === 0) {
      return [];
    }

    // Search for vendors containing any of the search terms
    const vendors = await db.query.vendors.findMany({
      where: and(
        eq(vendors.isActive, true),
        sql`LOWER(${vendors.name}) LIKE LOWER(${'%' + searchTerms[0] + '%'})`
      ),
      limit: 10,
    });

    return vendors;
  }

  /**
   * Extract meaningful search terms from vendor name
   */
  private extractSearchTerms(vendorName: string): string[] {
    // Remove common suffixes
    const cleaned = vendorName
      .replace(/\s*(주식회사|주|유한회사|유|법인|산업|건설|전기|설비|엔지니어링|ENG|Co\.|Ltd\.|Inc\.|Corp\.)\s*/gi, '')
      .trim();

    // Split into words
    const words = cleaned.split(/\s+/);

    // Filter out very short words
    return words.filter(word => word.length >= 2);
  }

  /**
   * Calculate similarity between two vendor names
   */
  private calculateSimilarity(name1: string, name2: string): number {
    const normalized1 = this.normalizeForComparison(name1);
    const normalized2 = this.normalizeForComparison(name2);

    // Check for exact match after normalization
    if (normalized1 === normalized2) {
      return 100;
    }

    // Use multiple similarity metrics
    const levenshteinSim = this.levenshteinSimilarity(normalized1, normalized2);
    const jaroWinklerSim = this.jaroWinklerSimilarity(normalized1, normalized2);
    const tokenSim = this.tokenSimilarity(name1, name2);

    // Weighted average
    return Math.round(
      levenshteinSim * 0.3 +
      jaroWinklerSim * 0.4 +
      tokenSim * 0.3
    );
  }

  /**
   * Normalize vendor name for comparison
   */
  private normalizeForComparison(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s*(주식회사|주|유한회사|유|법인|㈜|\(주\)|\(유\))\s*/g, '')
      .replace(/[^a-z0-9가-힣]/g, '')
      .trim();
  }

  /**
   * Normalize vendor name for storage
   */
  private normalizeVendorName(name: string): string {
    return name.trim().replace(/\s+/g, ' ');
  }

  /**
   * Calculate Levenshtein similarity (0-100)
   */
  private levenshteinSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) {
      return 100;
    }
    
    const distance = this.levenshteinDistance(longer, shorter);
    return Math.round(((longer.length - distance) / longer.length) * 100);
  }

  /**
   * Calculate Levenshtein distance
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
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate Jaro-Winkler similarity (0-100)
   */
  private jaroWinklerSimilarity(str1: string, str2: string): number {
    const jaroSim = this.jaroSimilarity(str1, str2);
    
    // Calculate common prefix length (up to 4 characters)
    let prefixLength = 0;
    for (let i = 0; i < Math.min(str1.length, str2.length, 4); i++) {
      if (str1[i] === str2[i]) {
        prefixLength++;
      } else {
        break;
      }
    }
    
    // Jaro-Winkler similarity
    const p = 0.1; // Scaling factor
    return Math.round((jaroSim + (prefixLength * p * (1 - jaroSim))) * 100);
  }

  /**
   * Calculate Jaro similarity
   */
  private jaroSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0 || len2 === 0) return 0;
    
    const matchWindow = Math.max(len1, len2) / 2 - 1;
    const matches1 = new Array(len1).fill(false);
    const matches2 = new Array(len2).fill(false);
    
    let matches = 0;
    let transpositions = 0;
    
    // Find matches
    for (let i = 0; i < len1; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, len2);
      
      for (let j = start; j < end; j++) {
        if (matches2[j] || str1[i] !== str2[j]) continue;
        matches1[i] = true;
        matches2[j] = true;
        matches++;
        break;
      }
    }
    
    if (matches === 0) return 0;
    
    // Find transpositions
    let k = 0;
    for (let i = 0; i < len1; i++) {
      if (!matches1[i]) continue;
      while (!matches2[k]) k++;
      if (str1[i] !== str2[k]) transpositions++;
      k++;
    }
    
    return (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
  }

  /**
   * Calculate token-based similarity (0-100)
   */
  private tokenSimilarity(name1: string, name2: string): number {
    const tokens1 = this.extractSearchTerms(name1);
    const tokens2 = this.extractSearchTerms(name2);
    
    if (tokens1.length === 0 || tokens2.length === 0) {
      return 0;
    }
    
    const allTokens = new Set([...tokens1, ...tokens2]);
    const commonTokens = tokens1.filter(t => tokens2.includes(t));
    
    return Math.round((commonTokens.length / allTokens.size) * 100);
  }

  /**
   * Create mapping for future use
   */
  async createMapping(
    originalName: string,
    vendorId: number,
    vendorName: string,
    confidence: number,
    userId?: number
  ): Promise<void> {
    const normalizedOriginal = this.normalizeVendorName(originalName);
    
    // Check if mapping exists
    const existing = await this.findMappedVendor(normalizedOriginal);
    if (existing) {
      // Update if new confidence is higher
      if (confidence > Number(existing.confidence)) {
        await db.update(vendorMappings)
          .set({
            mappedVendorId: vendorId,
            mappedVendorName: vendorName,
            confidence: confidence.toString(),
            lastUsedAt: new Date(),
          })
          .where(eq(vendorMappings.id, existing.id));
      }
      return;
    }
    
    // Insert new mapping
    await db.insert(vendorMappings).values({
      originalName: normalizedOriginal,
      mappedVendorId: vendorId,
      mappedVendorName: vendorName,
      confidence: confidence.toString(),
      usageCount: 1,
      createdBy: userId,
    });
  }

  /**
   * Update usage count for a mapping
   */
  private async updateMappingUsageCount(mappingId: number): Promise<void> {
    await db.update(vendorMappings)
      .set({
        usageCount: sql`${vendorMappings.usageCount} + 1`,
        lastUsedAt: new Date(),
      })
      .where(eq(vendorMappings.id, mappingId));
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Learn from user selection
   */
  async learnFromSelection(
    originalName: string,
    selectedVendorId: number,
    selectedVendorName: string,
    userId?: number
  ): Promise<void> {
    // Create high-confidence mapping
    await this.createMapping(
      originalName,
      selectedVendorId,
      selectedVendorName,
      95, // High confidence for user selections
      userId
    );
    
    // Update cache
    const normalizedName = this.normalizeVendorName(originalName);
    this.cache.set(normalizedName, {
      isValid: true,
      vendorId: selectedVendorId,
    });
  }
}