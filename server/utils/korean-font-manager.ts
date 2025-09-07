/**
 * 한글 폰트 관리 유틸리티
 * Vercel 서버리스 환경에서 안정적인 한글 폰트 지원
 */

import * as fs from 'fs';
import * as path from 'path';

export interface FontInfo {
  name: string;
  path: string;
  base64?: string;
  available: boolean;
  size?: number;
}

export class KoreanFontManager {
  private static instance: KoreanFontManager;
  private fontCache = new Map<string, FontInfo>();
  private base64Cache = new Map<string, string>();

  // 지원 폰트 목록 (우선순위 순)
  private static readonly FONT_PRIORITIES: FontInfo[] = [
    {
      name: 'NotoSansKR',
      path: path.join(process.cwd(), 'fonts', 'NotoSansKR-Regular.ttf'),
      available: false
    },
    {
      name: 'NanumGothic', 
      path: path.join(process.cwd(), 'fonts', 'NanumGothic-Regular.ttf'),
      available: false
    },
    // Fallback 시스템 폰트 (로컬 환경용)
    {
      name: 'AppleGothic',
      path: '/System/Library/Fonts/Supplemental/AppleGothic.ttf',
      available: false
    },
    {
      name: 'AppleSDGothicNeo', 
      path: '/System/Library/Fonts/AppleSDGothicNeo.ttc',
      available: false
    },
    {
      name: 'MalgunGothic',
      path: 'C:\\Windows\\Fonts\\malgun.ttf',
      available: false
    },
    {
      name: 'NanumGothicLinux',
      path: '/usr/share/fonts/truetype/nanum/NanumGothic.ttf',
      available: false
    }
  ];

  private constructor() {
    this.initializeFonts();
  }

  public static getInstance(): KoreanFontManager {
    if (!KoreanFontManager.instance) {
      KoreanFontManager.instance = new KoreanFontManager();
    }
    return KoreanFontManager.instance;
  }

  /**
   * 사용 가능한 폰트 초기화 및 검색
   */
  private initializeFonts(): void {
    console.log('🔍 [FontManager] 한글 폰트 초기화 시작...');
    
    for (const font of KoreanFontManager.FONT_PRIORITIES) {
      try {
        if (fs.existsSync(font.path)) {
          const stats = fs.statSync(font.path);
          font.available = true;
          font.size = stats.size;
          this.fontCache.set(font.name, { ...font });
          console.log(`✅ [FontManager] 폰트 발견: ${font.name} (${Math.round(stats.size / 1024)}KB)`);
        } else {
          font.available = false;
          console.log(`❌ [FontManager] 폰트 없음: ${font.name} - ${font.path}`);
        }
      } catch (error) {
        font.available = false;
        console.log(`⚠️ [FontManager] 폰트 접근 실패: ${font.name} - ${error}`);
      }
    }
    
    const availableFonts = Array.from(this.fontCache.values()).filter(f => f.available);
    console.log(`📊 [FontManager] 총 ${availableFonts.length}개 한글 폰트 사용 가능`);
  }

  /**
   * 최적의 한글 폰트 선택
   */
  public getBestKoreanFont(): FontInfo | null {
    // 캐시된 폰트 중 사용 가능한 첫 번째 폰트 반환
    for (const font of KoreanFontManager.FONT_PRIORITIES) {
      const cachedFont = this.fontCache.get(font.name);
      if (cachedFont && cachedFont.available) {
        return cachedFont;
      }
    }
    return null;
  }

  /**
   * 폰트를 Base64로 인코딩 (서버리스 환경용)
   */
  public async getFontAsBase64(fontName?: string): Promise<string | null> {
    try {
      const font = fontName 
        ? this.fontCache.get(fontName)
        : this.getBestKoreanFont();

      if (!font || !font.available) {
        console.warn(`⚠️ [FontManager] 폰트 사용 불가: ${fontName || 'auto-select'}`);
        return null;
      }

      // 캐시에서 Base64 확인
      const cacheKey = font.name;
      if (this.base64Cache.has(cacheKey)) {
        console.log(`💾 [FontManager] Base64 캐시 히트: ${font.name}`);
        return this.base64Cache.get(cacheKey)!;
      }

      // 파일을 Base64로 인코딩
      const fontBuffer = fs.readFileSync(font.path);
      const base64Data = fontBuffer.toString('base64');
      
      // 캐시에 저장
      this.base64Cache.set(cacheKey, base64Data);
      
      console.log(`✅ [FontManager] Base64 인코딩 완료: ${font.name} (${Math.round(base64Data.length / 1024)}KB)`);
      return base64Data;

    } catch (error) {
      console.error(`❌ [FontManager] Base64 인코딩 실패:`, error);
      return null;
    }
  }

  /**
   * PDFKit에서 사용할 폰트 버퍼 반환
   */
  public getFontBuffer(fontName?: string): Buffer | null {
    try {
      const font = fontName 
        ? this.fontCache.get(fontName)
        : this.getBestKoreanFont();

      if (!font || !font.available) {
        return null;
      }

      return fs.readFileSync(font.path);
    } catch (error) {
      console.error(`❌ [FontManager] 폰트 버퍼 로드 실패:`, error);
      return null;
    }
  }

  /**
   * 사용 가능한 폰트 목록 반환
   */
  public getAvailableFonts(): FontInfo[] {
    return Array.from(this.fontCache.values()).filter(f => f.available);
  }

  /**
   * 폰트 지원 상태 보고서
   */
  public getFontReport(): {
    environment: string;
    totalFonts: number;
    availableFonts: number;
    recommendedFont: string | null;
    fonts: FontInfo[];
  } {
    const availableFonts = this.getAvailableFonts();
    const bestFont = this.getBestKoreanFont();
    
    return {
      environment: process.env.VERCEL ? 'Vercel' : 'Local',
      totalFonts: KoreanFontManager.FONT_PRIORITIES.length,
      availableFonts: availableFonts.length,
      recommendedFont: bestFont?.name || null,
      fonts: availableFonts
    };
  }

  /**
   * 한글 텍스트 안전 변환 (폰트 없을 때 대체)
   */
  public safeKoreanText(text: string, hasKoreanFont: boolean = true): string {
    if (!text) return '';
    
    if (hasKoreanFont) {
      return text
        .replace(/[\x00-\x1F\x7F]/g, '') // 제어 문자 제거
        .replace(/[\u2028\u2029]/g, '') // 줄 구분자 제거
        .trim();
    }

    // 한글 폰트가 없는 경우 영문 매핑
    const koreanToEnglish: { [key: string]: string } = {
      '구매발주서': 'Purchase Order',
      '발주서': 'Purchase Order', 
      '발주번호': 'Order No',
      '발주업체': 'Issuer Company',
      '수주업체': 'Vendor Company', 
      '거래처': 'Vendor',
      '품목명': 'Item Name',
      '품목': 'Item',
      '규격': 'Specification',
      '수량': 'Quantity',
      '단위': 'Unit',
      '단가': 'Unit Price',
      '금액': 'Amount',
      '합계': 'Total',
      '총 금액': 'Total Amount',
      '소계': 'Subtotal',
      '부가세': 'VAT',
      '사업자등록번호': 'Business Registration No',
      '사업자번호': 'Business No',
      '대표자': 'Representative',
      '담당자': 'Contact Person',
      '연락처': 'Phone',
      '전화번호': 'Phone',
      '주소': 'Address',
      '이메일': 'Email',
      '현장명': 'Project Name',
      '현장정보': 'Project Info',
      '현장': 'Project',
      '발주일': 'Order Date',
      '납기일': 'Delivery Date',
      '등록일': 'Created Date',
      '작성자': 'Creator',
      '특이사항': 'Remarks',
      '비고': 'Notes',
      '참고사항': 'Reference',
      '업체명': 'Company Name',
      '일정': 'Schedule',
      '순번': 'No'
    };

    let result = text;
    
    // 주요 한글 단어를 영문으로 대체
    for (const [korean, english] of Object.entries(koreanToEnglish)) {
      result = result.replace(new RegExp(korean, 'g'), english);
    }

    // 남은 한글 문자를 [Korean Text]로 대체
    if (/[ᄀ-ᇿ㄰-㆏ꥠ-꥿가-힯ힰ-퟿]/g.test(result)) {
      result = result.replace(/[ᄀ-ᇿ㄰-㆏ꥠ-꥿가-힯ힰ-퟿]+/g, '[Korean Text]');
    }

    return result
      .replace(/[\x00-\x1F\x7F]/g, '') // 제어 문자 제거
      .replace(/[\u2028\u2029]/g, '') // 줄 구분자 제거
      .trim();
  }

  /**
   * Vercel 환경에서 폰트 최적화 상태 확인
   */
  public isVercelOptimized(): boolean {
    if (!process.env.VERCEL) {
      return true; // 로컬 환경은 항상 최적화된 것으로 간주
    }

    // Vercel 환경에서는 프로젝트 내 폰트만 사용 가능
    const projectFonts = this.getAvailableFonts().filter(font => 
      font.path.includes(process.cwd())
    );

    return projectFonts.length > 0;
  }
}

// 싱글톤 인스턴스 내보내기
export const fontManager = KoreanFontManager.getInstance();