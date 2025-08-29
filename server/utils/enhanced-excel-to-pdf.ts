/**
 * Enhanced Excel to PDF Converter
 * 
 * PRD Requirements:
 * - FR-014: "엑셀 파일과 함께 엑셀파일을 PDF화 한 파일도 보존해야 함"
 * - FR-016: "처리된 Excel 파일을 PDF화 한 파일도 첨부"
 * 
 * Features:
 * - High-quality PDF generation with proper formatting
 * - Support for multiple sheets with page breaks
 * - Preserves cell formatting, borders, and styling
 * - Optimized performance with async processing
 * - Comprehensive error handling and logging
 * - File management and cleanup utilities
 */

import { chromium } from 'playwright-chromium';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

export interface EnhancedPdfOptions {
  outputPath?: string;
  pageFormat?: 'A4' | 'A3' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  includeSheets?: string[];
  excludeSheets?: string[];
  quality?: 'high' | 'medium' | 'low';
  watermark?: string;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
}

export interface PdfConversionResult {
  success: boolean;
  pdfPath?: string;
  error?: string;
  stats?: {
    fileSize: number;
    sheetCount: number;
    processingTime: number;
  };
}

export class EnhancedExcelToPDFConverter {
  private static readonly DEFAULT_OPTIONS: EnhancedPdfOptions = {
    pageFormat: 'A4',
    orientation: 'landscape',
    quality: 'high',
    margin: {
      top: '15mm',
      right: '15mm',
      bottom: '15mm',
      left: '15mm'
    }
  };

  /**
   * Excel 파일을 고품질 PDF로 변환
   */
  static async convertExcelToPDF(
    excelPath: string,
    options: EnhancedPdfOptions = {}
  ): Promise<PdfConversionResult> {
    const startTime = Date.now();
    let browser: puppeteer.Browser | null = null;

    try {
      console.log(`📄 Enhanced PDF 변환 시작: ${excelPath}`);
      
      // 파일 존재 확인
      if (!fs.existsSync(excelPath)) {
        throw new Error(`Excel 파일이 존재하지 않습니다: ${excelPath}`);
      }

      // 옵션 병합
      const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };
      
      // 출력 경로 설정
      const pdfPath = finalOptions.outputPath || 
        excelPath.replace(/\.(xlsx?|xlsm)$/i, '-enhanced.pdf');
      
      // 출력 디렉토리 확인 및 생성
      const outputDir = path.dirname(pdfPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      console.log(`📄 PDF 출력 경로: ${pdfPath}`);

      // Excel 파일 읽기
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(excelPath);
      
      console.log(`📖 Excel 파일 로드 완료. 시트 수: ${workbook.worksheets.length}`);

      // 변환할 시트 필터링
      const sheetsToConvert = this.filterSheets(workbook, finalOptions);
      
      if (sheetsToConvert.length === 0) {
        console.warn('⚠️ 변환할 시트가 없습니다.');
        return {
          success: false,
          error: '변환할 시트가 없습니다. Input 시트가 제거되었거나 빈 파일입니다.'
        };
      }

      console.log(`🎯 변환 대상 시트: ${sheetsToConvert.map(ws => ws.name).join(', ')}`);

      // HTML 생성
      const html = await this.generateEnhancedHTML(sheetsToConvert, finalOptions);
      console.log(`🌐 Enhanced HTML 생성 완료. 크기: ${Math.round(html.length / 1024)}KB`);

      // Playwright 브라우저 실행
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-extensions'
        ]
      });

      const page = await browser.newPage();
      
      // 뷰포트 설정 (A4 크기에 맞춤)
      await page.setViewportSize({
        width: finalOptions.orientation === 'landscape' ? 1169 : 827,
        height: finalOptions.orientation === 'landscape' ? 827 : 1169
      });

      // HTML 컨텐츠 설정
      await page.setContent(html, {
        waitUntil: 'networkidle',
        timeout: 60000 // 1분 타임아웃
      });

      console.log(`📄 PDF 생성 중... (${finalOptions.quality} 품질)`);

      // PDF 생성 옵션
      const pdfOptions: puppeteer.PDFOptions = {
        path: pdfPath,
        format: finalOptions.pageFormat,
        landscape: finalOptions.orientation === 'landscape',
        printBackground: true,
        preferCSSPageSize: false,
        margin: finalOptions.margin,
        // 품질 설정에 따른 추가 옵션
        ...(finalOptions.quality === 'high' && {
          quality: 100,
          omitBackground: false
        })
      };

      await page.pdf(pdfOptions);

      await browser.close();
      browser = null;

      // 생성된 파일 확인 및 통계
      if (!fs.existsSync(pdfPath)) {
        throw new Error('PDF 파일이 생성되지 않았습니다.');
      }

      const stats = fs.statSync(pdfPath);
      const processingTime = Date.now() - startTime;

      console.log(`✅ Enhanced PDF 생성 완료: ${pdfPath}`);
      console.log(`📊 파일 크기: ${Math.round(stats.size / 1024)}KB`);
      console.log(`⏱️ 처리 시간: ${processingTime}ms`);

      return {
        success: true,
        pdfPath,
        stats: {
          fileSize: stats.size,
          sheetCount: sheetsToConvert.length,
          processingTime
        }
      };

    } catch (error) {
      console.error('❌ Enhanced PDF 변환 오류:', error);

      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.error('브라우저 종료 오류:', closeError);
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 변환할 시트 필터링
   */
  private static filterSheets(
    workbook: ExcelJS.Workbook, 
    options: EnhancedPdfOptions
  ): ExcelJS.Worksheet[] {
    const allSheets = workbook.worksheets;

    // Input 시트는 기본적으로 제외 (PRD 요구사항)
    let filteredSheets = allSheets.filter(ws => 
      !ws.name.toLowerCase().startsWith('input')
    );

    // 포함할 시트 지정된 경우
    if (options.includeSheets && options.includeSheets.length > 0) {
      filteredSheets = filteredSheets.filter(ws =>
        options.includeSheets!.includes(ws.name)
      );
    }

    // 제외할 시트 지정된 경우
    if (options.excludeSheets && options.excludeSheets.length > 0) {
      filteredSheets = filteredSheets.filter(ws =>
        !options.excludeSheets!.includes(ws.name)
      );
    }

    return filteredSheets;
  }

  /**
   * 고품질 HTML 생성
   */
  private static async generateEnhancedHTML(
    worksheets: ExcelJS.Worksheet[],
    options: EnhancedPdfOptions
  ): Promise<string> {
    const styles = this.getEnhancedStyles(options);
    
    let bodyContent = '';

    for (let i = 0; i < worksheets.length; i++) {
      const worksheet = worksheets[i];
      
      if (i > 0) {
        bodyContent += '<div class="page-break"></div>';
      }

      bodyContent += `<div class="sheet-container">`;
      bodyContent += `<h2 class="sheet-title">${worksheet.name}</h2>`;
      
      // 시트 내용을 테이블로 변환
      const tableHTML = await this.worksheetToEnhancedTable(worksheet);
      bodyContent += tableHTML;
      
      bodyContent += `</div>`;
    }

    // 워터마크 추가
    if (options.watermark) {
      bodyContent += `
        <div class="watermark">${options.watermark}</div>
      `;
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Purchase Order PDF</title>
  <style>${styles}</style>
</head>
<body>
  ${bodyContent}
</body>
</html>
    `;
  }

  /**
   * 워크시트를 고품질 테이블 HTML로 변환
   */
  private static async worksheetToEnhancedTable(worksheet: ExcelJS.Worksheet): Promise<string> {
    let tableHTML = '<table class="excel-table">';
    
    // 행 처리
    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      tableHTML += '<tr>';
      
      // 셀 처리
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const value = this.formatCellValue(cell.value);
        const styles = this.getCellStyles(cell);
        const alignment = this.getCellAlignment(cell);
        
        tableHTML += `<td style="${styles}${alignment}">${value}</td>`;
      });
      
      tableHTML += '</tr>';
    });
    
    tableHTML += '</table>';
    return tableHTML;
  }

  /**
   * 셀 값 포맷팅
   */
  private static formatCellValue(value: any): string {
    if (value === null || value === undefined || value === '') {
      return '&nbsp;';
    }

    // 날짜 처리
    if (value instanceof Date) {
      return value.toLocaleDateString('ko-KR');
    }

    // 숫자 처리
    if (typeof value === 'number') {
      return value.toLocaleString('ko-KR');
    }

    // 리치 텍스트 처리
    if (value && typeof value === 'object' && 'richText' in value) {
      return value.richText.map((rt: any) => rt.text).join('');
    }

    // 문자열 처리 (HTML 이스케이프)
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * 셀 스타일 생성
   */
  private static getCellStyles(cell: ExcelJS.Cell): string {
    let styles = '';

    // 폰트 스타일
    if (cell.font) {
      if (cell.font.bold) styles += 'font-weight: bold; ';
      if (cell.font.italic) styles += 'font-style: italic; ';
      if (cell.font.size) styles += `font-size: ${cell.font.size}px; `;
      if (cell.font.color && cell.font.color.argb) {
        const color = '#' + cell.font.color.argb.substring(2);
        styles += `color: ${color}; `;
      }
    }

    // 배경색
    if (cell.fill && cell.fill.type === 'pattern' && cell.fill.pattern === 'solid') {
      const bgColor = cell.fill.fgColor;
      if (bgColor && bgColor.argb) {
        const color = '#' + bgColor.argb.substring(2);
        styles += `background-color: ${color}; `;
      }
    }

    // 테두리
    if (cell.border) {
      const borderStyle = '1px solid #333';
      if (cell.border.top) styles += `border-top: ${borderStyle}; `;
      if (cell.border.bottom) styles += `border-bottom: ${borderStyle}; `;
      if (cell.border.left) styles += `border-left: ${borderStyle}; `;
      if (cell.border.right) styles += `border-right: ${borderStyle}; `;
    }

    return styles;
  }

  /**
   * 셀 정렬 스타일
   */
  private static getCellAlignment(cell: ExcelJS.Cell): string {
    if (!cell.alignment) return '';

    let alignment = '';

    if (cell.alignment.horizontal) {
      alignment += `text-align: ${cell.alignment.horizontal}; `;
    }

    if (cell.alignment.vertical) {
      alignment += `vertical-align: ${cell.alignment.vertical}; `;
    }

    return alignment;
  }

  /**
   * Enhanced CSS 스타일
   */
  private static getEnhancedStyles(options: EnhancedPdfOptions): string {
    return `
      body {
        font-family: 'Malgun Gothic', 'Noto Sans KR', Arial, sans-serif;
        margin: 0;
        padding: 0;
        background-color: white;
        line-height: 1.2;
        font-size: 12px;
      }

      .sheet-container {
        margin-bottom: 30px;
        page-break-inside: avoid;
      }

      .sheet-title {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 15px;
        color: #1a1a1a;
        border-bottom: 3px solid #3B82F6;
        padding-bottom: 8px;
        text-align: center;
      }

      .excel-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
        font-size: 11px;
        background-color: white;
      }

      .excel-table td {
        border: 1px solid #ddd;
        padding: 6px 8px;
        vertical-align: top;
        min-height: 20px;
        word-wrap: break-word;
        max-width: 200px;
      }

      .excel-table th {
        border: 1px solid #ddd;
        padding: 8px;
        background-color: #f8f9fa;
        font-weight: bold;
        text-align: center;
      }

      .page-break {
        page-break-before: always;
      }

      .watermark {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 72px;
        color: rgba(0, 0, 0, 0.1);
        pointer-events: none;
        z-index: -1;
        font-weight: bold;
      }

      /* 숫자 셀 우측 정렬 */
      .number-cell {
        text-align: right;
      }

      /* 헤더 스타일 */
      .header-cell {
        background-color: #e9ecef !important;
        font-weight: bold;
        text-align: center;
      }

      /* 인쇄 최적화 */
      @media print {
        body {
          margin: 0;
          padding: 5mm;
        }
        
        .page-break {
          page-break-before: always;
        }
        
        .sheet-container {
          break-inside: avoid;
        }

        .excel-table {
          font-size: 10px;
        }
      }

      /* 품질별 최적화 */
      ${options.quality === 'high' ? `
        .excel-table {
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }
      ` : ''}
    `;
  }

  /**
   * PDF 파일 검증
   */
  static validatePDF(pdfPath: string): boolean {
    try {
      if (!fs.existsSync(pdfPath)) {
        return false;
      }

      const stats = fs.statSync(pdfPath);
      
      // 최소 파일 크기 확인 (1KB 이상)
      if (stats.size < 1024) {
        console.warn(`⚠️ PDF 파일 크기가 너무 작습니다: ${stats.size}bytes`);
        return false;
      }

      // PDF 헤더 확인
      const buffer = fs.readFileSync(pdfPath, { start: 0, end: 4 });
      const header = buffer.toString();
      
      if (!header.startsWith('%PDF')) {
        console.warn('⚠️ 유효하지 않은 PDF 파일 헤더');
        return false;
      }

      return true;
    } catch (error) {
      console.error('PDF 검증 오류:', error);
      return false;
    }
  }

  /**
   * 임시 파일 정리
   */
  static cleanupTempFiles(filePaths: string[]): void {
    filePaths.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ 임시 파일 정리: ${path.basename(filePath)}`);
        }
      } catch (error) {
        console.error(`파일 정리 실패: ${filePath}`, error);
      }
    });
  }
}

/**
 * 간편 사용 함수
 */
export async function convertExcelToPDFEnhanced(
  excelPath: string,
  outputPath?: string,
  options?: Partial<EnhancedPdfOptions>
): Promise<PdfConversionResult> {
  return EnhancedExcelToPDFConverter.convertExcelToPDF(excelPath, {
    outputPath,
    ...options
  });
}