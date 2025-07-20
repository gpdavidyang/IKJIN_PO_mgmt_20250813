/**
 * ZIP 레벨에서 직접 엑셀 파일을 조작하여 100% 서식 보존
 * 엑셀 파일의 내부 구조에서 Input 시트 관련 파일들만 제거
 */

import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

export interface ZipPerfectResult {
  success: boolean;
  removedSheet: boolean;
  remainingSheets: string[];
  originalFormat: boolean;
  error?: string;
  processedFilePath?: string;
}

/**
 * ZIP 구조에서 Input 시트 관련 파일들만 제거하여 100% 서식 보존
 */
export async function removeInputSheetZipPerfect(
  sourcePath: string,
  targetPath: string,
  inputSheetName: string = 'Input'
): Promise<ZipPerfectResult> {
  try {
    console.log(`🔧 ZIP 레벨 완벽 처리 시작: ${sourcePath} -> ${targetPath}`);
    
    // 원본 파일 읽기
    const data = fs.readFileSync(sourcePath);
    const zip = new JSZip();
    
    // ZIP 파일로 로드
    const zipData = await zip.loadAsync(data);
    
    // workbook.xml 파일 읽기
    const workbookXml = zipData.files['xl/workbook.xml'];
    if (!workbookXml) {
      throw new Error('workbook.xml을 찾을 수 없습니다.');
    }
    
    let workbookContent = await workbookXml.async('string');
    console.log(`📋 workbook.xml 읽기 완료`);
    
    // 시트 정보 파싱
    const sheetPattern = /<sheet[^>]*name="([^"]+)"[^>]*sheetId="(\d+)"[^>]*r:id="(rId\d+)"[^>]*\/?>/g;
    const sheets: Array<{name: string, sheetId: string, rId: string}> = [];
    let match;
    
    while ((match = sheetPattern.exec(workbookContent)) !== null) {
      sheets.push({
        name: match[1],
        sheetId: match[2],
        rId: match[3]
      });
    }
    
    console.log(`📋 발견된 시트: ${sheets.map(s => s.name).join(', ')}`);
    
    // Input 시트 찾기
    const inputSheet = sheets.find(s => s.name === inputSheetName);
    if (!inputSheet) {
      console.log(`⚠️ "${inputSheetName}" 시트를 찾을 수 없습니다.`);
      
      // 변경사항이 없으므로 그냥 복사
      fs.copyFileSync(sourcePath, targetPath);
      return {
        success: true,
        removedSheet: false,
        remainingSheets: sheets.map(s => s.name),
        originalFormat: true,
        processedFilePath: targetPath
      };
    }
    
    console.log(`🎯 Input 시트 발견: ${inputSheet.name} (ID: ${inputSheet.sheetId}, rId: ${inputSheet.rId})`);
    
    // 새 ZIP 생성
    const newZip = new JSZip();
    
    // workbook.xml에서 Input 시트 제거
    const sheetElementPattern = new RegExp(`<sheet[^>]*name="${inputSheetName}"[^>]*\/?>`, 'g');
    const newWorkbookContent = workbookContent.replace(sheetElementPattern, '');
    
    // xl/workbook.xml.rels 파일 수정
    const relsPath = 'xl/_rels/workbook.xml.rels';
    const relsFile = zipData.files[relsPath];
    let newRelsContent = '';
    
    if (relsFile) {
      let relsContent = await relsFile.async('string');
      
      // Input 시트의 관계 제거
      const relationPattern = new RegExp(`<Relationship[^>]*Id="${inputSheet.rId}"[^>]*\\/>`, 'g');
      newRelsContent = relsContent.replace(relationPattern, '');
      
      console.log(`🔧 관계 파일 수정: ${relsPath}`);
    }
    
    // 시트 번호 추출 (예: rId3 -> 3)
    const sheetNumberMatch = inputSheet.rId.match(/rId(\d+)/);
    const sheetNumber = sheetNumberMatch ? sheetNumberMatch[1] : inputSheet.sheetId;
    
    // 제거할 파일 목록
    const filesToRemove = [
      `xl/worksheets/sheet${sheetNumber}.xml`,
      `xl/worksheets/_rels/sheet${sheetNumber}.xml.rels`,
      `xl/worksheets/sheet${inputSheet.sheetId}.xml`,
      `xl/worksheets/_rels/sheet${inputSheet.sheetId}.xml.rels`
    ];
    
    console.log(`🗑️ 제거할 파일들: ${filesToRemove.join(', ')}`);
    
    // 모든 파일 복사 (Input 시트 관련 파일 제외)
    let removedFiles = 0;
    for (const [filePath, file] of Object.entries(zipData.files)) {
      if (file.dir) continue;
      
      // Input 시트 관련 파일 스킵
      if (filesToRemove.includes(filePath)) {
        console.log(`🗑️ 제거: ${filePath}`);
        removedFiles++;
        continue;
      }
      
      // workbook.xml은 수정된 버전 사용
      if (filePath === 'xl/workbook.xml') {
        newZip.file(filePath, newWorkbookContent);
        continue;
      }
      
      // workbook.xml.rels는 수정된 버전 사용
      if (filePath === relsPath && newRelsContent) {
        newZip.file(filePath, newRelsContent);
        continue;
      }
      
      // 나머지 파일은 그대로 복사
      const fileData = await file.async('uint8array');
      newZip.file(filePath, fileData);
    }
    
    console.log(`📊 제거된 파일 수: ${removedFiles}`);
    
    // 새 ZIP 파일 생성
    const result = await newZip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
    
    // 파일 저장
    fs.writeFileSync(targetPath, result);
    console.log(`✅ ZIP 레벨 완벽 처리 완료: ${targetPath}`);
    
    // 남은 시트 목록
    const remainingSheets = sheets
      .filter(s => s.name !== inputSheetName)
      .map(s => s.name);
    
    return {
      success: true,
      removedSheet: true,
      remainingSheets,
      originalFormat: true,
      processedFilePath: targetPath
    };
    
  } catch (error) {
    console.error(`❌ ZIP 레벨 처리 실패:`, error);
    
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
 * 엑셀 파일의 내부 구조 분석 (디버깅용)
 */
export async function analyzeExcelInternalStructure(filePath: string): Promise<{
  sheets: Array<{name: string, sheetId: string, rId: string}>;
  files: string[];
  workbookXml: string;
}> {
  try {
    const data = fs.readFileSync(filePath);
    const zip = new JSZip();
    const zipData = await zip.loadAsync(data);
    
    // workbook.xml 읽기
    const workbookXml = zipData.files['xl/workbook.xml'];
    const workbookContent = await workbookXml.async('string');
    
    // 시트 정보 파싱
    const sheetPattern = /<sheet[^>]*name="([^"]+)"[^>]*sheetId="(\d+)"[^>]*r:id="(rId\d+)"[^>]*\/?>/g;
    const sheets: Array<{name: string, sheetId: string, rId: string}> = [];
    let match;
    
    while ((match = sheetPattern.exec(workbookContent)) !== null) {
      sheets.push({
        name: match[1],
        sheetId: match[2],
        rId: match[3]
      });
    }
    
    // 모든 파일 목록
    const files = Object.keys(zipData.files).filter(name => !zipData.files[name].dir);
    
    console.log(`📊 엑셀 파일 내부 구조 분석:`);
    console.log(`   시트 수: ${sheets.length}`);
    console.log(`   파일 수: ${files.length}`);
    console.log(`   시트 목록: ${sheets.map(s => `${s.name}(${s.rId})`).join(', ')}`);
    
    return {
      sheets,
      files,
      workbookXml: workbookContent
    };
    
  } catch (error) {
    console.error(`❌ 구조 분석 실패:`, error);
    return {
      sheets: [],
      files: [],
      workbookXml: ''
    };
  }
}

/**
 * 두 엑셀 파일의 내부 구조 비교
 */
export async function compareExcelStructures(
  originalPath: string,
  processedPath: string
): Promise<{
  identical: boolean;
  differences: string[];
  originalSheets: string[];
  processedSheets: string[];
}> {
  try {
    const original = await analyzeExcelInternalStructure(originalPath);
    const processed = await analyzeExcelInternalStructure(processedPath);
    
    const differences: string[] = [];
    
    // 파일 수 비교
    if (original.files.length !== processed.files.length) {
      differences.push(`파일 수 차이: ${original.files.length} vs ${processed.files.length}`);
    }
    
    // 시트 수 비교
    if (original.sheets.length !== processed.sheets.length) {
      differences.push(`시트 수 차이: ${original.sheets.length} vs ${processed.sheets.length}`);
    }
    
    const originalSheets = original.sheets.map(s => s.name);
    const processedSheets = processed.sheets.map(s => s.name);
    
    // 시트 이름 비교
    const removedSheets = originalSheets.filter(name => !processedSheets.includes(name));
    const addedSheets = processedSheets.filter(name => !originalSheets.includes(name));
    
    if (removedSheets.length > 0) {
      differences.push(`제거된 시트: ${removedSheets.join(', ')}`);
    }
    
    if (addedSheets.length > 0) {
      differences.push(`추가된 시트: ${addedSheets.join(', ')}`);
    }
    
    const identical = differences.length === 0;
    
    console.log(`🔍 구조 비교 결과:`);
    console.log(`   동일함: ${identical}`);
    console.log(`   차이점: ${differences.join('; ')}`);
    
    return {
      identical,
      differences,
      originalSheets,
      processedSheets
    };
    
  } catch (error) {
    console.error(`❌ 구조 비교 실패:`, error);
    return {
      identical: false,
      differences: ['비교 실패'],
      originalSheets: [],
      processedSheets: []
    };
  }
}