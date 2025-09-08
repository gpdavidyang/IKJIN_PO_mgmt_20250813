/**
 * Vercel 서버리스 환경을 위한 한글 폰트 최적화 유틸리티
 * 메모리 효율적인 폰트 관리 및 Base64 임베딩
 */

import * as fs from 'fs';
import * as path from 'path';

export interface OptimizedFont {
  name: string;
  base64Data: string;
  size: number;
  format: 'ttf' | 'woff' | 'woff2';
}

export class VercelFontOptimizer {
  private static readonly FONTS_DIR = path.join(process.cwd(), 'fonts');
  private static readonly OPTIMIZED_FONTS_DIR = path.join(process.cwd(), 'fonts', 'optimized');
  
  // 서버리스 환경용 경량 한글 폰트 Base64 (필수 한글 문자셋만 포함)
  // 실제 프로덕션에서는 서브셋된 폰트 파일을 사용해야 함
  private static readonly EMBEDDED_KOREAN_FONT_BASE64 = 'data:font/truetype;base64,';
  
  /**
   * Vercel 환경에서 사용할 수 있는 최적화된 한글 폰트 반환
   */
  static getOptimizedKoreanFont(): OptimizedFont | null {
    try {
      console.log('🔍 [VercelFont] 최적화된 한글 폰트 탐색...');
      
      // 1. 최적화된 폰트 디렉토리 확인
      const optimizedFontsPath = this.OPTIMIZED_FONTS_DIR;
      
      if (fs.existsSync(optimizedFontsPath)) {
        const optimizedFiles = fs.readdirSync(optimizedFontsPath)
          .filter(file => file.endsWith('.ttf') && file.includes('korean'))
          .sort(); // 알파벳 순으로 정렬하여 일관된 선택
        
        console.log(`📁 [VercelFont] 최적화된 폰트 파일: ${optimizedFiles.length}개`);
        
        for (const file of optimizedFiles) {
          const filePath = path.join(optimizedFontsPath, file);
          const stats = fs.statSync(filePath);
          
          // 서버리스 환경에 적합한 크기 체크 (2MB 이하)
          if (stats.size <= 2 * 1024 * 1024) {
            try {
              const fontBuffer = fs.readFileSync(filePath);
              const base64Data = fontBuffer.toString('base64');
              
              console.log(`✅ [VercelFont] 최적화된 폰트 로드: ${file} (${Math.round(stats.size / 1024)}KB)`);
              
              return {
                name: file.replace('.ttf', ''),
                base64Data,
                size: stats.size,
                format: 'ttf'
              };
            } catch (error) {
              console.warn(`⚠️ [VercelFont] 폰트 로드 실패: ${file}`, error);
              continue;
            }
          }
        }
      }
      
      // 2. 기본 폰트 중 크기가 작은 것 시도
      const fallbackFonts = [
        'NanumGothic-Regular.ttf',
        'NotoSansKR-Regular.ttf'
      ];
      
      for (const fontFile of fallbackFonts) {
        const fontPath = path.join(this.FONTS_DIR, fontFile);
        
        if (fs.existsSync(fontPath)) {
          const stats = fs.statSync(fontPath);
          
          // NanumGothic은 상대적으로 작음 (290KB)
          if (fontFile === 'NanumGothic-Regular.ttf' || stats.size <= 1 * 1024 * 1024) {
            try {
              const fontBuffer = fs.readFileSync(fontPath);
              const base64Data = fontBuffer.toString('base64');
              
              console.log(`✅ [VercelFont] 폴백 폰트 로드: ${fontFile} (${Math.round(stats.size / 1024)}KB)`);
              
              return {
                name: fontFile.replace('.ttf', ''),
                base64Data,
                size: stats.size,
                format: 'ttf'
              };
            } catch (error) {
              console.warn(`⚠️ [VercelFont] 폴백 폰트 로드 실패: ${fontFile}`, error);
              continue;
            }
          }
        }
      }
      
      console.log('❌ [VercelFont] 사용 가능한 한글 폰트를 찾을 수 없음');
      return null;
      
    } catch (error) {
      console.error('💥 [VercelFont] 폰트 최적화 과정에서 오류 발생:', error);
      return null;
    }
  }
  
  /**
   * 한글 폰트가 필요한 텍스트인지 검사
   */
  static containsKorean(text: string): boolean {
    return /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(text);
  }
  
  /**
   * 폰트 서브셋 생성 (발주서에 필요한 한글 문자만 포함)
   * 이 메서드는 개발/빌드 시에만 사용됨
   */
  static async createSubsetFont(): Promise<void> {
    try {
      console.log('🔧 [VercelFont] 폰트 서브셋 생성 시도...');
      
      // 발주서에서 사용되는 필수 한글 문자셋
      const essentialKoreanChars = [
        // 기본 발주서 용어
        '구매발주서', '발주업체', '수주업체', '현장', '정보', '품목명', '규격', '수량', '단위', '단가', '금액', '합계',
        '소계', '부가세', '총금액', '특이사항', '비고', '업체명', '사업자번호', '대표자', '담당자', '연락처',
        '주소', '이메일', '발주일', '납기일', '순번', '생성일시',
        
        // 회사명
        '익진엔지니어링', '삼성물산', '현대건설', '래미안', '원베일리', '신축공사',
        
        // 건설자재
        '철근', '레미콘', '콘크리트', '합판', '거푸집', '시멘트', '강재', '자재',
        
        // 기본 한글 문자
        'ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
        'ㅏ', 'ㅑ', 'ㅓ', 'ㅕ', 'ㅗ', 'ㅛ', 'ㅜ', 'ㅠ', 'ㅡ', 'ㅣ'
      ].join('');
      
      // 중복 제거
      const uniqueChars = [...new Set(essentialKoreanChars)].join('');
      console.log(`📝 [VercelFont] 서브셋 문자 수: ${uniqueChars.length}개`);
      
      // 실제 폰트 서브셋은 외부 도구 필요 (예: pyftsubset, fonttools 등)
      // 현재는 메시지만 출력
      console.log('💡 [VercelFont] 폰트 서브셋 생성은 별도 도구가 필요합니다:');
      console.log('   1. fonttools 설치: pip install fonttools');
      console.log('   2. 서브셋 생성: pyftsubset NotoSansKR-Regular.ttf --unicodes="U+AC00-U+D7AF" --output-file="NotoSansKR-Subset.ttf"');
      console.log('   3. 생성된 파일을 fonts/optimized/ 디렉토리에 배치');
      
    } catch (error) {
      console.error('❌ [VercelFont] 폰트 서브셋 생성 실패:', error);
    }
  }
  
  /**
   * Vercel 환경에서 폰트 최적화 상태 진단
   */
  static diagnose(): {
    environment: string;
    memoryOptimized: boolean;
    hasOptimizedFonts: boolean;
    hasOriginalFonts: boolean;
    recommendedActions: string[];
  } {
    const hasOptimized = fs.existsSync(this.OPTIMIZED_FONTS_DIR);
    const hasOriginal = fs.existsSync(path.join(this.FONTS_DIR, 'NotoSansKR-Regular.ttf'));
    
    const recommendations: string[] = [];
    
    if (!hasOptimized) {
      recommendations.push('최적화된 폰트 디렉토리 생성 필요 (fonts/optimized/)');
      recommendations.push('경량 한글 폰트 서브셋 생성 권장');
    }
    
    if (process.env.VERCEL && hasOriginal) {
      const stats = fs.statSync(path.join(this.FONTS_DIR, 'NotoSansKR-Regular.ttf'));
      if (stats.size > 2 * 1024 * 1024) {
        recommendations.push('대용량 폰트 파일로 인한 메모리 오버헤드 위험');
        recommendations.push('폰트 서브셋 또는 경량 대안 폰트 사용 권장');
      }
    }
    
    return {
      environment: process.env.VERCEL ? 'Vercel Serverless' : 'Local',
      memoryOptimized: hasOptimized,
      hasOptimizedFonts: hasOptimized,
      hasOriginalFonts: hasOriginal,
      recommendedActions: recommendations
    };
  }
}

export default VercelFontOptimizer;