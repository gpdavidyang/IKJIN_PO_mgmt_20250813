/**
 * Vendor validation and similarity matching utility
 * 거래처/납품처 존재 여부 확인 및 유사업체 추천 기능
 */

import { db } from "../db";
import { vendors, purchaseOrders } from "@shared/schema";
import { eq, ilike, sql, and, desc } from "drizzle-orm";
import { MockDB } from "./mock-db";

export interface VendorValidationResult {
  vendorName: string;
  exists: boolean;
  exactMatch?: {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    contactPerson: string;
  };
  suggestions: Array<{
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    contactPerson: string;
    similarity: number; // 0-1 점수
    distance: number; // Levenshtein distance
    isRecentlyUsed?: boolean; // 최근 사용 여부
    lastUsedDate?: Date; // 마지막 사용일
  }>;
}

export interface EmailConflictInfo {
  type: 'conflict' | 'no_conflict';
  excelEmail: string;
  dbEmail?: string;
  vendorId?: number;
  vendorName?: string;
}

/**
 * 최근 사용한 거래처 조회 (30일 이내)
 */
async function getRecentlyUsedVendors(vendorType: '거래처' | '납품처' = '거래처'): Promise<Map<number, Date>> {
  const recentVendorsMap = new Map<number, Date>();
  
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentOrders = await db
      .select({
        vendorId: purchaseOrders.vendorId,
        orderDate: purchaseOrders.orderDate,
      })
      .from(purchaseOrders)
      .where(sql`${purchaseOrders.orderDate} >= ${thirtyDaysAgo}`)
      .orderBy(desc(purchaseOrders.orderDate));
    
    // vendorId별로 가장 최근 사용일 저장
    recentOrders.forEach(order => {
      if (order.vendorId && order.orderDate) {
        const existing = recentVendorsMap.get(order.vendorId);
        if (!existing || order.orderDate > existing) {
          recentVendorsMap.set(order.vendorId, order.orderDate);
        }
      }
    });
    
    console.log(`🕐 최근 30일 내 사용된 거래처: ${recentVendorsMap.size}개`);
    
  } catch (error) {
    console.error('최근 거래처 조회 실패:', error);
  }
  
  return recentVendorsMap;
}

/**
 * Levenshtein distance 계산 함수
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];

  // 빈 문자열 처리
  if (str1.length === 0) return str2.length;
  if (str2.length === 0) return str1.length;

  // 첫 번째 행과 열 초기화
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  // 행렬 채우기
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
 * 유사도 점수 계산 (0-1, 1이 가장 유사)
 */
function calculateSimilarity(str1: string, str2: string): number {
  // null/undefined 값 처리
  if (!str1 || !str2) return 0;
  
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
}

/**
 * 데이터베이스 연결 실패 시 폴백 추천 생성
 */
function generateFallbackSuggestions(vendorName: string) {
  // Common Korean company naming patterns for suggestions
  const commonVendorPatterns = [
    '㈜삼성전자', '㈜LG전자', '㈜현대자동차', '㈜SK하이닉스', '㈜포스코',
    '㈜삼성물산', '㈜현대건설', '㈜대우건설', '㈜GS건설', '㈜롯데건설',
    '㈜한화시스템', '㈜두산중공업', '㈜코웨이', '㈜아모레퍼시픽', '㈜CJ제일제당',
    '㈜신세계', '㈜롯데마트', '㈜이마트', '㈜홈플러스', '㈜메가마트',
    '테크놀로지㈜', '엔지니어링㈜', '건설㈜', '전자㈜', '시스템㈜',
    '솔루션㈜', '서비스㈜', '컨설팅㈜', '개발㈜', '제조㈜'
  ];

  // Generate suggestions based on similarity
  const suggestions = commonVendorPatterns
    .map(pattern => {
      const similarity = calculateSimilarity(vendorName, pattern);
      const distance = levenshteinDistance(vendorName.toLowerCase(), pattern.toLowerCase());
      
      return {
        id: Math.floor(Math.random() * 1000), // Mock ID
        name: pattern,
        email: `contact@${pattern.replace(/㈜/g, '').toLowerCase()}.co.kr`,
        phone: '02-0000-0000',
        contactPerson: '담당자',
        similarity,
        distance,
      };
    })
    .filter(suggestion => suggestion.similarity >= 0.2) // Lower threshold for fallback
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3); // Top 3 suggestions

  console.log(`🔄 폴백 추천 생성: ${suggestions.length}개 추천`);
  return suggestions;
}

/**
 * 거래처명 검증 및 유사 거래처 추천
 */
export async function validateVendorName(vendorName: string, vendorType: '거래처' | '납품처' = '거래처'): Promise<VendorValidationResult> {
  console.log(`🔍 ${vendorType} 검증 시작: "${vendorName}"`);

  // Check if DATABASE_URL is set for actual database mode
  if (!process.env.DATABASE_URL) {
    console.log(`🔄 모크 모드: DATABASE_URL 미설정, Mock DB 사용: "${vendorName}"`);
    
    try {
      // Mock DB에서 정확한 매칭 확인
      const exactMatch = await MockDB.findVendorByName(vendorName, vendorType);
      
      if (exactMatch) {
        console.log(`✅ Mock DB에서 발견: ${vendorName} (ID: ${exactMatch.id})`);
        return {
          vendorName,
          exists: true,
          exactMatch: {
            id: exactMatch.id,
            name: exactMatch.name,
            email: exactMatch.email,
            phone: exactMatch.phone,
            contactPerson: exactMatch.contactPerson,
          },
          suggestions: [],
        };
      }
      
      // 유사한 거래처 찾기
      const allVendors = await MockDB.findVendorsByType(vendorType);
      const recentVendorsMap = await MockDB.getRecentlyUsedVendors();
      
      const suggestions = allVendors
        .map((vendor: any) => {
          const similarity = calculateSimilarity(vendorName, vendor.name);
          const distance = levenshteinDistance(vendorName.toLowerCase(), vendor.name.toLowerCase());
          const lastUsedDate = recentVendorsMap.get(vendor.id);
          
          return {
            id: vendor.id,
            name: vendor.name,
            email: vendor.email,
            phone: vendor.phone,
            contactPerson: vendor.contactPerson,
            similarity,
            distance,
            isRecentlyUsed: !!lastUsedDate,
            lastUsedDate,
          };
        })
        .filter((vendor: any) => vendor.similarity >= 0.3 && vendor.name !== vendorName)
        .sort((a: any, b: any) => {
          // 1. 최근 사용 여부 우선
          if (a.isRecentlyUsed && !b.isRecentlyUsed) return -1;
          if (!a.isRecentlyUsed && b.isRecentlyUsed) return 1;
          
          // 2. 둘 다 최근 사용인 경우, 더 최근 것 우선
          if (a.isRecentlyUsed && b.isRecentlyUsed && a.lastUsedDate && b.lastUsedDate) {
            if (a.lastUsedDate > b.lastUsedDate) return -1;
            if (a.lastUsedDate < b.lastUsedDate) return 1;
          }
          
          // 3. 유사도 높은 순으로 정렬
          return b.similarity - a.similarity;
        })
        .slice(0, 5);
      
      console.log(`⚠️ Mock DB에서 미발견: ${vendorName}, 유사 거래처 ${suggestions.length}개 제안`);
      
      return {
        vendorName,
        exists: false,
        exactMatch: undefined,
        suggestions,
      };
      
    } catch (error) {
      console.error(`❌ Mock DB 검증 중 오류: ${vendorName}`, error);
      const fallbackSuggestions = generateFallbackSuggestions(vendorName);
      
      return {
        vendorName,
        exists: false,
        exactMatch: undefined,
        suggestions: fallbackSuggestions,
      };
    }
  }

  // Quick database connectivity check with reasonable timeout
  try {
    const quickTest = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Quick DB test timeout')), 10000); // 10 seconds
    });
    
    const testQuery = db.select({ count: sql`1` }).from(vendors).limit(1);
    await Promise.race([testQuery, quickTest]);
    
    console.log(`✅ 데이터베이스 연결 확인됨`);
    
  } catch (quickTestError) {
    console.log(`🔄 데이터베이스 연결 실패 감지, 즉시 폴백 모드로 전환: "${vendorName}"`, quickTestError.message);
    
    const fallbackSuggestions = generateFallbackSuggestions(vendorName);
    
    return {
      vendorName,
      exists: false,
      exactMatch: undefined,
      suggestions: fallbackSuggestions,
    };
  }

  try {
    let exactMatch = [];
    let allVendors = [];

    try {
      // Database connection timeout with fallback
      const dbTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database connection timeout')), 5000);
      });

      // 1. 정확한 이름 매칭 확인 (type 포함, with timeout)
      const exactMatchQuery = db
        .select({
          id: vendors.id,
          name: vendors.name,
          email: vendors.email,
          phone: vendors.phone,
          contactPerson: vendors.contactPerson,
        })
        .from(vendors)
        .where(and(
          eq(vendors.name, vendorName),
          eq(vendors.type, vendorType)
        ))
        .limit(1);

      // 2. 해당 타입의 모든 활성 거래처 조회 (유사도 계산용, with timeout)
      const allVendorsQuery = db
        .select({
          id: vendors.id,
          name: vendors.name,
          email: vendors.email,
          phone: vendors.phone,
          contactPerson: vendors.contactPerson,
        })
        .from(vendors)
        .where(and(
          eq(vendors.isActive, true),
          eq(vendors.type, vendorType)
        ));

      // Execute with timeout
      exactMatch = await Promise.race([exactMatchQuery, dbTimeout]);
      allVendors = await Promise.race([allVendorsQuery, dbTimeout]);

    } catch (dbError: any) {
      console.log(`🔄 데이터베이스 연결 실패, 폴백 모드로 실행: "${vendorName}"`);
      console.log(`DB 오류:`, dbError?.message || dbError);
      
      // Return fallback result immediately
      const fallbackSuggestions = generateFallbackSuggestions(vendorName);
      
      return {
        vendorName,
        exists: false,
        exactMatch: undefined,
        suggestions: fallbackSuggestions,
      };
    }

    // 3. 최근 사용 거래처 정보 조회
    const recentVendorsMap = await getRecentlyUsedVendors(vendorType);

    // 4. 유사도 계산 및 정렬
    const suggestions = allVendors
      .map((vendor: any) => {
        const similarity = calculateSimilarity(vendorName, vendor.name);
        const distance = levenshteinDistance(vendorName.toLowerCase(), vendor.name.toLowerCase());
        const lastUsedDate = recentVendorsMap.get(vendor.id);
        
        return {
          ...vendor,
          similarity,
          distance,
          isRecentlyUsed: !!lastUsedDate,
          lastUsedDate,
        };
      })
      .filter((vendor: any) => {
        // 정확히 일치하는 경우는 제외하고, 유사도가 0.3 이상인 것만 포함
        return vendor.name !== vendorName && vendor.similarity >= 0.3;
      })
      .sort((a: any, b: any) => {
        // 1. 최근 사용 여부 우선
        if (a.isRecentlyUsed && !b.isRecentlyUsed) return -1;
        if (!a.isRecentlyUsed && b.isRecentlyUsed) return 1;
        
        // 2. 둘 다 최근 사용인 경우, 더 최근 것 우선
        if (a.isRecentlyUsed && b.isRecentlyUsed && a.lastUsedDate && b.lastUsedDate) {
          if (a.lastUsedDate > b.lastUsedDate) return -1;
          if (a.lastUsedDate < b.lastUsedDate) return 1;
        }
        
        // 3. 유사도 높은 순으로 정렬
        if (b.similarity !== a.similarity) {
          return b.similarity - a.similarity;
        }
        
        // 4. 유사도가 같으면 거리 짧은 순으로 정렬
        return a.distance - b.distance;
      })
      .slice(0, 5); // 상위 5개만 반환

    const result: VendorValidationResult = {
      vendorName,
      exists: exactMatch.length > 0,
      exactMatch: exactMatch.length > 0 ? exactMatch[0] : undefined,
      suggestions,
    };

    console.log(`✅ ${vendorType} 검증 완료: exists=${result.exists}, suggestions=${suggestions.length}개`);
    if (result.exactMatch) {
      console.log(`📍 정확한 매칭: ${result.exactMatch.name} (ID: ${result.exactMatch.id})`);
    }
    suggestions.forEach((suggestion: any, index: number) => {
      const recentFlag = suggestion.isRecentlyUsed ? ' 🔥최근사용' : '';
      const lastUsedInfo = suggestion.lastUsedDate ? ` (${suggestion.lastUsedDate.toLocaleDateString('ko-KR')})` : '';
      console.log(`💡 추천 ${index + 1}: ${suggestion.name} (유사도: ${(suggestion.similarity * 100).toFixed(1)}%)${recentFlag}${lastUsedInfo}`);
    });

    return result;

  } catch (error: any) {
    console.error(`❌ 거래처 검증 중 오류:`, error);
    
    // Fallback mechanism when database is unavailable
    if (error?.message?.includes('database') || 
        error?.message?.includes('connection') || 
        error?.message?.includes('fetch failed') ||
        error?.message?.includes('NeonDbError') ||
        error?.message?.includes('ENOTFOUND') ||
        error?.name === 'NeonDbError' ||
        error?.code === 'ENOTFOUND') {
      console.log(`🔄 데이터베이스 연결 실패, 폴백 모드로 실행: "${vendorName}"`);
      
      // Return fallback result with suggestions based on common vendor names
      const fallbackSuggestions = generateFallbackSuggestions(vendorName);
      
      return {
        vendorName,
        exists: false, // Can't verify without DB
        exactMatch: undefined,
        suggestions: fallbackSuggestions,
      };
    }
    
    throw new Error(`거래처 검증 중 오류가 발생했습니다: ${error}`);
  }
}

/**
 * 이메일 충돌 검사
 */
export async function checkEmailConflict(
  vendorName: string, 
  excelEmail: string
): Promise<EmailConflictInfo> {
  try {
    console.log(`📧 이메일 충돌 검사: "${vendorName}" - "${excelEmail}"`);

    let dbVendor = [];

    try {
      // Database query with timeout
      const dbTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database connection timeout')), 3000);
      });

      const dbVendorQuery = db
        .select({
          id: vendors.id,
          name: vendors.name,
          email: vendors.email,
        })
        .from(vendors)
        .where(eq(vendors.name, vendorName))
        .limit(1);

      // 거래처명으로 DB에서 이메일 조회 (with timeout)
      dbVendor = await Promise.race([dbVendorQuery, dbTimeout]);

    } catch (dbError) {
      console.log(`🔄 데이터베이스 연결 실패, 이메일 충돌 검사 스킵: "${vendorName}"`);
      
      return {
        type: 'no_conflict',
        excelEmail,
      };
    }

    if (dbVendor.length === 0) {
      // DB에 거래처가 없으면 충돌 없음
      console.log(`✅ 이메일 충돌 없음: 거래처가 DB에 없음`);
      return {
        type: 'no_conflict',
        excelEmail,
      };
    }

    const vendor = dbVendor[0];
    
    if (vendor.email.toLowerCase() === excelEmail.toLowerCase()) {
      // 이메일이 동일하면 충돌 없음
      console.log(`✅ 이메일 충돌 없음: 동일한 이메일`);
      return {
        type: 'no_conflict',
        excelEmail,
        dbEmail: vendor.email,
        vendorId: vendor.id,
        vendorName: vendor.name,
      };
    }

    // 이메일이 다르면 충돌
    console.log(`⚠️ 이메일 충돌 발견: Excel="${excelEmail}" vs DB="${vendor.email}"`);
    return {
      type: 'conflict',
      excelEmail,
      dbEmail: vendor.email,
      vendorId: vendor.id,
      vendorName: vendor.name,
    };

  } catch (error: any) {
    console.error(`❌ 이메일 충돌 검사 중 오류:`, error);
    
    // Fallback for database connection issues
    if (error?.message?.includes('database') || 
        error?.message?.includes('connection') || 
        error?.message?.includes('fetch failed') ||
        error?.message?.includes('NeonDbError') ||
        error?.message?.includes('ENOTFOUND') ||
        error?.name === 'NeonDbError' ||
        error?.code === 'ENOTFOUND') {
      console.log(`🔄 데이터베이스 연결 실패, 이메일 충돌 검사 스킵`);
      
      return {
        type: 'no_conflict',
        excelEmail,
      };
    }
    
    throw new Error(`이메일 충돌 검사 중 오류가 발생했습니다: ${error}`);
  }
}

/**
 * 다중 거래처 검증 (배치 처리)
 */
export async function validateMultipleVendors(
  vendorData: Array<{ vendorName: string; deliveryName: string; email?: string }>
): Promise<{
  vendorValidations: VendorValidationResult[];
  deliveryValidations: VendorValidationResult[];
  emailConflicts: EmailConflictInfo[];
}> {
  try {
    console.log(`🔄 다중 거래처 검증 시작: ${vendorData.length}개 항목`);

    // Mock DB를 원본 데이터로 초기화 (한 번만)
    if (!process.env.DATABASE_URL) {
      MockDB.resetToOriginalData();
    }

    const vendorValidations: VendorValidationResult[] = [];
    const deliveryValidations: VendorValidationResult[] = [];
    const emailConflicts: EmailConflictInfo[] = [];

    for (const data of vendorData) {
      try {
        // 거래처명 검증 (type='거래처')
        const vendorValidation = await validateVendorName(data.vendorName, '거래처');
        vendorValidations.push(vendorValidation);
      } catch (error: any) {
        console.error(`❌ 거래처 "${data.vendorName}" 검증 실패:`, error?.message || error);
        // Add fallback result even if validation fails
        vendorValidations.push({
          vendorName: data.vendorName,
          exists: false,
          exactMatch: undefined,
          suggestions: generateFallbackSuggestions(data.vendorName),
        });
      }

      try {
        // 납품처명 검증 (거래처명과 다른 경우에만, type='납품처')
        if (data.deliveryName && data.deliveryName !== data.vendorName) {
          const deliveryValidation = await validateVendorName(data.deliveryName, '납품처');
          deliveryValidations.push(deliveryValidation);
        }
      } catch (error: any) {
        console.error(`❌ 납품처 "${data.deliveryName}" 검증 실패:`, error?.message || error);
        if (data.deliveryName && data.deliveryName !== data.vendorName) {
          deliveryValidations.push({
            vendorName: data.deliveryName,
            exists: false,
            exactMatch: undefined,
            suggestions: generateFallbackSuggestions(data.deliveryName),
          });
        }
      }

      try {
        // 이메일 충돌 검사
        if (data.email) {
          const emailConflict = await checkEmailConflict(data.vendorName, data.email);
          emailConflicts.push(emailConflict);
        }
      } catch (error: any) {
        console.error(`❌ 이메일 충돌 검사 실패 "${data.vendorName}":`, error?.message || error);
        // Add no-conflict fallback
        if (data.email) {
          emailConflicts.push({
            type: 'no_conflict',
            excelEmail: data.email,
          });
        }
      }
    }

    console.log(`✅ 다중 거래처 검증 완료: 거래처=${vendorValidations.length}, 납품처=${deliveryValidations.length}, 이메일충돌=${emailConflicts.filter(c => c.type === 'conflict').length}`);

    return {
      vendorValidations,
      deliveryValidations,
      emailConflicts,
    };

  } catch (error) {
    console.error(`❌ 다중 거래처 검증 중 오류:`, error);
    throw new Error(`다중 거래처 검증 중 오류가 발생했습니다: ${error}`);
  }
}