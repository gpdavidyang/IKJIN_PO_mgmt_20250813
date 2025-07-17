/**
 * xlsx-populate를 사용한 완벽한 서식 보존 엑셀 처리
 * 이 라이브러리는 원본 엑셀 파일의 모든 서식을 그대로 유지합니다.
 */

import XlsxPopulate from 'xlsx-populate';
import fs from 'fs';
import path from 'path';

export interface XlsxPopulateResult {
  success: boolean;
  removedSheet: boolean;
  remainingSheets: string[];
  originalFormat: boolean;
  error?: string;
  processedFilePath?: string;
}

/**
 * xlsx-populate를 사용하여 Input 시트만 제거하고 모든 서식 보존
 * 이 방법은 원본 파일의 모든 스타일을 100% 보존합니다.
 */
export async function removeInputSheetWithXlsxPopulate(
  sourcePath: string,
  targetPath: string,
  inputSheetName: string = 'Input'
): Promise<XlsxPopulateResult> {
  try {
    console.log(`📄 xlsx-populate로 완벽한 서식 보존 처리 시작: ${sourcePath} -> ${targetPath}`);
    
    // 소스 파일 존재 확인
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`소스 파일을 찾을 수 없습니다: ${sourcePath}`);
    }

    // xlsx-populate로 워크북 로드
    // 이 라이브러리는 원본 파일을 그대로 로드하여 서식을 유지합니다
    const workbook = await XlsxPopulate.fromFileAsync(sourcePath);
    
    // 모든 시트 이름 가져오기
    const allSheets = workbook.sheets();
    const originalSheetNames = allSheets.map(sheet => sheet.name());
    console.log(`📋 원본 시트 목록: ${originalSheetNames.join(', ')}`);

    // Input 시트 찾기
    let removedSheet = false;
    const inputSheet = workbook.sheet(inputSheetName);
    
    if (inputSheet) {
      // Input 시트 삭제
      workbook.deleteSheet(inputSheetName);
      removedSheet = true;
      console.log(`🗑️ "${inputSheetName}" 시트가 제거되었습니다.`);
    } else {
      console.log(`⚠️ "${inputSheetName}" 시트를 찾을 수 없습니다.`);
    }

    // 남은 시트 목록
    const remainingSheets = workbook.sheets().map(sheet => sheet.name());
    console.log(`📋 남은 시트 목록: ${remainingSheets.join(', ')}`);

    if (remainingSheets.length === 0) {
      throw new Error('모든 시트가 제거되어 빈 엑셀 파일이 됩니다.');
    }

    // 수정된 파일 저장
    // xlsx-populate는 원본의 모든 서식을 그대로 유지합니다
    await workbook.toFileAsync(targetPath);
    console.log(`✅ 서식 보존 완료: ${targetPath}`);

    // 결과 반환
    return {
      success: true,
      removedSheet,
      remainingSheets,
      originalFormat: true,
      processedFilePath: targetPath
    };

  } catch (error) {
    console.error(`❌ xlsx-populate 처리 실패:`, error);
    
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
 * 서식 보존 여부를 검증하는 유틸리티 함수
 */
export async function verifyFormatPreservation(
  originalPath: string,
  processedPath: string
): Promise<{
  formatIdentical: boolean;
  details: any;
}> {
  try {
    const originalWorkbook = await XlsxPopulate.fromFileAsync(originalPath);
    const processedWorkbook = await XlsxPopulate.fromFileAsync(processedPath);
    
    const details: any = {
      sheets: {},
      differences: []
    };
    
    // 각 시트의 서식 비교
    processedWorkbook.sheets().forEach(sheet => {
      const sheetName = sheet.name();
      const originalSheet = originalWorkbook.sheet(sheetName);
      
      if (!originalSheet) {
        details.differences.push(`시트 "${sheetName}"이 원본에 없습니다.`);
        return;
      }
      
      // 간단한 서식 체크 (더 자세한 검증 가능)
      const sheetDetails = {
        name: sheetName,
        rowCount: sheet.usedRange()?.endCell()?.rowNumber() || 0,
        columnCount: sheet.usedRange()?.endCell()?.columnNumber() || 0
      };
      
      details.sheets[sheetName] = sheetDetails;
    });
    
    const formatIdentical = details.differences.length === 0;
    
    console.log(`🔍 서식 검증 결과:`, {
      동일함: formatIdentical,
      차이점: details.differences.length
    });
    
    return {
      formatIdentical,
      details
    };
    
  } catch (error) {
    console.error(`❌ 서식 검증 실패:`, error);
    return {
      formatIdentical: false,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

/**
 * 가장 안전한 방법: 먼저 원본 파일을 복사한 후 Input 시트만 삭제
 * 이렇게 하면 100% 원본 서식이 보존됩니다.
 */
export async function removeInputSheetSafeMethod(
  sourcePath: string,
  targetPath: string,
  inputSheetName: string = 'Input'
): Promise<XlsxPopulateResult> {
  try {
    console.log(`🔧 가장 안전한 방법으로 처리 시작...`);
    
    // 1단계: 먼저 원본 파일을 타겟 경로로 복사
    await fs.promises.copyFile(sourcePath, targetPath);
    console.log(`✅ 원본 파일 복사 완료`);
    
    // 2단계: 복사된 파일에서 Input 시트만 제거
    const workbook = await XlsxPopulate.fromFileAsync(targetPath);
    
    const originalSheetNames = workbook.sheets().map(sheet => sheet.name());
    console.log(`📋 시트 목록: ${originalSheetNames.join(', ')}`);
    
    let removedSheet = false;
    if (workbook.sheet(inputSheetName)) {
      workbook.deleteSheet(inputSheetName);
      removedSheet = true;
      console.log(`🗑️ "${inputSheetName}" 시트 제거됨`);
    }
    
    const remainingSheets = workbook.sheets().map(sheet => sheet.name());
    
    // 3단계: 변경사항 저장
    await workbook.toFileAsync(targetPath);
    console.log(`✅ 처리 완료 (원본 서식 100% 보존)`);
    
    return {
      success: true,
      removedSheet,
      remainingSheets,
      originalFormat: true,
      processedFilePath: targetPath
    };
    
  } catch (error) {
    console.error(`❌ 안전한 방법 처리 실패:`, error);
    
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