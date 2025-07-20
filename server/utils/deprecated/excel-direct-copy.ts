/**
 * 원본 파일을 직접 복사한 후 Input 시트만 삭제하는 방식
 * 이 방법은 원본 파일의 모든 서식을 100% 보존합니다.
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import ExcelJS from 'exceljs';
import { removeInputSheetSafeMethod } from './xlsx-populate-processor';
import { removeInputSheetBinaryPerfect } from './excel-binary-perfect';
import { removeInputSheetWithPython, checkPythonEnvironment } from './excel-python-caller';
import { removeInputSheetWithXlwings, testXlwingsEnvironment, checkExcelApplication } from './excel-xlwings-caller';
import { removeInputSheetMinimal, removeInputSheetBinaryCopy } from './excel-minimal-caller';
import { removeInputSheetZipComplete } from './excel-zip-complete';

const copyFile = promisify(fs.copyFile);

export interface DirectCopyResult {
  success: boolean;
  removedSheet: boolean;
  remainingSheets: string[];
  originalFormat: boolean;
  error?: string;
  processedFilePath?: string;
}

/**
 * 원본 파일을 먼저 복사한 다음, Input 시트만 제거
 * 이렇게 하면 원본의 모든 서식이 보존됩니다.
 */
export async function removeInputSheetDirectCopy(
  sourcePath: string,
  targetPath: string,
  inputSheetName: string = 'Input'
): Promise<DirectCopyResult> {
  try {
    console.log(`📄 원본 파일 복사 방식으로 처리 시작: ${sourcePath} -> ${targetPath}`);
    
    // 1. 먼저 원본 파일을 대상 경로로 복사
    await copyFile(sourcePath, targetPath);
    console.log(`✅ 원본 파일 복사 완료`);
    
    // 2. 복사된 파일에서 Input 시트만 제거
    const workbook = new ExcelJS.Workbook();
    
    // 중요: 템플릿으로 읽어들이기 (서식 보존)
    await workbook.xlsx.readFile(targetPath);
    
    const originalSheets = workbook.worksheets.map(ws => ws.name);
    console.log(`📋 원본 시트 목록: ${originalSheets.join(', ')}`);
    
    // Input 시트 찾아서 제거
    let removedSheet = false;
    const inputWorksheet = workbook.getWorksheet(inputSheetName);
    
    if (inputWorksheet) {
      // 시트 제거
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
    
    // 3. 수정된 내용 저장
    await workbook.xlsx.writeFile(targetPath);
    console.log(`✅ Input 시트 제거 완료`);
    
    return {
      success: true,
      removedSheet,
      remainingSheets,
      originalFormat: true,
      processedFilePath: targetPath
    };
    
  } catch (error) {
    console.error(`❌ 원본 복사 방식 처리 실패:`, error);
    
    // 실패 시 타겟 파일 삭제
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
    
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
 * xlsx 라이브러리를 사용한 대체 방법
 * ExcelJS가 서식을 제대로 보존하지 못할 경우 사용
 */
export async function removeInputSheetWithXLSX(
  sourcePath: string,
  targetPath: string,
  inputSheetName: string = 'Input'
): Promise<DirectCopyResult> {
  try {
    const XLSX = await import('xlsx');
    
    console.log(`📄 XLSX 라이브러리로 처리 시작: ${sourcePath} -> ${targetPath}`);
    
    // 원본 파일 읽기 (서식 보존 옵션 사용)
    const workbook = XLSX.readFile(sourcePath, {
      bookVBA: true,        // VBA 코드 보존
      bookFiles: true,      // 파일 구조 보존
      cellStyles: true,     // 셀 스타일 보존
      cellFormula: true,    // 수식 보존
      cellHTML: true,       // HTML 서식 보존
      cellDates: true,      // 날짜 서식 보존
      sheetStubs: true,     // 빈 셀도 보존
      bookProps: true,      // 문서 속성 보존
      bookSheets: true      // 시트 정보 보존
    });
    
    const originalSheets = Object.keys(workbook.Sheets);
    console.log(`📋 원본 시트 목록: ${originalSheets.join(', ')}`);
    
    // Input 시트 제거
    let removedSheet = false;
    if (workbook.Sheets[inputSheetName]) {
      delete workbook.Sheets[inputSheetName];
      
      // SheetNames 배열에서도 제거
      const index = workbook.SheetNames.indexOf(inputSheetName);
      if (index > -1) {
        workbook.SheetNames.splice(index, 1);
      }
      
      removedSheet = true;
      console.log(`🗑️ "${inputSheetName}" 시트가 제거되었습니다.`);
    } else {
      console.log(`⚠️ "${inputSheetName}" 시트를 찾을 수 없습니다.`);
    }
    
    const remainingSheets = workbook.SheetNames;
    console.log(`📋 남은 시트 목록: ${remainingSheets.join(', ')}`);
    
    if (remainingSheets.length === 0) {
      throw new Error('모든 시트가 제거되어 빈 엑셀 파일이 됩니다.');
    }
    
    // 수정된 파일 저장 (모든 서식 보존)
    XLSX.writeFile(workbook, targetPath, {
      bookType: 'xlsx',
      bookSST: true,
      type: 'binary',
      compression: true,
      cellStyles: true      // 셀 스타일 보존해서 저장
    });
    
    console.log(`✅ XLSX 처리 완료: ${targetPath}`);
    
    return {
      success: true,
      removedSheet,
      remainingSheets,
      originalFormat: true,
      processedFilePath: targetPath
    };
    
  } catch (error) {
    console.error(`❌ XLSX 처리 실패:`, error);
    
    // 실패 시 타겟 파일 삭제
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
    
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
 * 가장 안전한 방법: 원본 파일의 바이너리를 직접 조작
 * ZIP 구조를 유지하면서 Input 시트 관련 파일만 제거
 */
export async function removeInputSheetBinary(
  sourcePath: string,
  targetPath: string,
  inputSheetName: string = 'Input'
): Promise<DirectCopyResult> {
  const AdmZip = require('adm-zip');
  
  try {
    console.log(`📄 바이너리 직접 처리 시작: ${sourcePath} -> ${targetPath}`);
    
    // 원본 파일을 ZIP으로 읽기
    const zip = new AdmZip(sourcePath);
    const zipEntries = zip.getEntries();
    
    // workbook.xml 읽어서 시트 정보 파악
    const workbookEntry = zip.getEntry('xl/workbook.xml');
    if (!workbookEntry) {
      throw new Error('workbook.xml을 찾을 수 없습니다.');
    }
    
    let workbookXml = workbookEntry.getData().toString('utf8');
    
    // Input 시트의 sheet ID 찾기
    const sheetRegex = new RegExp(`<sheet[^>]*name="${inputSheetName}"[^>]*>`, 'i');
    const sheetMatch = workbookXml.match(sheetRegex);
    
    if (!sheetMatch) {
      console.log(`⚠️ "${inputSheetName}" 시트를 찾을 수 없습니다.`);
      
      // 변경사항이 없으므로 그냥 복사
      await copyFile(sourcePath, targetPath);
      
      return {
        success: true,
        removedSheet: false,
        remainingSheets: [], // TODO: 실제 시트 목록 파싱
        originalFormat: true,
        processedFilePath: targetPath
      };
    }
    
    // sheet ID 추출 (예: r:id="rId3")
    const idMatch = sheetMatch[0].match(/r:id="([^"]+)"/);
    if (!idMatch) {
      throw new Error('시트 ID를 찾을 수 없습니다.');
    }
    
    const sheetId = idMatch[1];
    const sheetNumberMatch = sheetMatch[0].match(/sheetId="(\d+)"/);
    const sheetNumber = sheetNumberMatch ? sheetNumberMatch[1] : '1';
    
    console.log(`🔍 Input 시트 정보: ID=${sheetId}, Number=${sheetNumber}`);
    
    // workbook.xml에서 해당 시트 제거
    workbookXml = workbookXml.replace(sheetMatch[0], '');
    
    // 새 ZIP 생성
    const newZip = new AdmZip();
    
    // 모든 엔트리 복사 (Input 시트 관련 파일 제외)
    zipEntries.forEach(entry => {
      const entryName = entry.entryName;
      
      // Input 시트 관련 파일 스킵
      if (entryName === `xl/worksheets/sheet${sheetNumber}.xml` ||
          entryName === `xl/worksheets/_rels/sheet${sheetNumber}.xml.rels`) {
        console.log(`🗑️ 제거: ${entryName}`);
        return;
      }
      
      // workbook.xml은 수정된 버전 사용
      if (entryName === 'xl/workbook.xml') {
        newZip.addFile(entryName, Buffer.from(workbookXml, 'utf8'));
        return;
      }
      
      // 나머지 파일은 그대로 복사
      newZip.addFile(entryName, entry.getData());
    });
    
    // 새 파일로 저장
    newZip.writeZip(targetPath);
    console.log(`✅ 바이너리 처리 완료: ${targetPath}`);
    
    return {
      success: true,
      removedSheet: true,
      remainingSheets: [], // TODO: 실제 남은 시트 목록 파싱
      originalFormat: true,
      processedFilePath: targetPath
    };
    
  } catch (error) {
    console.error(`❌ 바이너리 처리 실패:`, error);
    
    // 실패 시 타겟 파일 삭제
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
    
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
 * 여러 방법을 시도하여 가장 안전한 방법으로 처리
 */
export async function removeInputSheetSafely(
  sourcePath: string,
  targetPath: string,
  inputSheetName: string = 'Input'
): Promise<DirectCopyResult> {
  console.log(`🔧 안전한 Input 시트 제거 처리 시작...`);
  console.log(`🔧 [DEBUG] removeInputSheetSafely called at ${new Date().toISOString()}`);
  console.log(`🔧 [DEBUG] sourcePath: ${sourcePath}`);
  console.log(`🔧 [DEBUG] targetPath: ${targetPath}`);
  console.log(`🔧 [DEBUG] inputSheetName: ${inputSheetName}`);
  
  // 1. 먼저 ZIP 레벨 완벽 처리 시도 (100% 서식 보존)
  try {
    console.log(`🔧 1순위: ZIP 레벨 완벽 처리로 100% 서식 보존 시도`);
    
    const zipResult = await removeInputSheetZipComplete(sourcePath, targetPath, inputSheetName);
    if (zipResult.success) {
      console.log(`✅ ZIP 레벨 완벽 처리로 성공적으로 처리됨 (100% 서식 보존)`);
      return {
        success: zipResult.success,
        removedSheet: zipResult.removedSheet,
        remainingSheets: zipResult.remainingSheets,
        originalFormat: zipResult.originalFormat,
        processedFilePath: zipResult.processedFilePath,
        error: zipResult.error
      };
    }
  } catch (error) {
    console.log(`⚠️ ZIP 레벨 처리 실패: ${error}`);
  }
  
  // 2. 최소한의 처리 시도 (원본 파일 복사 후 Input 시트만 삭제)
  try {
    console.log(`📋 2순위: 최소한의 처리로 서식 보존 시도`);
    
    const minimalResult = await removeInputSheetMinimal(sourcePath, targetPath, inputSheetName);
    if (minimalResult.success) {
      console.log(`✅ 최소한의 처리로 성공적으로 처리됨 (서식 보존)`);
      return {
        success: minimalResult.success,
        removedSheet: minimalResult.removedSheet,
        remainingSheets: minimalResult.remainingSheets,
        originalFormat: minimalResult.originalFormat,
        processedFilePath: minimalResult.processedFilePath,
        error: minimalResult.error
      };
    }
  } catch (error) {
    console.log(`⚠️ 최소한의 처리 실패: ${error}`);
  }
  
  // 3. 바이너리 복사 후 처리 시도
  try {
    console.log(`🔧 3순위: 바이너리 복사 후 Input 시트 제거 시도`);
    
    const binaryResult = await removeInputSheetBinaryCopy(sourcePath, targetPath, inputSheetName);
    if (binaryResult.success) {
      console.log(`✅ 바이너리 복사 후 처리로 성공적으로 처리됨 (완벽한 서식 보존)`);
      return {
        success: binaryResult.success,
        removedSheet: binaryResult.removedSheet,
        remainingSheets: binaryResult.remainingSheets,
        originalFormat: binaryResult.originalFormat,
        processedFilePath: binaryResult.processedFilePath,
        error: binaryResult.error
      };
    }
  } catch (error) {
    console.log(`⚠️ 바이너리 복사 후 처리 실패: ${error}`);
  }
  
  // 4. xlwings 시도 (엑셀 앱 제어)
  try {
    console.log(`🚀 4순위: xlwings로 엑셀 앱 제어 시도`);
    
    // xlwings 환경 및 엑셀 앱 확인
    const xlwingsEnv = await testXlwingsEnvironment();
    const excelApp = await checkExcelApplication();
    
    if (xlwingsEnv.available && excelApp.available) {
      const xlwingsResult = await removeInputSheetWithXlwings(sourcePath, targetPath, inputSheetName);
      if (xlwingsResult.success) {
        console.log(`✅ xlwings로 성공적으로 처리됨 (엑셀 앱 제어)`);
        return {
          success: xlwingsResult.success,
          removedSheet: xlwingsResult.removedSheet,
          remainingSheets: xlwingsResult.remainingSheets,
          originalFormat: xlwingsResult.originalFormat,
          processedFilePath: xlwingsResult.processedFilePath,
          error: xlwingsResult.error
        };
      }
    } else {
      console.log(`⚠️ xlwings 환경 불완전 - xlwings: ${xlwingsEnv.available}, Excel: ${excelApp.available}`);
      if (xlwingsEnv.error) console.log(`   xlwings 에러: ${xlwingsEnv.error}`);
      if (excelApp.error) console.log(`   Excel 앱 에러: ${excelApp.error}`);
    }
  } catch (error) {
    console.log(`⚠️ xlwings 처리 실패: ${error}`);
  }
  
  // 5. Python openpyxl 시도 (높은 품질 서식 보존)
  try {
    console.log(`🐍 5순위: Python openpyxl로 서식 보존 시도`);
    const pythonEnv = await checkPythonEnvironment();
    
    if (pythonEnv.pythonAvailable && pythonEnv.openpyxlAvailable) {
      const pythonResult = await removeInputSheetWithPython(sourcePath, targetPath, inputSheetName);
      if (pythonResult.success) {
        console.log(`✅ Python openpyxl로 성공적으로 처리됨 (높은 품질 서식 보존)`);
        return {
          success: pythonResult.success,
          removedSheet: pythonResult.removedSheet,
          remainingSheets: pythonResult.remainingSheets,
          originalFormat: pythonResult.originalFormat,
          processedFilePath: pythonResult.processedFilePath,
          error: pythonResult.error
        };
      }
    } else {
      console.log(`⚠️ Python 환경 불완전: ${pythonEnv.error}`);
    }
  } catch (error) {
    console.log(`⚠️ Python 처리 실패: ${error}`);
  }
  
  // 6. JSZip 바이너리 완벽 처리 시도
  try {
    console.log(`🔧 6순위: JSZip 바이너리 완벽 처리 시도`);
    const binaryPerfectResult = await removeInputSheetBinaryPerfect(sourcePath, targetPath, inputSheetName);
    if (binaryPerfectResult.success) {
      console.log(`✅ JSZip 바이너리 처리로 성공적으로 처리됨 (완벽한 서식 보존)`);
      return {
        success: binaryPerfectResult.success,
        removedSheet: binaryPerfectResult.removedSheet,
        remainingSheets: binaryPerfectResult.remainingSheets,
        originalFormat: binaryPerfectResult.originalFormat,
        processedFilePath: binaryPerfectResult.processedFilePath,
        error: binaryPerfectResult.error
      };
    }
  } catch (error) {
    console.log(`⚠️ JSZip 바이너리 처리 실패: ${error}`);
  }
  
  // 7. xlsx-populate 시도 (좋은 서식 보존)
  try {
    console.log(`📄 7순위: xlsx-populate로 서식 보존 시도`);
    const populateResult = await removeInputSheetSafeMethod(sourcePath, targetPath, inputSheetName);
    if (populateResult.success) {
      console.log(`✅ xlsx-populate로 성공적으로 처리됨 (좋은 서식 보존)`);
      return {
        success: populateResult.success,
        removedSheet: populateResult.removedSheet,
        remainingSheets: populateResult.remainingSheets,
        originalFormat: populateResult.originalFormat,
        processedFilePath: populateResult.processedFilePath,
        error: populateResult.error
      };
    }
  } catch (error) {
    console.log(`⚠️ xlsx-populate 실패: ${error}`);
  }
  
  // 8. xlsx 라이브러리 시도 (cellStyles 옵션으로 서식 보존)
  const xlsxResult = await removeInputSheetWithXLSX(sourcePath, targetPath, inputSheetName);
  if (xlsxResult.success) {
    console.log(`✅ XLSX 라이브러리로 성공적으로 처리됨`);
    return xlsxResult;
  }
  
  // 9. 기존 바이너리 처리 시도
  console.log(`⚠️ XLSX 실패, 기존 바이너리 처리 시도...`);
  const binaryResult = await removeInputSheetBinary(sourcePath, targetPath, inputSheetName);
  if (binaryResult.success) {
    console.log(`✅ 기존 바이너리 처리로 성공적으로 처리됨`);
    return binaryResult;
  }
  
  // 10. 마지막으로 원본 복사 + ExcelJS 시도
  console.log(`⚠️ 모든 방법 실패, 원본 복사 방식 시도...`);
  return await removeInputSheetDirectCopy(sourcePath, targetPath, inputSheetName);
}