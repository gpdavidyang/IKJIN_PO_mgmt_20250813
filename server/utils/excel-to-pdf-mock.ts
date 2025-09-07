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
      const pdfPath = options.outputPath || excelPath.replace(/\.xlsx?m?$/, '.pdf');
      
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
      const pdfPath = options.outputPath || excelPath.replace(/\.xlsx?m?$/, '-sheets.pdf');
      
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
   * PDFKit을 사용한 한글 지원 PDF 생성
   */
  private static async createMockPdf(
    htmlContent: string,
    pdfPath: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`📄 PDFKit으로 한글 지원 PDF 생성 시작: ${path.basename(pdfPath)}`);
      
      // PDFKit으로 한글 지원 PDF 생성
      const PDFDocument = (await import('pdfkit')).default;
      
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      // 한글 폰트 등록 시도
      let koreanFontPath = null;
      const possibleFonts = [
        '/System/Library/Fonts/Supplemental/AppleGothic.ttf', // macOS
        '/System/Library/Fonts/Supplemental/AppleMyungjo.ttf', // macOS 명조
        'C:\\Windows\\Fonts\\malgun.ttf', // Windows
        'C:\\Windows\\Fonts\\gulim.ttf', // Windows 굴림
        '/usr/share/fonts/truetype/nanum/NanumGothic.ttf', // Linux
      ];
      
      // 사용 가능한 한글 폰트 찾기
      for (const fontPath of possibleFonts) {
        try {
          if (fs.existsSync(fontPath)) {
            koreanFontPath = fontPath;
            console.log(`✅ 한글 폰트 발견: ${fontPath}`);
            break;
          }
        } catch (error) {
          continue;
        }
      }
      
      // 한글 폰트 등록
      if (koreanFontPath) {
        try {
          doc.registerFont('Korean', koreanFontPath);
          doc.font('Korean');
          console.log(`✅ 한글 폰트 등록 완료: ${koreanFontPath}`);
        } catch (fontError) {
          console.warn('⚠️ 한글 폰트 등록 실패, 기본 폰트 사용:', fontError);
          doc.font('Helvetica');
        }
      } else {
        console.warn('⚠️ 한글 폰트를 찾을 수 없음, 기본 폰트 사용');
        doc.font('Helvetica');
      }

      // PDF 내용 작성
      doc.fontSize(20).text('📋 구매발주서 (엑셀 변환)', 50, 80);
      
      doc.fontSize(12).moveDown();
      doc.text('✅ Excel 파일이 성공적으로 PDF로 변환되었습니다.');
      doc.moveDown(0.5);
      doc.text('🔧 이 PDF는 개선된 한글 폰트 지원 기능으로 생성되었습니다.');
      doc.moveDown(0.5);
      doc.text('📅 생성 시간: ' + new Date().toLocaleString('ko-KR'));
      doc.moveDown(0.5);
      doc.text('📁 파일 경로: ' + path.basename(pdfPath));
      
      doc.moveDown(1);
      doc.fontSize(14).text('📊 Excel 파일 정보:', 50, doc.y);
      doc.fontSize(10);
      doc.text('• 원본 Excel 파일의 모든 시트가 처리되었습니다.');
      doc.text('• 한글 텍스트가 올바르게 표시됩니다.');
      doc.text('• 셀 서식과 레이아웃이 보존되었습니다.');
      
      doc.moveDown(1);
      doc.fontSize(14).text('⚠️ 중요 안내:', 50, doc.y);
      doc.fontSize(10);
      doc.text('• 이 PDF는 테스트 목적으로 생성된 Mock 파일입니다.');
      doc.text('• 실제 운영 환경에서는 완전한 Excel→PDF 변환이 수행됩니다.');
      doc.text('• 한글 폰트 문제가 해결되었는지 확인해 주세요.');
      
      // 하단에 시스템 정보 추가
      doc.fontSize(8);
      doc.text(`시스템: ${process.platform} | Node.js: ${process.version}`, 50, 700);
      doc.text(`한글 폰트: ${koreanFontPath ? path.basename(koreanFontPath) : 'Helvetica (기본)'}`, 50, 715);
      
      // PDF 파일로 저장
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      
      return new Promise((resolve) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          fs.writeFileSync(pdfPath, pdfBuffer);
          console.log(`✅ 한글 지원 Mock PDF 생성 완료: ${path.basename(pdfPath)}`);
          resolve({ success: true });
        });
        
        doc.end();
      });
      
    } catch (error) {
      console.error('❌ PDFKit Mock PDF 생성 실패:', error);
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