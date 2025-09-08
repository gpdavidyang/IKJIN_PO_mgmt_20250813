/**
 * Vercel 서버리스 환경 호환 업로드 경로 관리 유틸리티
 * 
 * Vercel 환경에서는 /tmp 디렉토리만 쓰기 가능하므로
 * 환경에 따라 적절한 경로를 반환합니다.
 */

import path from 'path';
import fs from 'fs';

/**
 * 환경별 기본 업로드 디렉토리 경로
 */
export function getUploadBaseDir(): string {
  return process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'uploads');
}

/**
 * 환경별 uploads 서브 디렉토리 경로
 */
export function getUploadPath(subDir: string = ''): string {
  const baseDir = getUploadBaseDir();
  return subDir ? path.join(baseDir, subDir) : baseDir;
}

/**
 * 환경별 uploads 디렉토리 경로 (하위 호환성)
 */
export function getUploadsDir(): string {
  return getUploadBaseDir();
}

/**
 * 환경별 temp PDF 디렉토리 경로
 */
export function getTempPdfDir(): string {
  return getUploadPath('temp-pdf');
}

/**
 * 환경별 PDF 아카이브 디렉토리 경로
 */
export function getPdfArchiveDir(): string {
  return getUploadPath('pdf-archive');
}

/**
 * 환경별 Order PDFs 디렉토리 경로
 */
export function getOrderPdfsDir(): string {
  return getUploadPath('order-pdfs');
}

/**
 * 환경별 Excel Simple 디렉토리 경로
 */
export function getExcelSimpleDir(): string {
  return getUploadPath('excel-simple');
}

/**
 * 환경별 temp 디렉토리 경로
 */
export function getTempDir(): string {
  return getUploadPath('temp');
}

/**
 * 디렉토리가 존재하지 않으면 생성합니다.
 * Vercel 환경에서는 /tmp 하위만 생성 가능합니다.
 */
export function ensureUploadDir(dirPath: string): void {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ Upload directory created: ${dirPath}`);
    }
  } catch (error) {
    // Vercel 환경에서는 /tmp 외 경로 생성 시 오류 발생할 수 있음
    if (process.env.VERCEL && !dirPath.startsWith('/tmp')) {
      console.warn(`⚠️ Cannot create directory in Vercel environment: ${dirPath}`);
    } else {
      console.error(`❌ Failed to create directory: ${dirPath}`, error);
      throw error;
    }
  }
}

/**
 * 업로드 디렉토리 초기화
 */
export function initializeUploadDirectories(): void {
  const directories = [
    getUploadBaseDir(),
    getTempPdfDir(),
    getPdfArchiveDir(),
    getOrderPdfsDir(),
    getExcelSimpleDir(),
    getTempDir()
  ];

  directories.forEach(dir => {
    ensureUploadDir(dir);
  });
}

/**
 * 파일 경로가 업로드 디렉토리 범위 내인지 확인
 */
export function isWithinUploadDir(filePath: string): boolean {
  const baseDir = getUploadBaseDir();
  const resolvedPath = path.resolve(filePath);
  const resolvedBaseDir = path.resolve(baseDir);
  
  return resolvedPath.startsWith(resolvedBaseDir);
}

/**
 * 안전한 파일 경로 생성 (Path Traversal 공격 방지)
 */
export function getSafeUploadPath(fileName: string, subDir: string = ''): string {
  // 파일명에서 위험한 문자 제거
  const sanitizedFileName = path.basename(fileName);
  const uploadDir = getUploadPath(subDir);
  const filePath = path.join(uploadDir, sanitizedFileName);
  
  // 업로드 디렉토리 범위 내인지 확인
  if (!isWithinUploadDir(filePath)) {
    throw new Error(`File path is outside upload directory: ${filePath}`);
  }
  
  return filePath;
}

/**
 * Vercel 환경 체크
 */
export function isVercelEnvironment(): boolean {
  return !!process.env.VERCEL;
}

/**
 * 환경 정보 출력
 */
export function logEnvironmentInfo(): void {
  console.log('🌍 Upload Environment Info:');
  console.log(`  - Environment: ${isVercelEnvironment() ? 'Vercel' : 'Local'}`);
  console.log(`  - Base upload dir: ${getUploadBaseDir()}`);
  console.log(`  - Writable: ${isVercelEnvironment() ? '/tmp only' : 'Full filesystem'}`);
}