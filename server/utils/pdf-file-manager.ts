/**
 * PDF File Management System
 * 
 * PRD Requirements:
 * - FR-014: "엑셀 파일과 함께 엑셀파일을 PDF화 한 파일도 보존해야 함"
 * 
 * Features:
 * - PDF 파일 생성 및 저장 관리
 * - 임시 파일 정리 및 생명주기 관리
 * - PDF 파일 검증 및 무결성 확인
 * - 저장소 관리 및 용량 최적화
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);

export interface PDFFileInfo {
  path: string;
  filename: string;
  size: number;
  createdAt: Date;
  isValid: boolean;
  orderNumber?: string;
  vendorName?: string;
}

export interface PDFCleanupOptions {
  maxAge?: number; // 최대 보관 기간 (밀리초)
  maxSize?: number; // 최대 총 용량 (바이트)
  keepRecent?: number; // 최근 파일 유지 개수
  dryRun?: boolean; // 실제 삭제하지 않고 로깅만
}

export class PDFFileManager {
  private static readonly PDF_DIRECTORIES = {
    // Use /tmp directory for serverless environments like Vercel
    temp: process.env.VERCEL ? path.join('/tmp', 'temp-pdf') : path.join(process.cwd(), 'uploads/temp-pdf'),
    archive: process.env.VERCEL ? path.join('/tmp', 'pdf-archive') : path.join(process.cwd(), 'uploads/pdf-archive'),
    orders: process.env.VERCEL ? path.join('/tmp', 'order-pdfs') : path.join(process.cwd(), 'uploads/order-pdfs')
  };

  /**
   * PDF 저장소 초기화
   */
  static async initializePDFStorage(): Promise<void> {
    console.log('📁 PDF 저장소 초기화 중...');
    
    for (const [type, dirPath] of Object.entries(this.PDF_DIRECTORIES)) {
      try {
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
          console.log(`✅ PDF 디렉토리 생성: ${type} -> ${dirPath}`);
        } else {
          console.log(`📁 PDF 디렉토리 확인: ${type} -> ${dirPath}`);
        }
      } catch (error) {
        console.error(`⚠️ PDF 디렉토리 생성/확인 실패 (${type}): ${error}`);
        // In serverless environments, we might not be able to create all directories
        // but /tmp should be writable
        if (process.env.VERCEL && !dirPath.startsWith('/tmp')) {
          console.log(`🔄 Serverless 환경에서 ${type} 디렉토리 접근 불가, /tmp 사용`);
        }
      }
    }
  }

  /**
   * PDF 파일을 적절한 디렉토리로 이동
   */
  static async archivePDF(
    sourcePath: string, 
    orderNumber?: string, 
    vendorName?: string
  ): Promise<string> {
    try {
      await this.initializePDFStorage();
      
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`소스 PDF 파일이 존재하지 않습니다: ${sourcePath}`);
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = orderNumber 
        ? `${orderNumber}_${vendorName || 'unknown'}_${timestamp}.pdf`
        : `pdf_${timestamp}.pdf`;
      
      const archivePath = path.join(this.PDF_DIRECTORIES.archive, filename);
      
      // 파일 복사 (원본 유지)
      fs.copyFileSync(sourcePath, archivePath);
      
      console.log(`📦 PDF 아카이브 완료: ${sourcePath} -> ${archivePath}`);
      return archivePath;
      
    } catch (error) {
      console.error('❌ PDF 아카이브 실패:', error);
      throw error;
    }
  }

  /**
   * 임시 PDF 파일 정리
   */
  static async cleanupTempPDFs(options: PDFCleanupOptions = {}): Promise<{
    cleaned: number;
    totalSize: number;
    errors: string[];
  }> {
    const {
      maxAge = 24 * 60 * 60 * 1000, // 24시간
      maxSize = 500 * 1024 * 1024, // 500MB
      keepRecent = 10,
      dryRun = false
    } = options;

    console.log('🧹 임시 PDF 파일 정리 시작...');
    console.log(`📊 설정: maxAge=${Math.round(maxAge / 1000 / 60)}분, maxSize=${Math.round(maxSize / 1024 / 1024)}MB, keepRecent=${keepRecent}, dryRun=${dryRun}`);

    let cleaned = 0;
    let totalSize = 0;
    const errors: string[] = [];

    try {
      const tempDir = this.PDF_DIRECTORIES.temp;
      
      if (!fs.existsSync(tempDir)) {
        console.log('📁 임시 PDF 디렉토리가 존재하지 않습니다.');
        return { cleaned: 0, totalSize: 0, errors: [] };
      }

      const files = await readdir(tempDir);
      const pdfFiles = files.filter(file => file.endsWith('.pdf'));
      
      if (pdfFiles.length === 0) {
        console.log('📁 정리할 임시 PDF 파일이 없습니다.');
        return { cleaned: 0, totalSize: 0, errors: [] };
      }

      console.log(`📊 발견된 임시 PDF 파일: ${pdfFiles.length}개`);

      // 파일 정보 수집
      const fileInfos: Array<{ path: string; stats: fs.Stats }> = [];
      
      for (const file of pdfFiles) {
        try {
          const filePath = path.join(tempDir, file);
          const stats = await stat(filePath);
          fileInfos.push({ path: filePath, stats });
          totalSize += stats.size;
        } catch (error) {
          errors.push(`파일 정보 조회 실패: ${file} - ${error}`);
        }
      }

      // 수정 시간 기준 정렬 (최신 순)
      fileInfos.sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      const now = new Date();
      
      for (let i = 0; i < fileInfos.length; i++) {
        const { path: filePath, stats } = fileInfos[i];
        const fileName = path.basename(filePath);
        const age = now.getTime() - stats.mtime.getTime();
        const shouldDelete = 
          age > maxAge || // 너무 오래된 파일
          i >= keepRecent || // 최근 파일 보관 개수 초과
          totalSize > maxSize; // 총 용량 초과

        if (shouldDelete) {
          try {
            if (dryRun) {
              console.log(`🔍 [DRY RUN] 삭제 대상: ${fileName} (${Math.round(stats.size / 1024)}KB, ${Math.round(age / 1000 / 60)}분 전)`);
            } else {
              await unlink(filePath);
              console.log(`🗑️ 삭제 완료: ${fileName} (${Math.round(stats.size / 1024)}KB)`);
            }
            cleaned++;
          } catch (error) {
            errors.push(`파일 삭제 실패: ${fileName} - ${error}`);
          }
        } else {
          console.log(`✅ 보관: ${fileName} (${Math.round(stats.size / 1024)}KB, ${Math.round(age / 1000 / 60)}분 전)`);
        }
      }

      console.log(`🧹 정리 완료: ${cleaned}개 파일 처리`);
      
      if (errors.length > 0) {
        console.log(`⚠️ 오류 발생: ${errors.length}건`);
        errors.forEach(error => console.log(`  - ${error}`));
      }

      return { cleaned, totalSize, errors };
      
    } catch (error) {
      console.error('❌ 임시 PDF 정리 중 오류:', error);
      errors.push(`정리 프로세스 오류: ${error}`);
      return { cleaned, totalSize, errors };
    }
  }

  /**
   * PDF 파일 목록 조회
   */
  static async listPDFFiles(directory: 'temp' | 'archive' | 'orders' = 'temp'): Promise<PDFFileInfo[]> {
    try {
      const dirPath = this.PDF_DIRECTORIES[directory];
      
      if (!fs.existsSync(dirPath)) {
        return [];
      }

      const files = await readdir(dirPath);
      const pdfFiles = files.filter(file => file.endsWith('.pdf'));
      
      const fileInfos: PDFFileInfo[] = [];
      
      for (const file of pdfFiles) {
        try {
          const filePath = path.join(dirPath, file);
          const stats = await stat(filePath);
          
          // 파일명에서 정보 추출
          const orderNumberMatch = file.match(/^([^_]+)_/);
          const vendorNameMatch = file.match(/^[^_]+_([^_]+)_/);
          
          fileInfos.push({
            path: filePath,
            filename: file,
            size: stats.size,
            createdAt: stats.birthtime,
            isValid: this.validatePDFFile(filePath),
            orderNumber: orderNumberMatch ? orderNumberMatch[1] : undefined,
            vendorName: vendorNameMatch ? vendorNameMatch[1] : undefined
          });
        } catch (error) {
          console.error(`파일 정보 조회 실패: ${file}`, error);
        }
      }

      return fileInfos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
    } catch (error) {
      console.error('PDF 파일 목록 조회 실패:', error);
      return [];
    }
  }

  /**
   * PDF 파일 검증
   */
  static validatePDFFile(pdfPath: string): boolean {
    try {
      if (!fs.existsSync(pdfPath)) {
        return false;
      }

      const stats = fs.statSync(pdfPath);
      
      // 최소 파일 크기 확인 (1KB 이상)
      if (stats.size < 1024) {
        return false;
      }

      // PDF 헤더 확인
      const buffer = fs.readFileSync(pdfPath, { start: 0, end: 4 });
      const header = buffer.toString();
      
      return header.startsWith('%PDF');
    } catch (error) {
      return false;
    }
  }

  /**
   * 저장소 사용량 통계
   */
  static async getStorageStats(): Promise<{
    temp: { count: number; size: number };
    archive: { count: number; size: number };
    orders: { count: number; size: number };
    total: { count: number; size: number };
  }> {
    const stats = {
      temp: { count: 0, size: 0 },
      archive: { count: 0, size: 0 },
      orders: { count: 0, size: 0 },
      total: { count: 0, size: 0 }
    };

    for (const [type, dirPath] of Object.entries(this.PDF_DIRECTORIES)) {
      try {
        if (fs.existsSync(dirPath)) {
          const files = await readdir(dirPath);
          const pdfFiles = files.filter(file => file.endsWith('.pdf'));
          
          let dirSize = 0;
          for (const file of pdfFiles) {
            try {
              const filePath = path.join(dirPath, file);
              const fileStat = await stat(filePath);
              dirSize += fileStat.size;
            } catch (error) {
              // 파일 접근 오류 무시
            }
          }

          const typeKey = type as keyof typeof stats;
          if (typeKey !== 'total') {
            stats[typeKey] = { count: pdfFiles.length, size: dirSize };
            stats.total.count += pdfFiles.length;
            stats.total.size += dirSize;
          }
        }
      } catch (error) {
        console.error(`저장소 통계 조회 실패 (${type}):`, error);
      }
    }

    return stats;
  }

  /**
   * 자동 정리 스케줄러 (수동 호출)
   */
  static async runMaintenanceCleanup(): Promise<void> {
    console.log('🔧 PDF 저장소 유지보수 시작...');
    
    try {
      // 1. 저장소 통계 출력
      const stats = await this.getStorageStats();
      console.log('📊 현재 저장소 사용량:');
      console.log(`  - 임시: ${stats.temp.count}개 파일, ${Math.round(stats.temp.size / 1024 / 1024)}MB`);
      console.log(`  - 아카이브: ${stats.archive.count}개 파일, ${Math.round(stats.archive.size / 1024 / 1024)}MB`);
      console.log(`  - 발주서: ${stats.orders.count}개 파일, ${Math.round(stats.orders.size / 1024 / 1024)}MB`);
      console.log(`  - 총합: ${stats.total.count}개 파일, ${Math.round(stats.total.size / 1024 / 1024)}MB`);

      // 2. 임시 파일 정리 (더 보수적인 설정)
      const cleanupResult = await this.cleanupTempPDFs({
        maxAge: 2 * 60 * 60 * 1000, // 2시간
        maxSize: 200 * 1024 * 1024, // 200MB
        keepRecent: 20, // 최근 20개 유지
        dryRun: false
      });

      console.log(`🧹 유지보수 완료: ${cleanupResult.cleaned}개 파일 정리`);
      
      if (cleanupResult.errors.length > 0) {
        console.log(`⚠️ 오류 ${cleanupResult.errors.length}건 발생`);
      }

      // 3. 최종 통계
      const finalStats = await this.getStorageStats();
      console.log(`📊 정리 후 총 용량: ${Math.round(finalStats.total.size / 1024 / 1024)}MB`);
      
    } catch (error) {
      console.error('❌ PDF 저장소 유지보수 실패:', error);
    }
  }
}

/**
 * 편의 함수들
 */

export async function initPDFManager(): Promise<void> {
  return PDFFileManager.initializePDFStorage();
}

export async function cleanupOldPDFs(maxAgeHours: number = 24): Promise<void> {
  await PDFFileManager.cleanupTempPDFs({
    maxAge: maxAgeHours * 60 * 60 * 1000,
    dryRun: false
  });
}

export async function getPDFStorageInfo(): Promise<{
  totalFiles: number;
  totalSizeMB: number;
  directories: string[];
}> {
  const stats = await PDFFileManager.getStorageStats();
  return {
    totalFiles: stats.total.count,
    totalSizeMB: Math.round(stats.total.size / 1024 / 1024),
    directories: Object.keys(PDFFileManager['PDF_DIRECTORIES'])
  };
}