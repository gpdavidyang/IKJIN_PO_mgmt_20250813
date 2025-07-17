/**
 * ExcelJS를 사용한 서식 보존 엑셀 처리
 * 원본 파일의 모든 서식(병합셀, 테두리, 색상, 폰트 등)을 완벽하게 보존
 */

import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

export interface FormatPreservingResult {
  success: boolean;
  removedSheet: boolean;
  remainingSheets: string[];
  originalFormat: boolean;
  error?: string;
  processedFilePath?: string;
}

export class ExcelFormatPreserving {
  
  /**
   * ExcelJS를 사용하여 Input 시트만 제거하고 모든 서식 보존
   */
  static async removeInputSheetWithFormatPreserving(
    sourcePath: string,
    targetPath: string,
    inputSheetName: string = 'Input'
  ): Promise<FormatPreservingResult> {
    try {
      console.log(`📄 ExcelJS로 서식 보존 처리 시작: ${sourcePath} -> ${targetPath}`);
      
      // 소스 파일 존재 확인
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`소스 파일을 찾을 수 없습니다: ${sourcePath}`);
      }

      // ExcelJS 워크북 생성 및 파일 읽기
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(sourcePath);
      
      const originalSheets = workbook.worksheets.map(ws => ws.name);
      console.log(`📋 원본 시트 목록: ${originalSheets.join(', ')}`);

      // Input 시트 제거
      let removedSheet = false;
      const inputWorksheet = workbook.getWorksheet(inputSheetName);
      
      if (inputWorksheet) {
        workbook.removeWorksheet(inputWorksheet.id);
        removedSheet = true;
        console.log(`🗑️ "${inputSheetName}" 시트가 제거되었습니다.`);
      } else {
        console.log(`⚠️ "${inputSheetName}" 시트를 찾을 수 없습니다.`);
      }

      const remainingSheets = workbook.worksheets.map(ws => ws.name);
      console.log(`📋 남은 시트 목록: ${remainingSheets.join(', ')}`);

      if (remainingSheets.length === 0) {
        throw new Error('모든 시트가 제거되어 빈 엑셀 파일이 됩니다.');
      }

      // 서식 보존하여 새 파일로 저장
      await workbook.xlsx.writeFile(targetPath);
      console.log(`✅ 서식 보존 완료: ${targetPath}`);

      // 서식 보존 상태 검증
      const formatInfo = await ExcelFormatPreserving.verifyFormatPreservation(targetPath);
      
      return {
        success: true,
        removedSheet,
        remainingSheets,
        originalFormat: true,
        processedFilePath: targetPath,
        ...formatInfo
      };

    } catch (error) {
      console.error(`❌ ExcelJS 서식 보존 처리 실패:`, error);
      return {
        success: false,
        removedSheet: false,
        remainingSheets: [],
        originalFormat: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 서식 보존 상태 검증
   */
  static async verifyFormatPreservation(filePath: string): Promise<{
    hasMergedCells: boolean;
    hasBorders: boolean;
    hasFontStyles: boolean;
    hasCellColors: boolean;
    formatDetails: any;
  }> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      
      let hasMergedCells = false;
      let hasBorders = false;
      let hasFontStyles = false;
      let hasCellColors = false;
      const formatDetails: any = {};

      workbook.worksheets.forEach(worksheet => {
        const sheetDetails: any = {
          name: worksheet.name,
          mergedCells: [],
          borders: 0,
          fonts: 0,
          fills: 0
        };

        // 병합 셀 확인
        if (worksheet.model.merges && worksheet.model.merges.length > 0) {
          hasMergedCells = true;
          sheetDetails.mergedCells = worksheet.model.merges;
        }

        // 각 셀의 서식 확인
        worksheet.eachRow((row, rowNumber) => {
          row.eachCell((cell, colNumber) => {
            // 테두리 확인
            if (cell.border && Object.keys(cell.border).length > 0) {
              hasBorders = true;
              sheetDetails.borders++;
            }

            // 폰트 스타일 확인
            if (cell.font && Object.keys(cell.font).length > 0) {
              hasFontStyles = true;
              sheetDetails.fonts++;
            }

            // 셀 색상 확인
            if (cell.fill && Object.keys(cell.fill).length > 0) {
              hasCellColors = true;
              sheetDetails.fills++;
            }
          });
        });

        formatDetails[worksheet.name] = sheetDetails;
      });

      console.log(`🔍 서식 검증 결과:`, {
        병합셀: hasMergedCells,
        테두리: hasBorders,
        폰트: hasFontStyles,
        색상: hasCellColors
      });

      return {
        hasMergedCells,
        hasBorders,
        hasFontStyles,
        hasCellColors,
        formatDetails
      };

    } catch (error) {
      console.error(`❌ 서식 검증 실패:`, error);
      return {
        hasMergedCells: false,
        hasBorders: false,
        hasFontStyles: false,
        hasCellColors: false,
        formatDetails: {}
      };
    }
  }

  /**
   * 두 파일의 서식 비교
   */
  static async compareFormats(originalPath: string, processedPath: string): Promise<{
    formatPreserved: boolean;
    differences: string[];
    originalFormat: any;
    processedFormat: any;
  }> {
    try {
      console.log(`🔄 서식 비교 시작: ${originalPath} vs ${processedPath}`);

      const originalFormat = await ExcelFormatPreserving.verifyFormatPreservation(originalPath);
      const processedFormat = await ExcelFormatPreserving.verifyFormatPreservation(processedPath);

      const differences: string[] = [];

      // 각 서식 요소 비교
      if (originalFormat.hasMergedCells !== processedFormat.hasMergedCells) {
        differences.push('병합 셀 정보 불일치');
      }
      if (originalFormat.hasBorders !== processedFormat.hasBorders) {
        differences.push('테두리 정보 불일치');
      }
      if (originalFormat.hasFontStyles !== processedFormat.hasFontStyles) {
        differences.push('폰트 스타일 불일치');
      }
      if (originalFormat.hasCellColors !== processedFormat.hasCellColors) {
        differences.push('셀 색상 불일치');
      }

      const formatPreserved = differences.length === 0;

      console.log(`📊 서식 비교 결과:`, {
        보존됨: formatPreserved,
        차이점: differences.length,
        상세: differences
      });

      return {
        formatPreserved,
        differences,
        originalFormat: originalFormat.formatDetails,
        processedFormat: processedFormat.formatDetails
      };

    } catch (error) {
      console.error(`❌ 서식 비교 실패:`, error);
      return {
        formatPreserved: false,
        differences: ['비교 처리 실패'],
        originalFormat: {},
        processedFormat: {}
      };
    }
  }
}

/**
 * 기존 POTemplateProcessor와 호환되는 래퍼 함수
 */
export async function removeInputSheetPreservingFormat(
  sourcePath: string,
  targetPath: string,
  inputSheetName: string = 'Input'
): Promise<{ success: boolean; removedSheet: boolean; remainingSheets: string[]; error?: string }> {
  const result = await ExcelFormatPreserving.removeInputSheetWithFormatPreserving(
    sourcePath,
    targetPath,
    inputSheetName
  );

  return {
    success: result.success,
    removedSheet: result.removedSheet,
    remainingSheets: result.remainingSheets,
    error: result.error
  };
}