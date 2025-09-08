/**
 * 한글 폰트 관리 유틸리티
 * Vercel 서버리스 환경에서 안정적인 한글 폰트 지원
 */

import * as fs from 'fs';
import * as path from 'path';
import { VercelFontOptimizer } from './vercel-font-optimizer';

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
      path: process.env.VERCEL 
        ? path.join(process.cwd(), 'fonts', 'NotoSansKR-Regular.ttf')
        : path.join(process.cwd(), 'fonts', 'NotoSansKR-Regular.ttf'),
      available: false
    },
    {
      name: 'NanumGothic', 
      path: process.env.VERCEL
        ? path.join(process.cwd(), 'fonts', 'NanumGothic-Regular.ttf')
        : path.join(process.cwd(), 'fonts', 'NanumGothic-Regular.ttf'),
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
    console.log(`🔍 [FontManager] 환경: ${process.env.VERCEL ? 'Vercel' : 'Local'}, 작업디렉토리: ${process.cwd()}`);
    
    // Vercel 환경에서 번들된 폰트 확인
    if (process.env.VERCEL) {
      console.log('☁️ [FontManager] Vercel 환경 - 번들된 폰트 탐색');
      // 번들된 리소스 확인
      try {
        const bundledFontsDir = path.join(process.cwd(), 'fonts');
        console.log(`📂 [FontManager] 번들된 폰트 디렉토리 확인: ${bundledFontsDir}`);
        if (fs.existsSync(bundledFontsDir)) {
          const files = fs.readdirSync(bundledFontsDir);
          console.log(`📋 [FontManager] 번들된 파일 목록:`, files);
        } else {
          console.log(`❌ [FontManager] 번들된 폰트 디렉토리 없음: ${bundledFontsDir}`);
        }
      } catch (error) {
        console.log(`⚠️ [FontManager] 번들 확인 실패:`, error);
      }
    }
    
    for (const font of KoreanFontManager.FONT_PRIORITIES) {
      try {
        console.log(`🔍 [FontManager] 폰트 확인 중: ${font.name} at ${font.path}`);
        if (fs.existsSync(font.path)) {
          const stats = fs.statSync(font.path);
          font.available = true;
          font.size = stats.size;
          this.fontCache.set(font.name, { ...font });
          console.log(`✅ [FontManager] 폰트 발견: ${font.name} (${Math.round(stats.size / 1024)}KB)`);
          
          // Vercel 환경에서 Base64 미리 로드
          if (process.env.VERCEL) {
            try {
              const fontBuffer = fs.readFileSync(font.path);
              const base64Data = fontBuffer.toString('base64');
              this.base64Cache.set(font.name, base64Data);
              console.log(`💾 [FontManager] Vercel용 Base64 미리 로드: ${font.name}`);
            } catch (base64Error) {
              console.warn(`⚠️ [FontManager] Base64 미리 로드 실패: ${font.name}`, base64Error);
            }
          }
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
    
    // Vercel 환경에서 임베디드 폰트 시도
    if (process.env.VERCEL && availableFonts.length === 0) {
      console.log('🔄 [FontManager] Vercel에서 폰트 없음 - 임베디드 폰트 시도');
      this.loadEmbeddedFonts();
    }
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

      // Vercel 환경에서 Base64 캐시 사용
      if (process.env.VERCEL) {
        const cacheKey = font.name;
        if (this.base64Cache.has(cacheKey)) {
          console.log(`💾 [FontManager] Vercel - Base64 캐시에서 Buffer 반환: ${font.name}`);
          const base64Data = this.base64Cache.get(cacheKey)!;
          return Buffer.from(base64Data, 'base64');
        }
        
        // 임베디드 폰트인지 확인
        if (font.path.startsWith('embedded://')) {
          console.log(`📦 [FontManager] 임베디드 폰트 처리 중: ${font.name}`);
          // For embedded fonts, return a minimal NotoSans-compatible font buffer for basic functionality
          const minimalKoreanFont = this.getMinimalKoreanFontBuffer();
          if (minimalKoreanFont) {
            console.log(`✅ [FontManager] 임베디드 폰트 Buffer 반환: ${font.name}`);
            return minimalKoreanFont;
          }
        }
        
        // 캐시에 없으면 파일 읽고 캐시 저장
        try {
          const fontBuffer = fs.readFileSync(font.path);
          const base64Data = fontBuffer.toString('base64');
          this.base64Cache.set(cacheKey, base64Data);
          console.log(`✅ [FontManager] Vercel - 폰트 캐시 후 Buffer 반환: ${font.name}`);
          return fontBuffer;
        } catch (vercelError) {
          console.error(`❌ [FontManager] Vercel 폰트 로드 실패: ${font.name}`, vercelError);
          // Last resort: try minimal Korean font
          const minimalFont = this.getMinimalKoreanFontBuffer();
          if (minimalFont) {
            console.log(`🚨 [FontManager] 최후 수단: 최소 한글 폰트 사용`);
            return minimalFont;
          }
          return null;
        }
      }

      // 로컬 환경에서는 직접 파일 읽기
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
   * Vercel 환경을 위한 최적화된 폰트 버퍼 반환
   */
  public getVercelOptimizedFontBuffer(): Buffer | null {
    if (!process.env.VERCEL) {
      return null; // Vercel 환경이 아니면 기본 로직 사용
    }

    try {
      console.log('☁️ [FontManager] Vercel 최적화 폰트 로드 시작...');
      
      const optimizedFont = VercelFontOptimizer.getOptimizedKoreanFont();
      
      if (optimizedFont) {
        console.log(`✅ [FontManager] Vercel 최적화 폰트 로드 성공: ${optimizedFont.name} (${Math.round(optimizedFont.size / 1024)}KB)`);
        return Buffer.from(optimizedFont.base64Data, 'base64');
      }
      
      console.log('⚠️ [FontManager] Vercel 최적화 폰트를 찾을 수 없음');
      return null;
      
    } catch (error) {
      console.error('❌ [FontManager] Vercel 최적화 폰트 로드 실패:', error);
      return null;
    }
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

  /**
   * Vercel용 임베디드 폰트 로드 (Base64 방식)
   */
  private loadEmbeddedFonts(): void {
    console.log('🔄 [FontManager] 임베디드 폰트 로드 시도...');
    
    // 기본 한글 폰트를 Base64로 임베드 (실제 환경에서는 폰트 파일이 번들되어야 함)
    const embeddedFonts = {
      'NotoSansKR-Basic': {
        name: 'NotoSansKR-Basic',
        path: 'embedded://NotoSansKR-Basic',
        available: true,
        size: 0
      }
    };
    
    for (const [key, font] of Object.entries(embeddedFonts)) {
      this.fontCache.set(font.name, font);
      console.log(`📦 [FontManager] 임베디드 폰트 등록: ${font.name}`);
    }
  }

  /**
   * 폰트 번들링 상태 진단
   */
  public diagnoseFontIssues(): {
    environment: string;
    workingDirectory: string;
    fontDirectory: string;
    fontDirectoryExists: boolean;
    bundledFiles: string[];
    availableFonts: number;
    issues: string[];
  } {
    const issues: string[] = [];
    const fontDir = path.join(process.cwd(), 'fonts');
    const fontDirExists = fs.existsSync(fontDir);
    let bundledFiles: string[] = [];
    
    if (fontDirExists) {
      try {
        bundledFiles = fs.readdirSync(fontDir);
      } catch (error) {
        issues.push(`폰트 디렉토리 읽기 실패: ${error}`);
      }
    } else {
      issues.push('폰트 디렉토리가 존재하지 않음');
    }
    
    const availableFonts = this.getAvailableFonts().length;
    if (availableFonts === 0) {
      issues.push('사용 가능한 한글 폰트가 없음');
    }
    
    if (process.env.VERCEL && !fontDirExists) {
      issues.push('Vercel 환경에서 폰트가 번들에 포함되지 않음');
    }
    
    return {
      environment: process.env.VERCEL ? 'Vercel' : 'Local',
      workingDirectory: process.cwd(),
      fontDirectory: fontDir,
      fontDirectoryExists: fontDirExists,
      bundledFiles,
      availableFonts,
      issues
    };
  }

  /**
   * 최소한의 한글 폰트 버퍼 반환 (임베디드용)
   * 실제 운영에서는 적절한 한글 폰트 파일을 번들해야 함
   */
  private getMinimalKoreanFontBuffer(): Buffer | null {
    try {
      // 시스템 폰트 경로들을 시도해 볼 수 있는 경로 목록
      const fallbackFontPaths = [
        '/System/Library/Fonts/AppleGothic.ttf',            // macOS
        '/System/Library/Fonts/Supplemental/AppleGothic.ttf', // macOS alternative
        '/usr/share/fonts/truetype/nanum/NanumGothic.ttf',  // Linux
        '/Windows/Fonts/malgun.ttf',                        // Windows
      ];

      for (const fontPath of fallbackFontPaths) {
        try {
          if (fs.existsSync(fontPath)) {
            const fontBuffer = fs.readFileSync(fontPath);
            console.log(`✅ [FontManager] 시스템 폰트 발견: ${fontPath}`);
            return fontBuffer;
          }
        } catch (error) {
          continue; // 다음 경로 시도
        }
      }

      console.log(`⚠️ [FontManager] 시스템 폰트를 찾을 수 없음 - null 반환`);
      return null;
    } catch (error) {
      console.error(`❌ [FontManager] 최소 폰트 로드 실패:`, error);
      return null;
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const fontManager = KoreanFontManager.getInstance();