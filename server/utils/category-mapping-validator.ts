/**
 * 엑셀 업로드 시 분류 매핑 검증 유틸리티
 * Excel Category → DB Category 매핑 및 유사도 검사
 */

import { db } from "../db";
import { itemCategories } from "@shared/schema";
import { eq, and, like } from "drizzle-orm";

export interface CategoryMappingResult {
  excel: {
    major?: string;
    middle?: string;
    minor?: string;
  };
  db: {
    majorId?: number;
    middleId?: number;
    minorId?: number;
    majorName?: string;
    middleName?: string;
    minorName?: string;
  };
  status: 'exact_match' | 'partial_match' | 'no_match' | 'invalid_hierarchy';
  suggestions: CategorySuggestion[];
  confidence: number; // 0-100
}

export interface CategorySuggestion {
  id: number;
  name: string;
  type: 'major' | 'middle' | 'minor';
  similarity: number; // 0-100
  parentId?: number;
  parentName?: string;
}

export interface CategoryValidationRequest {
  majorCategory?: string;
  middleCategory?: string;
  minorCategory?: string;
}

/**
 * 엑셀 분류 데이터를 DB 분류와 매핑 검증
 */
export async function validateCategoryMapping(
  request: CategoryValidationRequest
): Promise<CategoryMappingResult> {
  console.log('🔍 분류 매핑 검증 시작:', request);
  
  const result: CategoryMappingResult = {
    excel: {
      major: request.majorCategory?.trim(),
      middle: request.middleCategory?.trim(),
      minor: request.minorCategory?.trim()
    },
    db: {},
    status: 'no_match',
    suggestions: [],
    confidence: 0
  };

  try {
    // 모든 활성 분류 조회
    const allCategories = await db.select()
      .from(itemCategories)
      .where(eq(itemCategories.isActive, true));

    const majorCategories = allCategories.filter(c => c.categoryType === 'major');
    const middleCategories = allCategories.filter(c => c.categoryType === 'middle');
    const minorCategories = allCategories.filter(c => c.categoryType === 'minor');

    // 1단계: 대분류 매핑
    let mappedMajor: any = null;
    if (result.excel.major) {
      mappedMajor = await findBestCategoryMatch(
        result.excel.major,
        majorCategories
      );
      
      if (mappedMajor.bestMatch) {
        result.db.majorId = mappedMajor.bestMatch.id;
        result.db.majorName = mappedMajor.bestMatch.categoryName;
      }
      
      result.suggestions.push(...mappedMajor.suggestions);
    }

    // 2단계: 중분류 매핑 (대분류가 매핑된 경우에만)
    let mappedMiddle: any = null;
    if (result.excel.middle && mappedMajor?.bestMatch) {
      const filteredMiddle = middleCategories.filter(
        c => c.parentId === mappedMajor.bestMatch.id
      );
      
      mappedMiddle = await findBestCategoryMatch(
        result.excel.middle,
        filteredMiddle
      );
      
      if (mappedMiddle.bestMatch) {
        result.db.middleId = mappedMiddle.bestMatch.id;
        result.db.middleName = mappedMiddle.bestMatch.categoryName;
      }
      
      result.suggestions.push(...mappedMiddle.suggestions);
    } else if (result.excel.middle && !mappedMajor?.bestMatch) {
      // 대분류 매핑 실패 시 전체 중분류에서 검색
      mappedMiddle = await findBestCategoryMatch(
        result.excel.middle,
        middleCategories
      );
      
      result.suggestions.push(...mappedMiddle.suggestions);
    }

    // 3단계: 소분류 매핑 (중분류가 매핑된 경우에만)
    let mappedMinor: any = null;
    if (result.excel.minor && mappedMiddle?.bestMatch) {
      const filteredMinor = minorCategories.filter(
        c => c.parentId === mappedMiddle.bestMatch.id
      );
      
      mappedMinor = await findBestCategoryMatch(
        result.excel.minor,
        filteredMinor
      );
      
      if (mappedMinor.bestMatch) {
        result.db.minorId = mappedMinor.bestMatch.id;
        result.db.minorName = mappedMinor.bestMatch.categoryName;
      }
      
      result.suggestions.push(...mappedMinor.suggestions);
    } else if (result.excel.minor && !mappedMiddle?.bestMatch) {
      // 중분류 매핑 실패 시 전체 소분류에서 검색
      mappedMinor = await findBestCategoryMatch(
        result.excel.minor,
        minorCategories
      );
      
      result.suggestions.push(...mappedMinor.suggestions);
    }

    // 매핑 상태 및 신뢰도 계산
    result.status = calculateMappingStatus(result, mappedMajor, mappedMiddle, mappedMinor);
    result.confidence = calculateConfidence(result, mappedMajor, mappedMiddle, mappedMinor);

    console.log('✅ 분류 매핑 검증 완료:', {
      status: result.status,
      confidence: result.confidence,
      suggestions: result.suggestions.length
    });

    return result;

  } catch (error) {
    console.error('❌ 분류 매핑 검증 오류:', error);
    throw new Error(`분류 매핑 검증 실패: ${error.message}`);
  }
}

/**
 * 문자열 유사도를 기반으로 최적 카테고리 매칭
 */
async function findBestCategoryMatch(
  excelCategory: string,
  dbCategories: any[]
): Promise<{
  bestMatch: any | null;
  suggestions: CategorySuggestion[];
}> {
  const suggestions: CategorySuggestion[] = [];
  let bestMatch: any = null;
  let highestSimilarity = 0;

  for (const dbCategory of dbCategories) {
    const similarity = calculateStringSimilarity(
      excelCategory.toLowerCase(),
      dbCategory.categoryName.toLowerCase()
    );

    suggestions.push({
      id: dbCategory.id,
      name: dbCategory.categoryName,
      type: dbCategory.categoryType,
      similarity: Math.round(similarity * 100),
      parentId: dbCategory.parentId
    });

    // 80% 이상 유사도면 매칭으로 간주
    if (similarity > 0.8 && similarity > highestSimilarity) {
      highestSimilarity = similarity;
      bestMatch = dbCategory;
    }
  }

  // 유사도 순으로 정렬
  suggestions.sort((a, b) => b.similarity - a.similarity);

  // 상위 5개만 반환
  return {
    bestMatch,
    suggestions: suggestions.slice(0, 5)
  };
}

/**
 * 문자열 유사도 계산 (Levenshtein distance 기반)
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const matrix = [];
  const n = str1.length;
  const m = str2.length;

  if (n === 0) return m === 0 ? 1 : 0;
  if (m === 0) return 0;

  // 매트릭스 초기화
  for (let i = 0; i <= n; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= m; j++) {
    matrix[0][j] = j;
  }

  // 거리 계산
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // 삭제
        matrix[i][j - 1] + 1,      // 삽입
        matrix[i - 1][j - 1] + cost // 치환
      );
    }
  }

  const distance = matrix[n][m];
  const maxLength = Math.max(n, m);
  
  return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
}

/**
 * 매핑 상태 계산
 */
function calculateMappingStatus(
  result: CategoryMappingResult,
  mappedMajor: any,
  mappedMiddle: any,
  mappedMinor: any
): 'exact_match' | 'partial_match' | 'no_match' | 'invalid_hierarchy' {
  
  const hasExcelMajor = !!result.excel.major;
  const hasExcelMiddle = !!result.excel.middle;
  const hasExcelMinor = !!result.excel.minor;
  
  const hasDbMajor = !!result.db.majorId;
  const hasDbMiddle = !!result.db.middleId;
  const hasDbMinor = !!result.db.minorId;

  // 완전 매칭: 엑셀에 있는 모든 분류가 DB에서 매칭됨
  if (hasExcelMajor && hasDbMajor &&
      (!hasExcelMiddle || hasDbMiddle) &&
      (!hasExcelMinor || hasDbMinor)) {
    return 'exact_match';
  }

  // 부분 매칭: 일부 분류만 매칭됨
  if (hasDbMajor || hasDbMiddle || hasDbMinor) {
    return 'partial_match';
  }

  // 매칭 없음
  return 'no_match';
}

/**
 * 신뢰도 계산 (0-100)
 */
function calculateConfidence(
  result: CategoryMappingResult,
  mappedMajor: any,
  mappedMiddle: any,
  mappedMinor: any
): number {
  let totalWeight = 0;
  let matchedWeight = 0;

  // 대분류 가중치: 40%
  if (result.excel.major) {
    totalWeight += 40;
    if (mappedMajor?.bestMatch) {
      const majorSimilarity = mappedMajor.suggestions?.[0]?.similarity || 0;
      matchedWeight += (40 * majorSimilarity / 100);
    }
  }

  // 중분류 가중치: 35%
  if (result.excel.middle) {
    totalWeight += 35;
    if (mappedMiddle?.bestMatch) {
      const middleSimilarity = mappedMiddle.suggestions?.[0]?.similarity || 0;
      matchedWeight += (35 * middleSimilarity / 100);
    }
  }

  // 소분류 가중치: 25%
  if (result.excel.minor) {
    totalWeight += 25;
    if (mappedMinor?.bestMatch) {
      const minorSimilarity = mappedMinor.suggestions?.[0]?.similarity || 0;
      matchedWeight += (25 * minorSimilarity / 100);
    }
  }

  return totalWeight === 0 ? 0 : Math.round((matchedWeight / totalWeight) * 100);
}

/**
 * 배치 검증: 여러 품목의 분류를 한 번에 검증
 */
export async function validateCategoriesBatch(
  requests: CategoryValidationRequest[]
): Promise<CategoryMappingResult[]> {
  console.log(`🔍 배치 분류 검증 시작 (${requests.length}개 품목)`);
  
  const results: CategoryMappingResult[] = [];
  
  for (let i = 0; i < requests.length; i++) {
    try {
      const result = await validateCategoryMapping(requests[i]);
      results.push(result);
      
      if ((i + 1) % 10 === 0) {
        console.log(`📊 진행률: ${i + 1}/${requests.length}`);
      }
    } catch (error) {
      console.error(`❌ 품목 ${i + 1} 검증 실패:`, error);
      
      // 실패한 경우 기본 결과 추가
      results.push({
        excel: requests[i],
        db: {},
        status: 'no_match',
        suggestions: [],
        confidence: 0
      });
    }
  }
  
  console.log('✅ 배치 분류 검증 완료');
  return results;
}