/**
 * 임베디드 폰트 관리 유틸리티
 * Vercel 환경에서 폰트 파일이 없을 때의 최후 수단
 */

import * as fs from 'fs';
import * as path from 'path';

export class EmbeddedFontManager {
  /**
   * 폰트 파일을 Base64로 인코딩하여 코드에 임베드할 수 있는 형태로 변환
   * 개발 시에만 사용, 실제 운영에서는 파일 시스템 사용 권장
   */
  static generateEmbeddedFont(fontPath: string): string | null {
    try {
      const fontBuffer = fs.readFileSync(fontPath);
      return fontBuffer.toString('base64');
    } catch (error) {
      console.error('폰트 임베딩 실패:', error);
      return null;
    }
  }

  /**
   * 임베디드 Base64 폰트를 Buffer로 변환
   */
  static base64ToBuffer(base64Data: string): Buffer {
    return Buffer.from(base64Data, 'base64');
  }

  /**
   * 현재 시스템에서 사용 가능한 한글 폰트 찾기
   */
  static findSystemKoreanFonts(): string[] {
    const possiblePaths = [
      // macOS
      '/System/Library/Fonts/AppleSDGothicNeo.ttc',
      '/System/Library/Fonts/Supplemental/AppleGothic.ttf',
      '/Library/Fonts/NanumGothic.ttf',
      
      // Windows
      'C:\\Windows\\Fonts\\malgun.ttf',
      'C:\\Windows\\Fonts\\gulim.ttc',
      
      // Linux
      '/usr/share/fonts/truetype/nanum/NanumGothic.ttf',
      '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
    ];

    return possiblePaths.filter(fontPath => {
      try {
        return fs.existsSync(fontPath);
      } catch {
        return false;
      }
    });
  }

  /**
   * 긴급 상황용 최소 한글 글리프 지원 확인
   */
  static validateKoreanFontSupport(fontBuffer: Buffer): boolean {
    // 간단한 검증: 폰트 파일 크기와 헤더 확인
    if (fontBuffer.length < 1000) {
      return false; // 너무 작은 폰트 파일
    }

    // TTF/OTF 헤더 확인
    const header = fontBuffer.slice(0, 4).toString('binary');
    return header === '\x00\x01\x00\x00' || // TTF
           header === 'OTTO' || // OTF
           header === 'ttcf'; // TTC
  }

  /**
   * 운영 환경에서 폰트 문제 해결 가이드
   */
  static getProductionFontTroubleshootingGuide(): {
    issue: string;
    solution: string;
    priority: 'high' | 'medium' | 'low';
  }[] {
    return [
      {
        issue: 'Vercel에서 폰트 파일을 찾을 수 없음',
        solution: 'vercel.json의 includeFiles 설정과 빌드 스크립트의 폰트 복사 명령 확인',
        priority: 'high'
      },
      {
        issue: 'PDFKit에서 폰트 등록 실패',
        solution: '폰트 파일 권한과 경로 확인, Buffer 방식으로 로드 시도',
        priority: 'high'
      },
      {
        issue: '한글 텍스트가 깨져서 표시됨',
        solution: 'safeKoreanText 함수를 통한 텍스트 변환 적용',
        priority: 'medium'
      },
      {
        issue: 'PDF 생성 속도가 느림',
        solution: '폰트 캐싱 최적화 및 불필요한 폰트 제거',
        priority: 'low'
      }
    ];
  }

  /**
   * 시스템 정보와 함께 폰트 상태 리포트 생성
   */
  static generateSystemReport(): {
    platform: string;
    nodeVersion: string;
    workingDirectory: string;
    environment: string;
    availableSystemFonts: string[];
    projectFonts: {path: string; exists: boolean; size?: number}[];
    recommendations: string[];
  } {
    const projectFontDir = path.join(process.cwd(), 'fonts');
    const projectFonts = [
      'NotoSansKR-Regular.ttf',
      'NanumGothic-Regular.ttf'
    ].map(filename => {
      const fontPath = path.join(projectFontDir, filename);
      let size: number | undefined;
      let exists = false;
      
      try {
        if (fs.existsSync(fontPath)) {
          exists = true;
          size = fs.statSync(fontPath).size;
        }
      } catch {}
      
      return { path: fontPath, exists, size };
    });

    const recommendations: string[] = [];
    
    if (projectFonts.every(f => !f.exists)) {
      recommendations.push('프로젝트 fonts/ 디렉토리에 한글 폰트 파일을 추가하세요');
    }
    
    if (process.env.VERCEL && projectFonts.some(f => !f.exists)) {
      recommendations.push('vercel.json의 includeFiles 설정을 확인하고 빌드 시 폰트 복사가 되는지 확인하세요');
    }

    return {
      platform: process.platform,
      nodeVersion: process.version,
      workingDirectory: process.cwd(),
      environment: process.env.NODE_ENV || 'development',
      availableSystemFonts: this.findSystemKoreanFonts(),
      projectFonts,
      recommendations
    };
  }
}