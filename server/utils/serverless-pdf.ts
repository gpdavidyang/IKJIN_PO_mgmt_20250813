/**
 * Serverless-friendly PDF Generator
 * Fallback PDF generation for Vercel/serverless environments
 */

import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

export interface ServerlessPdfOptions {
  outputPath?: string;
  pageFormat?: 'A4' | 'A3' | 'Letter';
  orientation?: 'portrait' | 'landscape';
}

export class ServerlessPdfGenerator {
  /**
   * Generate PDF from Excel using HTML-based approach
   * This is a simplified version that works in serverless environments
   */
  static async generateFromExcel(
    excelPath: string,
    options: ServerlessPdfOptions = {}
  ): Promise<{ success: boolean; pdfPath?: string; htmlPath?: string; error?: string }> {
    try {
      console.log('📄 Serverless PDF generation starting...');
      
      // Read Excel file
      const workbook = XLSX.readFile(excelPath);
      const htmlPath = excelPath.replace(/\.(xlsx?|xlsm)$/i, '.html');
      const pdfPath = options.outputPath || excelPath.replace(/\.(xlsx?|xlsm)$/i, '.pdf');
      
      // Generate HTML content
      const htmlContent = this.generateHtmlContent(workbook, options);
      
      // Save HTML file (can be converted to PDF client-side)
      fs.writeFileSync(htmlPath, htmlContent);
      console.log(`✅ HTML file created: ${htmlPath}`);
      
      // In serverless environment, we return the HTML path
      // The client can use browser's print functionality or other tools
      return {
        success: true,
        htmlPath,
        pdfPath // Path where PDF would be saved if converted
      };
      
    } catch (error) {
      console.error('❌ Serverless PDF generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Generate HTML content from workbook
   */
  private static generateHtmlContent(
    workbook: XLSX.WorkBook,
    options: ServerlessPdfOptions
  ): string {
    const sheets = workbook.SheetNames.map(name => {
      const worksheet = workbook.Sheets[name];
      const htmlTable = XLSX.utils.sheet_to_html(worksheet, {
        editable: false
      });
      
      return `
        <div class="sheet-container">
          <h2 class="sheet-title">${name}</h2>
          ${htmlTable}
        </div>
        <div class="page-break"></div>
      `;
    }).join('');
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Purchase Order</title>
  <style>
    @page {
      size: ${options.pageFormat || 'A4'} ${options.orientation || 'portrait'};
      margin: 20mm;
    }
    
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .page-break {
        page-break-after: always;
      }
      
      .sheet-container {
        page-break-inside: avoid;
      }
    }
    
    body {
      font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
      margin: 0;
      padding: 20px;
      background-color: white;
      color: #333;
    }
    
    .sheet-container {
      margin-bottom: 30px;
    }
    
    .sheet-title {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 15px;
      color: #2563eb;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 8px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 12px;
    }
    
    th, td {
      border: 1px solid #d1d5db;
      padding: 8px;
      text-align: left;
      vertical-align: top;
    }
    
    th {
      background-color: #f3f4f6;
      font-weight: bold;
      color: #1f2937;
    }
    
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    
    tr:hover {
      background-color: #eff6ff;
    }
    
    /* Number cells right-aligned */
    td[data-t="n"] {
      text-align: right;
      font-family: 'Courier New', monospace;
    }
    
    /* Print button (hidden in print) */
    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #2563eb;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      z-index: 1000;
    }
    
    .print-button:hover {
      background-color: #1d4ed8;
    }
    
    @media print {
      .print-button {
        display: none;
      }
    }
    
    /* Responsive design */
    @media screen and (max-width: 768px) {
      body {
        padding: 10px;
      }
      
      table {
        font-size: 10px;
      }
      
      th, td {
        padding: 4px;
      }
    }
  </style>
  <script>
    function printDocument() {
      window.print();
    }
    
    // Auto-detect if running in iframe and hide print button
    if (window.self !== window.top) {
      document.addEventListener('DOMContentLoaded', function() {
        const printBtn = document.querySelector('.print-button');
        if (printBtn) printBtn.style.display = 'none';
      });
    }
  </script>
</head>
<body>
  <button class="print-button" onclick="printDocument()">🖨️ PDF로 인쇄</button>
  ${sheets}
</body>
</html>
    `;
  }
  
  /**
   * Check if running in serverless environment
   */
  static isServerless(): boolean {
    return !!(
      process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.NETLIFY ||
      process.env.NOW_REGION
    );
  }
}

/**
 * Smart PDF converter that chooses the best method based on environment
 */
export async function generatePdf(
  excelPath: string,
  options: ServerlessPdfOptions = {}
): Promise<{ success: boolean; pdfPath?: string; htmlPath?: string; error?: string }> {
  // In serverless environment, use the lightweight HTML approach
  if (ServerlessPdfGenerator.isServerless()) {
    console.log('🚀 Using serverless PDF generation method');
    return ServerlessPdfGenerator.generateFromExcel(excelPath, options);
  }
  
  // In local/traditional environment, try to use Playwright
  try {
    const { convertExcelToPdf } = await import('./excel-to-pdf.js');
    const result = await convertExcelToPdf(excelPath, options.outputPath);
    return result;
  } catch (error) {
    console.warn('⚠️ Playwright not available, falling back to serverless method');
    return ServerlessPdfGenerator.generateFromExcel(excelPath, options);
  }
}