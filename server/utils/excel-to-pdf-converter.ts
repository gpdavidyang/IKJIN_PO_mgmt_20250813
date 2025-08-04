/**
 * Excel to PDF Converter
 * 
 * PRD 요구사항: 엑셀 파일과 함께 엑셀파일을 PDF화 한 파일도 보존해야 함
 */

import puppeteer from 'puppeteer';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ExcelToPDFConverter {
  /**
   * Excel 파일을 PDF로 변환
   * @param excelPath - Excel 파일 경로
   * @param outputPath - PDF 출력 경로 (선택사항)
   * @returns PDF 파일 경로
   */
  static async convertExcelToPDF(excelPath: string, outputPath?: string): Promise<string> {
    try {
      // 출력 경로 생성
      const pdfPath = outputPath || excelPath.replace(/\.(xlsx?|xlsm)$/i, '.pdf');
      
      // Excel 파일 읽기
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(excelPath);
      
      // HTML 생성
      const html = await this.generateHTMLFromWorkbook(workbook);
      
      // Puppeteer로 PDF 생성
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // PDF 생성 옵션
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '15mm',
          right: '15mm'
        }
      });
      
      await browser.close();
      
      console.log(`PDF 생성 완료: ${pdfPath}`);
      return pdfPath;
      
    } catch (error) {
      console.error('Excel to PDF 변환 오류:', error);
      throw error;
    }
  }

  /**
   * Workbook을 HTML로 변환
   */
  private static async generateHTMLFromWorkbook(workbook: ExcelJS.Workbook): Promise<string> {
    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Malgun Gothic', sans-serif;
      margin: 0;
      padding: 0;
    }
    .page-break {
      page-break-after: always;
    }
    h2 {
      color: #333;
      border-bottom: 2px solid #3B82F6;
      padding-bottom: 5px;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      border: 1px solid #ccc;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    .number {
      text-align: right;
    }
    .center {
      text-align: center;
    }
    .total-row {
      font-weight: bold;
      background-color: #f9f9f9;
    }
  </style>
</head>
<body>
`;

    // 각 시트를 HTML로 변환
    workbook.eachSheet((worksheet, sheetId) => {
      // Input 시트는 제외 (PRD 요구사항)
      if (worksheet.name.toLowerCase().startsWith('input')) {
        return;
      }

      if (sheetId > 1) {
        html += '<div class="page-break"></div>';
      }

      html += `<h2>${worksheet.name}</h2>`;
      html += '<table>';

      // 행 단위로 처리
      worksheet.eachRow((row, rowNumber) => {
        html += '<tr>';
        
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const value = cell.value || '';
          const isHeader = rowNumber === 1;
          const tag = isHeader ? 'th' : 'td';
          
          // 숫자 형식 감지
          let className = '';
          if (typeof value === 'number') {
            className = 'number';
          }
          
          // 병합된 셀 처리
          const colspan = cell.model.colspan || 1;
          const rowspan = cell.model.rowspan || 1;
          
          html += `<${tag} class="${className}"`;
          if (colspan > 1) html += ` colspan="${colspan}"`;
          if (rowspan > 1) html += ` rowspan="${rowspan}"`;
          html += `>${this.formatCellValue(value)}</${tag}>`;
        });
        
        html += '</tr>';
      });

      html += '</table>';
    });

    html += `
</body>
</html>
`;

    return html;
  }

  /**
   * 셀 값 포맷팅
   */
  private static formatCellValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    // 날짜 처리
    if (value instanceof Date) {
      return value.toLocaleDateString('ko-KR');
    }

    // 숫자 처리 (천 단위 콤마)
    if (typeof value === 'number') {
      return value.toLocaleString('ko-KR');
    }

    // 리치 텍스트 처리
    if (value && typeof value === 'object' && 'richText' in value) {
      return value.richText.map((rt: any) => rt.text).join('');
    }

    return String(value);
  }

  /**
   * 여러 Excel 파일을 하나의 PDF로 병합
   */
  static async convertMultipleExcelsToPDF(
    excelPaths: string[], 
    outputPath: string
  ): Promise<string> {
    try {
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      let combinedHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Malgun Gothic', sans-serif;
      margin: 0;
      padding: 0;
    }
    .file-section {
      page-break-after: always;
    }
    .file-section:last-child {
      page-break-after: auto;
    }
    h1 {
      color: #1a1a1a;
      border-bottom: 3px solid #3B82F6;
      padding-bottom: 10px;
      margin-bottom: 30px;
    }
    h2 {
      color: #333;
      border-bottom: 2px solid #3B82F6;
      padding-bottom: 5px;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      border: 1px solid #ccc;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    .number {
      text-align: right;
    }
  </style>
</head>
<body>
`;

      // 각 Excel 파일 처리
      for (let i = 0; i < excelPaths.length; i++) {
        const excelPath = excelPaths[i];
        const fileName = path.basename(excelPath, path.extname(excelPath));
        
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(excelPath);
        
        combinedHTML += `<div class="file-section">`;
        combinedHTML += `<h1>파일: ${fileName}</h1>`;
        
        // Workbook의 내용을 HTML로 변환 (Input 시트 제외)
        const content = await this.generateHTMLFromWorkbook(workbook);
        // body 태그 제거
        const bodyContent = content.match(/<body>([\s\S]*)<\/body>/)?.[1] || '';
        combinedHTML += bodyContent;
        
        combinedHTML += `</div>`;
      }

      combinedHTML += `
</body>
</html>
`;

      await page.setContent(combinedHTML, { waitUntil: 'networkidle0' });
      
      await page.pdf({
        path: outputPath,
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '15mm',
          right: '15mm'
        }
      });

      await browser.close();
      
      console.log(`통합 PDF 생성 완료: ${outputPath}`);
      return outputPath;
      
    } catch (error) {
      console.error('Multiple Excel to PDF 변환 오류:', error);
      throw error;
    }
  }
}