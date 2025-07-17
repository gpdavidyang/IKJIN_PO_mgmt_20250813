import * as XLSX from 'xlsx';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

export interface ExcelToPdfOptions {
  outputPath?: string;
  pageFormat?: 'A4' | 'A3' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
}

export class ExcelToPdfConverter {
  /**
   * Excel 파일을 PDF로 변환
   */
  static async convertToPdf(
    excelPath: string,
    options: ExcelToPdfOptions = {}
  ): Promise<{ success: boolean; pdfPath?: string; error?: string }> {
    try {
      const workbook = XLSX.readFile(excelPath);
      const pdfPath = options.outputPath || excelPath.replace(/\.xlsx?$/, '.pdf');
      
      // HTML 생성
      const htmlContent = this.generateHtmlFromWorkbook(workbook);
      
      // Puppeteer로 PDF 생성
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      await page.pdf({
        path: pdfPath,
        format: options.pageFormat || 'A4',
        landscape: options.orientation === 'landscape',
        margin: {
          top: options.margin?.top || '20mm',
          right: options.margin?.right || '20mm',
          bottom: options.margin?.bottom || '20mm',
          left: options.margin?.left || '20mm'
        },
        printBackground: true
      });
      
      await browser.close();
      
      return {
        success: true,
        pdfPath
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 특정 시트들만 PDF로 변환
   */
  static async convertSheetsToPdf(
    excelPath: string,
    sheetNames: string[],
    options: ExcelToPdfOptions = {}
  ): Promise<{ success: boolean; pdfPath?: string; error?: string }> {
    try {
      const workbook = XLSX.readFile(excelPath);
      const pdfPath = options.outputPath || excelPath.replace(/\.xlsx?$/, '-sheets.pdf');
      
      // 지정된 시트들만 HTML로 변환
      const htmlContent = this.generateHtmlFromSheets(workbook, sheetNames);
      
      // Puppeteer로 PDF 생성
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      await page.pdf({
        path: pdfPath,
        format: options.pageFormat || 'A4',
        landscape: options.orientation === 'landscape',
        margin: {
          top: options.margin?.top || '20mm',
          right: options.margin?.right || '20mm',
          bottom: options.margin?.bottom || '20mm',
          left: options.margin?.left || '20mm'
        },
        printBackground: true
      });
      
      await browser.close();
      
      return {
        success: true,
        pdfPath
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 워크북 전체를 HTML로 변환
   */
  private static generateHtmlFromWorkbook(workbook: XLSX.WorkBook): string {
    const sheets = workbook.SheetNames.map(name => {
      const worksheet = workbook.Sheets[name];
      const htmlTable = XLSX.utils.sheet_to_html(worksheet);
      
      return `
        <div class="sheet-container">
          <h2 class="sheet-title">${name}</h2>
          ${htmlTable}
        </div>
        <div class="page-break"></div>
      `;
    }).join('');

    return this.wrapWithHtmlTemplate(sheets);
  }

  /**
   * 특정 시트들만 HTML로 변환
   */
  private static generateHtmlFromSheets(workbook: XLSX.WorkBook, sheetNames: string[]): string {
    const sheets = sheetNames
      .filter(name => workbook.SheetNames.includes(name))
      .map(name => {
        const worksheet = workbook.Sheets[name];
        const htmlTable = XLSX.utils.sheet_to_html(worksheet);
        
        return `
          <div class="sheet-container">
            <h2 class="sheet-title">${name}</h2>
            ${htmlTable}
          </div>
          <div class="page-break"></div>
        `;
      }).join('');

    return this.wrapWithHtmlTemplate(sheets);
  }

  /**
   * HTML 템플릿으로 래핑
   */
  private static wrapWithHtmlTemplate(content: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Excel to PDF</title>
          <style>
            body {
              font-family: 'Malgun Gothic', Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background-color: white;
            }
            
            .sheet-container {
              margin-bottom: 30px;
            }
            
            .sheet-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 15px;
              color: #333;
              border-bottom: 2px solid #007bff;
              padding-bottom: 5px;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 12px;
            }
            
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
              vertical-align: top;
            }
            
            th {
              background-color: #f8f9fa;
              font-weight: bold;
            }
            
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            
            .page-break {
              page-break-before: always;
            }
            
            /* 숫자 셀 우측 정렬 */
            td[data-t="n"] {
              text-align: right;
            }
            
            /* 병합된 셀 스타일 */
            .merged-cell {
              background-color: #e9ecef;
              font-weight: bold;
              text-align: center;
            }
            
            /* 인쇄 최적화 */
            @media print {
              body {
                margin: 0;
                padding: 10mm;
              }
              
              .page-break {
                page-break-before: always;
              }
              
              .sheet-container {
                break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `;
  }
}

/**
 * 간단한 사용 예시
 */
export async function convertExcelToPdf(
  excelPath: string,
  outputPath?: string,
  sheetsOnly?: string[]
): Promise<{ success: boolean; pdfPath?: string; error?: string }> {
  const options: ExcelToPdfOptions = {
    outputPath,
    pageFormat: 'A4',
    orientation: 'portrait'
  };

  if (sheetsOnly && sheetsOnly.length > 0) {
    return ExcelToPdfConverter.convertSheetsToPdf(excelPath, sheetsOnly, options);
  } else {
    return ExcelToPdfConverter.convertToPdf(excelPath, options);
  }
}