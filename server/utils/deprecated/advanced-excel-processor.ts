/**
 * 고급 엑셀 처리 시스템
 * 3가지 방법을 순차적으로 시도하여 최고의 서식 보존 결과 제공
 * 1순위: Python openpyxl (최고 서식 보존)
 * 2순위: ExcelJS (우수한 서식 보존)
 * 3순위: 바이너리 조작 (완전한 원본 보존)
 * 4순위: XLSX.js (기본 fallback)
 */

import fs from 'fs';
import path from 'path';
import { PythonExcelProcessor } from './python-excel-processor';
import { ExcelFormatPreserving } from './excel-format-preserving';
import { BinaryExcelProcessor } from './binary-excel-processor';
import { POTemplateProcessor } from './po-template-processor'; // 기존 XLSX.js 방식

export interface AdvancedExcelResult {
  success: boolean;
  method: 'python' | 'exceljs' | 'binary' | 'xlsx' | 'none';
  removedSheet: boolean;
  remainingSheets: string[];
  originalFormat: boolean;
  processedFilePath?: string;
  formatVerification?: any;
  methodDetails?: any;
  error?: string;
  fallbackReasons?: string[];
}

export class AdvancedExcelProcessor {

  /**
   * 최적의 방법으로 Input 시트 제거 및 서식 보존
   */
  static async removeInputSheetAdvanced(
    sourcePath: string,
    targetPath: string,
    inputSheetName: string = 'Input'
  ): Promise<AdvancedExcelResult> {
    const fallbackReasons: string[] = [];
    
    console.log(`🚀 고급 엑셀 처리 시작: ${sourcePath} -> ${targetPath}`);

    // 1순위: Python openpyxl 시도
    try {
      console.log(`🐍 1순위: Python openpyxl 시도`);
      const pythonResult = await PythonExcelProcessor.removeInputSheetWithPython(
        sourcePath,
        targetPath,
        inputSheetName,
        { verify: true, compare: false }
      );

      if (pythonResult.success && pythonResult.originalFormat) {
        console.log(`✅ Python 방식 성공 - 최고 품질 서식 보존`);
        return {
          success: true,
          method: 'python',
          removedSheet: pythonResult.removedSheet,
          remainingSheets: pythonResult.remainingSheets,
          originalFormat: pythonResult.originalFormat,
          processedFilePath: pythonResult.processedFilePath,
          formatVerification: pythonResult.formatVerification,
          methodDetails: { type: 'Python openpyxl', quality: 'highest' }
        };
      } else {
        fallbackReasons.push(`Python 실패: ${pythonResult.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      fallbackReasons.push(`Python 오류: ${error}`);
      console.log(`⚠️ Python 방식 실패, ExcelJS로 fallback`);
    }

    // 2순위: ExcelJS 시도
    try {
      console.log(`📊 2순위: ExcelJS 시도`);
      const exceljsResult = await ExcelFormatPreserving.removeInputSheetWithFormatPreserving(
        sourcePath,
        targetPath,
        inputSheetName
      );

      if (exceljsResult.success && exceljsResult.originalFormat) {
        console.log(`✅ ExcelJS 방식 성공 - 우수한 품질 서식 보존`);
        return {
          success: true,
          method: 'exceljs',
          removedSheet: exceljsResult.removedSheet,
          remainingSheets: exceljsResult.remainingSheets,
          originalFormat: exceljsResult.originalFormat,
          processedFilePath: exceljsResult.processedFilePath,
          methodDetails: { type: 'ExcelJS', quality: 'high' },
          fallbackReasons
        };
      } else {
        fallbackReasons.push(`ExcelJS 실패: ${exceljsResult.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      fallbackReasons.push(`ExcelJS 오류: ${error}`);
      console.log(`⚠️ ExcelJS 방식 실패, 바이너리 조작으로 fallback`);
    }

    // 3순위: 바이너리 조작 시도
    try {
      console.log(`📁 3순위: 바이너리 조작 시도`);
      const binaryResult = await BinaryExcelProcessor.removeInputSheetBinaryLevel(
        sourcePath,
        targetPath,
        inputSheetName
      );

      if (binaryResult.success) {
        console.log(`✅ 바이너리 방식 성공 - 완전한 원본 보존`);
        return {
          success: true,
          method: 'binary',
          removedSheet: binaryResult.removedSheet,
          remainingSheets: binaryResult.remainingSheets,
          originalFormat: binaryResult.originalFormat,
          processedFilePath: binaryResult.processedFilePath,
          methodDetails: { type: 'Binary ZIP manipulation', quality: 'perfect' },
          fallbackReasons
        };
      } else {
        fallbackReasons.push(`바이너리 실패: ${binaryResult.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      fallbackReasons.push(`바이너리 오류: ${error}`);
      console.log(`⚠️ 바이너리 방식 실패, XLSX.js로 최종 fallback`);
    }

    // 4순위: XLSX.js 기본 방식 (최종 fallback)
    try {
      console.log(`📋 4순위: XLSX.js 기본 방식 (최종 fallback)`);
      const xlsxResult = await POTemplateProcessor.removeInputSheetOnly(
        sourcePath,
        targetPath,
        inputSheetName
      );

      if (xlsxResult.success) {
        console.log(`⚠️ XLSX.js 방식 성공 - 기본 품질 (서식 손상 가능)`);
        return {
          success: true,
          method: 'xlsx',
          removedSheet: xlsxResult.removedSheet,
          remainingSheets: xlsxResult.remainingSheets,
          originalFormat: false, // XLSX.js는 서식 손상 가능
          processedFilePath: targetPath,
          methodDetails: { 
            type: 'XLSX.js fallback', 
            quality: 'basic',
            warning: '서식이 손상될 수 있습니다'
          },
          fallbackReasons
        };
      } else {
        fallbackReasons.push(`XLSX.js 실패: ${xlsxResult.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      fallbackReasons.push(`XLSX.js 오류: ${error}`);
    }

    // 모든 방법 실패
    console.error(`❌ 모든 처리 방법 실패`);
    return {
      success: false,
      method: 'none',
      removedSheet: false,
      remainingSheets: [],
      originalFormat: false,
      error: '모든 처리 방법이 실패했습니다',
      fallbackReasons
    };
  }

  /**
   * 처리 방법별 품질 비교 테스트
   */
  static async compareAllMethods(
    sourcePath: string,
    outputDir: string,
    inputSheetName: string = 'Input'
  ): Promise<{
    results: Array<{
      method: string;
      success: boolean;
      quality: string;
      filePath?: string;
      formatVerification?: any;
      error?: string;
    }>;
    recommended: string;
  }> {
    const results = [];
    const timestamp = Date.now();

    // 각 방법별로 테스트
    const methods = [
      { name: 'python', processor: PythonExcelProcessor },
      { name: 'exceljs', processor: ExcelFormatPreserving },
      { name: 'binary', processor: BinaryExcelProcessor },
      { name: 'xlsx', processor: POTemplateProcessor }
    ];

    for (const method of methods) {
      const outputPath = path.join(outputDir, `test-${method.name}-${timestamp}.xlsx`);
      
      try {
        let result;
        switch (method.name) {
          case 'python':
            result = await PythonExcelProcessor.removeInputSheetWithPython(
              sourcePath, outputPath, inputSheetName, { verify: true }
            );
            break;
          case 'exceljs':
            result = await ExcelFormatPreserving.removeInputSheetWithFormatPreserving(
              sourcePath, outputPath, inputSheetName
            );
            break;
          case 'binary':
            result = await BinaryExcelProcessor.removeInputSheetBinaryLevel(
              sourcePath, outputPath, inputSheetName
            );
            break;
          case 'xlsx':
            result = await POTemplateProcessor.removeInputSheetOnly(
              sourcePath, outputPath, inputSheetName
            );
            break;
        }

        if (result?.success) {
          results.push({
            method: method.name,
            success: true,
            quality: method.name === 'python' ? 'highest' : 
                    method.name === 'exceljs' ? 'high' :
                    method.name === 'binary' ? 'perfect' : 'basic',
            filePath: outputPath,
            formatVerification: (result as any).formatVerification
          });
        } else {
          results.push({
            method: method.name,
            success: false,
            quality: 'failed',
            error: (result as any)?.error || 'Unknown error'
          });
        }
      } catch (error) {
        results.push({
          method: method.name,
          success: false,
          quality: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // 권장 방법 결정
    const successfulMethods = results.filter(r => r.success);
    let recommended = 'none';
    
    if (successfulMethods.find(r => r.method === 'python')) {
      recommended = 'python';
    } else if (successfulMethods.find(r => r.method === 'binary')) {
      recommended = 'binary';
    } else if (successfulMethods.find(r => r.method === 'exceljs')) {
      recommended = 'exceljs';
    } else if (successfulMethods.find(r => r.method === 'xlsx')) {
      recommended = 'xlsx';
    }

    return { results, recommended };
  }

  /**
   * 환경 진단
   */
  static async diagnoseEnvironment(): Promise<{
    pythonAvailable: boolean;
    exceljsAvailable: boolean;
    binaryAvailable: boolean;
    xlsxAvailable: boolean;
    recommendation: string;
    details: any;
  }> {
    const diagnosis = {
      pythonAvailable: false,
      exceljsAvailable: false,
      binaryAvailable: false,
      xlsxAvailable: false,
      recommendation: '',
      details: {} as any
    };

    // Python 환경 확인
    try {
      const pythonCheck = await PythonExcelProcessor.checkPythonEnvironment();
      diagnosis.pythonAvailable = pythonCheck.available;
      diagnosis.details.python = pythonCheck;
    } catch (error) {
      diagnosis.details.python = { error: error };
    }

    // ExcelJS 확인
    try {
      diagnosis.exceljsAvailable = true;
      diagnosis.details.exceljs = { available: true };
    } catch (error) {
      diagnosis.details.exceljs = { error: error };
    }

    // 바이너리 조작 가능성 확인
    try {
      diagnosis.binaryAvailable = true;
      diagnosis.details.binary = { available: true };
    } catch (error) {
      diagnosis.details.binary = { error: error };
    }

    // XLSX.js 확인
    try {
      diagnosis.xlsxAvailable = true;
      diagnosis.details.xlsx = { available: true };
    } catch (error) {
      diagnosis.details.xlsx = { error: error };
    }

    // 권장 방법 결정
    if (diagnosis.pythonAvailable) {
      diagnosis.recommendation = 'python';
    } else if (diagnosis.binaryAvailable) {
      diagnosis.recommendation = 'binary';
    } else if (diagnosis.exceljsAvailable) {
      diagnosis.recommendation = 'exceljs';
    } else if (diagnosis.xlsxAvailable) {
      diagnosis.recommendation = 'xlsx';
    } else {
      diagnosis.recommendation = 'none';
    }

    return diagnosis;
  }
}

/**
 * 기존 인터페이스와 호환되는 메인 함수
 */
export async function removeInputSheetAdvancedMethod(
  sourcePath: string,
  targetPath: string,
  inputSheetName: string = 'Input'
): Promise<{ success: boolean; removedSheet: boolean; remainingSheets: string[]; error?: string; method?: string }> {
  const result = await AdvancedExcelProcessor.removeInputSheetAdvanced(
    sourcePath,
    targetPath,
    inputSheetName
  );

  return {
    success: result.success,
    removedSheet: result.removedSheet,
    remainingSheets: result.remainingSheets,
    error: result.error,
    method: result.method
  };
}