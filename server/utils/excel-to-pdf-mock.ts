import XLSX from 'xlsx';
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

export class ExcelToPdfConverterMock {
  /**
   * Excel 파일을 PDF로 변환 (Mock 버전)
   */
  static async convertToPdf(
    excelPath: string,
    options: ExcelToPdfOptions = {}
  ): Promise<{ success: boolean; pdfPath?: string; error?: string }> {
    try {
      if (!fs.existsSync(excelPath)) {
        return {
          success: false,
          error: 'Excel 파일을 찾을 수 없습니다.'
        };
      }

      const workbook = XLSX.readFile(excelPath);
      const pdfPath = options.outputPath || excelPath.replace(/\.xlsx?$/, '.pdf');
      
      // HTML 생성
      const htmlContent = this.generateHtmlFromWorkbook(workbook);
      
      // Mock PDF 생성 (실제로는 HTML을 기반으로 한 간단한 PDF)
      const pdfResult = await this.createMockPdf(htmlContent, pdfPath);
      
      if (!pdfResult.success) {
        return pdfResult;
      }
      
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
   * 특정 시트들만 PDF로 변환 (Mock 버전)
   */
  static async convertSheetsToPdf(
    excelPath: string,
    sheetNames: string[],
    options: ExcelToPdfOptions = {}
  ): Promise<{ success: boolean; pdfPath?: string; error?: string }> {
    try {
      if (!fs.existsSync(excelPath)) {
        return {
          success: false,
          error: 'Excel 파일을 찾을 수 없습니다.'
        };
      }

      const workbook = XLSX.readFile(excelPath);
      const pdfPath = options.outputPath || excelPath.replace(/\.xlsx?$/, '-sheets.pdf');
      
      // 지정된 시트들만 HTML로 변환
      const htmlContent = this.generateHtmlFromSheets(workbook, sheetNames);
      
      // Mock PDF 생성
      const pdfResult = await this.createMockPdf(htmlContent, pdfPath);
      
      if (!pdfResult.success) {
        return pdfResult;
      }
      
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
   * Mock PDF 생성 (간단한 PDF 구조)
   */
  private static async createMockPdf(
    htmlContent: string,
    pdfPath: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 간단한 PDF 헤더와 내용
      const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 200
>>
stream
BT
/F1 12 Tf
50 700 Td
(발주서 PDF 변환 완료) Tj
0 -20 Td
(이 파일은 Mock PDF입니다.) Tj
0 -20 Td
(실제 환경에서는 완전한 PDF가 생성됩니다.) Tj
0 -40 Td
(생성 시간: ${new Date().toLocaleString('ko-KR')}) Tj
0 -20 Td
(파일 경로: ${pdfPath}) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000524 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
589
%%EOF`;

      fs.writeFileSync(pdfPath, pdfContent);
      
      console.log(`📄 Mock PDF 생성 완료: ${path.basename(pdfPath)}`);
      
      return { success: true };
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
          <title>Excel to PDF - Mock</title>
          <style>
            body {
              font-family: 'Malgun Gothic', Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background-color: white;
            }
            
            .mock-notice {
              background-color: #fff3cd;
              border: 1px solid #ffeaa7;
              padding: 10px;
              border-radius: 5px;
              margin-bottom: 20px;
              font-size: 14px;
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
          <div class="mock-notice">
            <strong>🧪 Mock PDF:</strong> 이 파일은 테스트용 Mock PDF입니다. 실제 환경에서는 완전한 PDF 변환이 수행됩니다.
          </div>
          ${content}
        </body>
      </html>
    `;
  }
}

/**
 * 간단한 사용 예시 (Mock 버전)
 */
export async function convertExcelToPdfMock(
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
    return ExcelToPdfConverterMock.convertSheetsToPdf(excelPath, sheetsOnly, options);
  } else {
    return ExcelToPdfConverterMock.convertToPdf(excelPath, options);
  }
}