import crypto from 'crypto';
import { db } from '../db';
import { purchaseOrderItems } from '@shared/schema';
import { eq, and, sql, or } from 'drizzle-orm';

/**
 * 중복 감지 서비스
 * Hash 기반 정확한 중복 체크와 유사도 기반 잠재적 중복 감지
 */

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateType: 'exact' | 'similar' | 'none';
  confidence: number;
  matches: DuplicateMatch[];
  mergeStrategy?: MergeStrategy;
}

export interface DuplicateMatch {
  rowIndex: number;
  matchType: 'exact' | 'similar';
  similarity: number;
  fields: FieldMatch[];
  existingItem?: any;
}

export interface FieldMatch {
  field: string;
  originalValue: any;
  matchedValue: any;
  isExactMatch: boolean;
}

export interface MergeStrategy {
  action: 'skip' | 'replace' | 'merge' | 'create_new';
  mergedData?: any;
  reason: string;
}

export interface DuplicateDetectionOptions {
  checkExisting?: boolean;
  similarityThreshold?: number;
  groupSimilar?: boolean;
  detectPartialDuplicates?: boolean;
}

export class DuplicateDetectionService {
  private hashCache: Map<string, string> = new Map();
  private similarityThreshold: number = 0.85; // 85% 유사도 이상을 중복으로 간주

  /**
   * 엑셀 데이터의 중복 검사 수행
   */
  async detectDuplicates(
    data: any[],
    sessionId: string,
    options: DuplicateDetectionOptions = {}
  ): Promise<Map<number, DuplicateCheckResult>> {
    const {
      checkExisting = true,
      similarityThreshold = this.similarityThreshold,
      groupSimilar = true,
      detectPartialDuplicates = true
    } = options;

    const results = new Map<number, DuplicateCheckResult>();
    const processedHashes = new Map<string, number[]>();
    const similarGroups: Map<string, number[]> = new Map();

    // Step 1: Generate hashes for all rows
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const hash = this.generateHash(row);
      
      if (!processedHashes.has(hash)) {
        processedHashes.set(hash, []);
      }
      processedHashes.get(hash)!.push(i);
      this.hashCache.set(`row_${i}`, hash);
    }

    // Step 2: Check for exact duplicates within the dataset
    for (const [hash, indices] of processedHashes.entries()) {
      if (indices.length > 1) {
        // Found exact duplicates
        for (let i = 1; i < indices.length; i++) {
          const duplicateIndex = indices[i];
          const originalIndex = indices[0];
          
          results.set(duplicateIndex, {
            isDuplicate: true,
            duplicateType: 'exact',
            confidence: 100,
            matches: [{
              rowIndex: originalIndex,
              matchType: 'exact',
              similarity: 100,
              fields: this.compareFields(data[duplicateIndex], data[originalIndex])
            }],
            mergeStrategy: {
              action: 'skip',
              reason: `완전히 동일한 항목이 행 ${originalIndex + 1}에 이미 존재합니다`
            }
          });
        }
      }
    }

    // Step 3: Check for similar items (fuzzy matching)
    if (detectPartialDuplicates) {
      for (let i = 0; i < data.length; i++) {
        if (results.has(i)) continue; // Skip if already marked as exact duplicate

        const similarItems = await this.findSimilarItems(
          data[i], 
          data, 
          i,
          similarityThreshold
        );

        if (similarItems.length > 0) {
          results.set(i, {
            isDuplicate: true,
            duplicateType: 'similar',
            confidence: similarItems[0].similarity,
            matches: similarItems,
            mergeStrategy: this.suggestMergeStrategy(data[i], similarItems)
          });

          // Group similar items
          if (groupSimilar) {
            const groupKey = `group_${i}`;
            similarGroups.set(groupKey, [i, ...similarItems.map(s => s.rowIndex)]);
          }
        }
      }
    }

    // Step 4: Check against existing database records
    if (checkExisting) {
      await this.checkAgainstDatabase(data, results);
    }

    // Step 5: Mark non-duplicates
    for (let i = 0; i < data.length; i++) {
      if (!results.has(i)) {
        results.set(i, {
          isDuplicate: false,
          duplicateType: 'none',
          confidence: 0,
          matches: []
        });
      }
    }

    // Store duplicate groups for later reference
    if (similarGroups.size > 0) {
      await this.storeDuplicateGroups(sessionId, similarGroups);
    }

    return results;
  }

  /**
   * Generate hash for duplicate detection
   */
  private generateHash(row: any): string {
    // Extract key fields for hashing
    const keyFields = {
      item: this.normalizeString(row.품목명 || row.itemName || ''),
      spec: this.normalizeString(row.규격 || row.specification || ''),
      vendor: this.normalizeString(row.거래처 || row.vendor || ''),
      project: this.normalizeString(row.현장 || row.project || ''),
      quantity: this.normalizeNumber(row.수량 || row.quantity || 0),
      unitPrice: this.normalizeNumber(row.단가 || row.unitPrice || 0),
      requestDate: this.normalizeDate(row.요청일 || row.requestDate || '')
    };

    const hashInput = JSON.stringify(keyFields);
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  /**
   * Find similar items using multiple similarity metrics
   */
  private async findSimilarItems(
    targetRow: any,
    allRows: any[],
    targetIndex: number,
    threshold: number
  ): Promise<DuplicateMatch[]> {
    const matches: DuplicateMatch[] = [];

    for (let i = 0; i < allRows.length; i++) {
      if (i === targetIndex) continue;

      const similarity = this.calculateSimilarity(targetRow, allRows[i]);
      
      if (similarity >= threshold) {
        matches.push({
          rowIndex: i,
          matchType: 'similar',
          similarity: Math.round(similarity * 100),
          fields: this.compareFields(targetRow, allRows[i])
        });
      }
    }

    // Sort by similarity (highest first)
    return matches.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Calculate similarity between two rows
   */
  private calculateSimilarity(row1: any, row2: any): number {
    const weights = {
      itemName: 0.25,
      specification: 0.2,
      vendor: 0.2,
      project: 0.15,
      quantity: 0.1,
      unitPrice: 0.1
    };

    let totalSimilarity = 0;

    // Item name similarity
    totalSimilarity += weights.itemName * this.stringSimilarity(
      row1.품목명 || row1.itemName || '',
      row2.품목명 || row2.itemName || ''
    );

    // Specification similarity
    totalSimilarity += weights.specification * this.stringSimilarity(
      row1.규격 || row1.specification || '',
      row2.규격 || row2.specification || ''
    );

    // Vendor similarity
    totalSimilarity += weights.vendor * this.stringSimilarity(
      row1.거래처 || row1.vendor || '',
      row2.거래처 || row2.vendor || ''
    );

    // Project similarity
    totalSimilarity += weights.project * this.stringSimilarity(
      row1.현장 || row1.project || '',
      row2.현장 || row2.project || ''
    );

    // Quantity similarity
    const qty1 = parseFloat(row1.수량 || row1.quantity || 0);
    const qty2 = parseFloat(row2.수량 || row2.quantity || 0);
    if (qty1 && qty2) {
      totalSimilarity += weights.quantity * (1 - Math.abs(qty1 - qty2) / Math.max(qty1, qty2));
    }

    // Unit price similarity
    const price1 = parseFloat(row1.단가 || row1.unitPrice || 0);
    const price2 = parseFloat(row2.단가 || row2.unitPrice || 0);
    if (price1 && price2) {
      totalSimilarity += weights.unitPrice * (1 - Math.abs(price1 - price2) / Math.max(price1, price2));
    }

    return totalSimilarity;
  }

  /**
   * String similarity using Levenshtein distance
   */
  private stringSimilarity(str1: string, str2: string): number {
    const s1 = this.normalizeString(str1);
    const s2 = this.normalizeString(str2);
    
    if (s1 === s2) return 1;
    if (!s1 || !s2) return 0;

    const maxLen = Math.max(s1.length, s2.length);
    if (maxLen === 0) return 1;

    const distance = this.levenshteinDistance(s1, s2);
    return 1 - (distance / maxLen);
  }

  /**
   * Levenshtein distance calculation
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
   * Compare fields between two rows
   */
  private compareFields(row1: any, row2: any): FieldMatch[] {
    const fields: FieldMatch[] = [];
    const fieldMap = [
      { key: '품목명', altKey: 'itemName', label: '품목명' },
      { key: '규격', altKey: 'specification', label: '규격' },
      { key: '거래처', altKey: 'vendor', label: '거래처' },
      { key: '현장', altKey: 'project', label: '현장' },
      { key: '수량', altKey: 'quantity', label: '수량' },
      { key: '단가', altKey: 'unitPrice', label: '단가' }
    ];

    for (const field of fieldMap) {
      const val1 = row1[field.key] || row1[field.altKey];
      const val2 = row2[field.key] || row2[field.altKey];

      fields.push({
        field: field.label,
        originalValue: val1,
        matchedValue: val2,
        isExactMatch: this.normalizeValue(val1) === this.normalizeValue(val2)
      });
    }

    return fields;
  }

  /**
   * Suggest merge strategy for duplicate items
   */
  private suggestMergeStrategy(row: any, matches: DuplicateMatch[]): MergeStrategy {
    const bestMatch = matches[0];
    
    if (bestMatch.similarity >= 95) {
      return {
        action: 'skip',
        reason: `거의 동일한 항목 (${bestMatch.similarity}% 일치)이 행 ${bestMatch.rowIndex + 1}에 존재합니다`
      };
    } else if (bestMatch.similarity >= 85) {
      // Check if only quantity differs
      const diffFields = bestMatch.fields.filter(f => !f.isExactMatch);
      if (diffFields.length === 1 && diffFields[0].field === '수량') {
        return {
          action: 'merge',
          reason: '수량만 다른 유사 항목입니다. 수량을 합산하시겠습니까?',
          mergedData: {
            ...row,
            수량: (parseFloat(row.수량 || 0) + parseFloat(diffFields[0].matchedValue || 0)).toString()
          }
        };
      }
      return {
        action: 'replace',
        reason: `유사한 항목 (${bestMatch.similarity}% 일치)을 발견했습니다. 기존 항목을 대체하시겠습니까?`
      };
    } else {
      return {
        action: 'create_new',
        reason: '유사하지만 별개의 항목으로 판단됩니다'
      };
    }
  }

  /**
   * Check duplicates against existing database records
   */
  private async checkAgainstDatabase(
    rows: any[],
    results: Map<number, DuplicateCheckResult>
  ): Promise<void> {
    try {
      // Get recent orders to check against
      // Use query builder without .execute() for Drizzle ORM
      const recentOrders = await db.select()
        .from(purchaseOrderItems)
        .limit(1000);

      for (let i = 0; i < rows.length; i++) {
        if (results.get(i)?.isDuplicate) continue;

        const row = rows[i];
        const existingMatch = this.findExistingMatch(row, recentOrders);

        if (existingMatch) {
          const currentResult = results.get(i) || {
            isDuplicate: false,
            duplicateType: 'none',
            confidence: 0,
            matches: []
          };

          currentResult.isDuplicate = true;
          currentResult.duplicateType = existingMatch.exact ? 'exact' : 'similar';
          currentResult.confidence = existingMatch.similarity;
          currentResult.matches.push({
            rowIndex: -1, // Indicate it's from database
            matchType: existingMatch.exact ? 'exact' : 'similar',
            similarity: existingMatch.similarity,
            fields: [],
            existingItem: existingMatch.item
          });

          results.set(i, currentResult);
        }
      }
    } catch (error) {
      console.error('Error checking database for duplicates:', error);
      // Don't throw error, just skip database check
    }
  }

  /**
   * Find matching item in existing records
   */
  private findExistingMatch(row: any, existingItems: any[]): any {
    let bestMatch = null;
    let bestSimilarity = 0;

    for (const item of existingItems) {
      const similarity = this.calculateSimilarity(row, {
        품목명: item.itemName,
        규격: item.specification,
        수량: item.quantity,
        단가: item.unitPrice,
        거래처: item.vendorId, // This would need vendor name lookup
        현장: item.projectId  // This would need project name lookup
      });

      if (similarity > bestSimilarity && similarity >= this.similarityThreshold) {
        bestSimilarity = similarity;
        bestMatch = {
          item,
          similarity: Math.round(similarity * 100),
          exact: similarity >= 0.99
        };
      }
    }

    return bestMatch;
  }

  /**
   * Store duplicate groups for later processing
   */
  private async storeDuplicateGroups(
    sessionId: string,
    groups: Map<string, number[]>
  ): Promise<void> {
    // Store in a session-specific cache or database
    // This can be used for bulk merge operations later
    const groupData = Array.from(groups.entries()).map(([key, indices]) => ({
      groupId: key,
      sessionId,
      rowIndices: indices,
      createdAt: new Date()
    }));

    // Store in database or cache
    // Implementation depends on your storage strategy
    console.log('Duplicate groups stored:', groupData.length);
  }

  /**
   * Merge duplicate items based on strategy
   */
  async mergeDuplicates(
    duplicates: Map<number, DuplicateCheckResult>,
    strategy: 'auto' | 'manual' = 'manual'
  ): Promise<any[]> {
    const mergedData: any[] = [];
    const processedIndices = new Set<number>();

    for (const [index, result] of duplicates.entries()) {
      if (processedIndices.has(index)) continue;

      if (result.isDuplicate && result.mergeStrategy) {
        switch (result.mergeStrategy.action) {
          case 'skip':
            // Skip this duplicate
            processedIndices.add(index);
            break;
          
          case 'merge':
            // Merge with existing item
            if (result.mergeStrategy.mergedData) {
              mergedData.push(result.mergeStrategy.mergedData);
              processedIndices.add(index);
              result.matches.forEach(m => processedIndices.add(m.rowIndex));
            }
            break;
          
          case 'replace':
            // Replace existing with new
            mergedData.push({ index, action: 'replace' });
            processedIndices.add(index);
            break;
          
          case 'create_new':
            // Keep as new item
            mergedData.push({ index, action: 'create' });
            processedIndices.add(index);
            break;
        }
      } else {
        // Not a duplicate, keep as is
        mergedData.push({ index, action: 'create' });
        processedIndices.add(index);
      }
    }

    return mergedData;
  }

  /**
   * Utility: Normalize string for comparison
   */
  private normalizeString(str: string): string {
    return str.toString().toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Utility: Normalize number
   */
  private normalizeNumber(num: any): number {
    return parseFloat(num) || 0;
  }

  /**
   * Utility: Normalize date
   */
  private normalizeDate(date: any): string {
    if (!date) return '';
    try {
      return new Date(date).toISOString().split('T')[0];
    } catch {
      return '';
    }
  }

  /**
   * Utility: Normalize any value for comparison
   */
  private normalizeValue(val: any): string {
    if (val === null || val === undefined) return '';
    if (typeof val === 'number') return val.toString();
    if (typeof val === 'string') return this.normalizeString(val);
    return JSON.stringify(val);
  }
}