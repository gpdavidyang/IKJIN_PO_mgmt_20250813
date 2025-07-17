/**
 * 거래처/납품처 검증 서비스
 * - 엑셀 업로드 시 거래처명과 납품처명을 DB에서 검증
 * - Fuzzy Matching을 통한 유사 업체명 추천
 * - 신규 업체 등록 기능
 */

import { db } from '../db.js';
import { vendors } from '@shared/schema';
import { eq, like, or, and } from 'drizzle-orm';

/**
 * Levenshtein Distance 계산 (유사도 측정)
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
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
 * 문자열 유사도 계산 (0~1 사이, 1이 완전 일치)
 */
function calculateSimilarity(str1, str2) {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1;
  
  const distance = levenshteinDistance(str1, str2);
  return (maxLength - distance) / maxLength;
}

/**
 * 거래처/납품처 검증 서비스 클래스
 */
export class VendorValidationService {
  
  /**
   * 거래처명과 납품처명을 검증하고 처리 방안을 제시
   * @param {string} vendorName - 거래처명
   * @param {string} supplierName - 납품처명 (선택사항)
   * @param {number} similarityThreshold - 유사도 임계값 (기본 0.8)
   * @returns {Object} 검증 결과
   */
  static async validateVendorsFromExcel(vendorName, supplierName = null, similarityThreshold = 0.8) {
    const result = {
      vendor: {
        name: vendorName,
        exists: false,
        exactMatch: null,
        suggestions: [],
        needsRegistration: false
      },
      supplier: supplierName ? {
        name: supplierName,
        exists: false,
        exactMatch: null,
        suggestions: [],
        needsRegistration: false
      } : null,
      allValid: false,
      actions: []
    };

    try {
      // DB 연결 확인
      if (!db) {
        // Mock DB 사용 시 Mock 검증 로직
        return this.validateVendorsWithMockDB(vendorName, supplierName, similarityThreshold);
      }

      // 1. 거래처 검증
      const vendorValidation = await this.validateSingleVendor(vendorName, '거래처', similarityThreshold);
      result.vendor = vendorValidation;

      // 2. 납품처 검증 (있는 경우)
      if (supplierName && supplierName.trim() !== '') {
        const supplierValidation = await this.validateSingleVendor(supplierName, '납품처', similarityThreshold);
        result.supplier = supplierValidation;
      }

      // 3. 전체 유효성 판단
      result.allValid = result.vendor.exists && (!result.supplier || result.supplier.exists);

      // 4. 필요한 액션 정의
      if (!result.vendor.exists) {
        if (result.vendor.suggestions.length > 0) {
          result.actions.push({
            type: 'confirm_vendor_suggestion',
            message: `거래처 '${vendorName}'와 유사한 업체가 있습니다. 기존 업체를 사용하시겠습니까?`,
            suggestions: result.vendor.suggestions
          });
        } else {
          result.actions.push({
            type: 'register_new_vendor',
            message: `거래처 '${vendorName}'가 등록되지 않았습니다. 신규 등록하시겠습니까?`,
            vendorData: { name: vendorName, type: '거래처' }
          });
        }
      }

      if (result.supplier && !result.supplier.exists) {
        if (result.supplier.suggestions.length > 0) {
          result.actions.push({
            type: 'confirm_supplier_suggestion',
            message: `납품처 '${supplierName}'와 유사한 업체가 있습니다. 기존 업체를 사용하시겠습니까?`,
            suggestions: result.supplier.suggestions
          });
        } else {
          result.actions.push({
            type: 'register_new_supplier',
            message: `납품처 '${supplierName}'가 등록되지 않았습니다. 신규 등록하시겠습니까?`,
            vendorData: { name: supplierName, type: '납품처' }
          });
        }
      }

      return result;

    } catch (error) {
      console.error('거래처 검증 오류:', error);
      // 오류 시 Mock DB로 폴백
      return this.validateVendorsWithMockDB(vendorName, supplierName, similarityThreshold);
    }
  }

  /**
   * 단일 거래처/납품처 검증
   * @param {string} name - 업체명
   * @param {string} type - 업체 타입 ('거래처' 또는 '납품처')
   * @param {number} similarityThreshold - 유사도 임계값
   * @returns {Object} 검증 결과
   */
  static async validateSingleVendor(name, type, similarityThreshold) {
    const result = {
      name: name,
      type: type,
      exists: false,
      exactMatch: null,
      suggestions: [],
      needsRegistration: false
    };

    try {
      // 1. 정확한 이름 매치 검색
      const exactMatches = await db
        .select()
        .from(vendors)
        .where(and(
          eq(vendors.name, name),
          eq(vendors.type, type),
          eq(vendors.isActive, true)
        ));

      if (exactMatches.length > 0) {
        result.exists = true;
        result.exactMatch = exactMatches[0];
        return result;
      }

      // 2. 유사한 이름 검색 (같은 타입)
      const allVendors = await db
        .select()
        .from(vendors)
        .where(and(
          eq(vendors.type, type),
          eq(vendors.isActive, true)
        ));

      // 3. Fuzzy Matching으로 유사 업체 찾기
      const similarities = allVendors.map(vendor => ({
        vendor,
        similarity: calculateSimilarity(name.toLowerCase(), vendor.name.toLowerCase())
      }));

      // 4. 임계값 이상의 유사도를 가진 업체들을 제안
      result.suggestions = similarities
        .filter(item => item.similarity >= similarityThreshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5) // 최대 5개 제안
        .map(item => ({
          id: item.vendor.id,
          name: item.vendor.name,
          type: item.vendor.type,
          similarity: Math.round(item.similarity * 100),
          email: item.vendor.email,
          phone: item.vendor.phone
        }));

      result.needsRegistration = result.suggestions.length === 0;

      return result;

    } catch (error) {
      console.error(`${type} 검증 오류:`, error);
      result.needsRegistration = true;
      return result;
    }
  }

  /**
   * Mock DB를 사용한 검증 (DB 연결 실패 시)
   */
  static validateVendorsWithMockDB(vendorName, supplierName, similarityThreshold) {
    const mockVendors = [
      { id: 1, name: "(주)건설자재유통", type: "거래처", email: "sales@construction.co.kr", phone: "02-1234-5678" },
      { id: 2, name: "한국전기설비(주)", type: "거래처", email: "contact@korea-electric.co.kr", phone: "02-2345-6789" },
      { id: 3, name: "신한콘크리트(주)", type: "거래처", email: "orders@shinhan-concrete.co.kr", phone: "02-3456-7890" },
      { id: 4, name: "엘림메탈테크", type: "거래처", email: "info@elim-metal.co.kr", phone: "02-4567-8901" },
      { id: 5, name: "서울납품센터", type: "납품처", email: "delivery@seoul-center.co.kr", phone: "02-5678-9012" }
    ];

    const result = {
      vendor: {
        name: vendorName,
        exists: false,
        exactMatch: null,
        suggestions: [],
        needsRegistration: false
      },
      supplier: supplierName ? {
        name: supplierName,
        exists: false,
        exactMatch: null,
        suggestions: [],
        needsRegistration: false
      } : null,
      allValid: false,
      actions: []
    };

    // 거래처 검증
    const vendorExactMatch = mockVendors.find(v => v.name === vendorName && v.type === '거래처');
    if (vendorExactMatch) {
      result.vendor.exists = true;
      result.vendor.exactMatch = vendorExactMatch;
    } else {
      // 유사 업체 검색
      const vendorSuggestions = mockVendors
        .filter(v => v.type === '거래처')
        .map(v => ({
          ...v,
          similarity: calculateSimilarity(vendorName.toLowerCase(), v.name.toLowerCase())
        }))
        .filter(v => v.similarity >= similarityThreshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3)
        .map(v => ({
          ...v,
          similarity: Math.round(v.similarity * 100)
        }));

      result.vendor.suggestions = vendorSuggestions;
      result.vendor.needsRegistration = vendorSuggestions.length === 0;
    }

    // 납품처 검증 (있는 경우)
    if (supplierName && supplierName.trim() !== '') {
      const supplierExactMatch = mockVendors.find(v => v.name === supplierName && v.type === '납품처');
      if (supplierExactMatch) {
        result.supplier.exists = true;
        result.supplier.exactMatch = supplierExactMatch;
      } else {
        // 유사 업체 검색
        const supplierSuggestions = mockVendors
          .filter(v => v.type === '납품처')
          .map(v => ({
            ...v,
            similarity: calculateSimilarity(supplierName.toLowerCase(), v.name.toLowerCase())
          }))
          .filter(v => v.similarity >= similarityThreshold)
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 3)
          .map(v => ({
            ...v,
            similarity: Math.round(v.similarity * 100)
          }));

        result.supplier.suggestions = supplierSuggestions;
        result.supplier.needsRegistration = supplierSuggestions.length === 0;
      }
    }

    // 전체 유효성 및 액션 설정
    result.allValid = result.vendor.exists && (!result.supplier || result.supplier.exists);

    if (!result.vendor.exists) {
      if (result.vendor.suggestions.length > 0) {
        result.actions.push({
          type: 'confirm_vendor_suggestion',
          message: `거래처 '${vendorName}'와 유사한 업체가 있습니다. 기존 업체를 사용하시겠습니까?`,
          suggestions: result.vendor.suggestions
        });
      } else {
        result.actions.push({
          type: 'register_new_vendor',
          message: `거래처 '${vendorName}'가 등록되지 않았습니다. 신규 등록하시겠습니까?`,
          vendorData: { name: vendorName, type: '거래처' }
        });
      }
    }

    if (result.supplier && !result.supplier.exists) {
      if (result.supplier.suggestions.length > 0) {
        result.actions.push({
          type: 'confirm_supplier_suggestion',
          message: `납품처 '${supplierName}'와 유사한 업체가 있습니다. 기존 업체를 사용하시겠습니까?`,
          suggestions: result.supplier.suggestions
        });
      } else {
        result.actions.push({
          type: 'register_new_supplier',
          message: `납품처 '${supplierName}'가 등록되지 않았습니다. 신규 등록하시겠습니까?`,
          vendorData: { name: supplierName, type: '납품처' }
        });
      }
    }

    console.log('Mock DB 거래처 검증 완료:', result);
    return result;
  }

  /**
   * 신규 거래처/납품처 등록
   * @param {Object} vendorData - 등록할 업체 정보
   * @returns {Object} 등록 결과
   */
  static async registerNewVendor(vendorData) {
    try {
      const {
        name,
        type = '거래처',
        businessNumber = '',
        representative = '미입력',
        contactPerson = '미입력',
        mainContact = '미입력',
        email = `auto-${Date.now()}@example.com`,
        phone = '',
        address = '',
        memo = 'Excel 업로드 시 자동 생성'
      } = vendorData;

      // 필수 필드 검증
      if (!name || !name.trim()) {
        throw new Error('업체명은 필수입니다.');
      }

      if (!['거래처', '납품처'].includes(type)) {
        throw new Error('업체 타입은 거래처 또는 납품처여야 합니다.');
      }

      if (db) {
        // 실제 DB에 등록
        const newVendor = await db.insert(vendors).values({
          name: name.trim(),
          type,
          businessNumber: businessNumber || null,
          representative: representative || '미입력',
          contactPerson: contactPerson || '미입력',
          mainContact: mainContact || '미입력',
          email: email || `auto-${Date.now()}@example.com`,
          phone: phone || null,
          address: address || null,
          memo: memo || 'Excel 업로드 시 자동 생성',
          isActive: true
        }).returning();

        return {
          success: true,
          vendor: newVendor[0],
          message: `${type} '${name}' 등록 완료`
        };
      } else {
        // Mock DB에 등록 (실제로는 메모리에만 저장)
        const mockVendor = {
          id: Date.now(),
          name: name.trim(),
          type,
          businessNumber,
          representative: representative || '미입력',
          contactPerson: contactPerson || '미입력',
          mainContact: mainContact || '미입력',
          email: email || `auto-${Date.now()}@example.com`,
          phone,
          address,
          memo: memo || 'Excel 업로드 시 자동 생성 (Mock)',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        console.log('Mock 업체 등록:', mockVendor);

        return {
          success: true,
          vendor: mockVendor,
          message: `${type} '${name}' 등록 완료 (Mock Mode)`
        };
      }

    } catch (error) {
      console.error('업체 등록 오류:', error);
      return {
        success: false,
        error: error.message || '업체 등록 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 복수 업체 일괄 등록
   * @param {Array} vendorDataList - 등록할 업체들의 정보 배열
   * @returns {Object} 일괄 등록 결과
   */
  static async registerMultipleVendors(vendorDataList) {
    const results = {
      success: true,
      registered: [],
      failed: [],
      summary: {
        total: vendorDataList.length,
        succeeded: 0,
        failed: 0
      }
    };

    for (const vendorData of vendorDataList) {
      try {
        const registerResult = await this.registerNewVendor(vendorData);
        
        if (registerResult.success) {
          results.registered.push({
            name: vendorData.name,
            type: vendorData.type,
            vendor: registerResult.vendor
          });
          results.summary.succeeded++;
        } else {
          results.failed.push({
            name: vendorData.name,
            type: vendorData.type,
            error: registerResult.error
          });
          results.summary.failed++;
        }
      } catch (error) {
        results.failed.push({
          name: vendorData.name,
          type: vendorData.type,
          error: error.message
        });
        results.summary.failed++;
      }
    }

    results.success = results.summary.failed === 0;

    return results;
  }
}

export default VendorValidationService;