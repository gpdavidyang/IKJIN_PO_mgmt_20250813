/**
 * JSZip을 사용한 완벽한 엑셀 파일 바이너리 처리
 * 엑셀 파일을 ZIP으로 직접 조작하여 Input 시트만 제거하고 모든 서식 보존
 */

import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

export interface BinaryPerfectResult {
  success: boolean;
  removedSheet: boolean;
  remainingSheets: string[];
  originalFormat: boolean;
  error?: string;
  processedFilePath?: string;
}

/**
 * 엑셀 파일을 ZIP으로 직접 조작하여 Input 시트만 제거
 * 이 방법은 원본 파일의 모든 바이너리 데이터를 그대로 유지
 */
export async function removeInputSheetBinaryPerfect(
  sourcePath: string,
  targetPath: string,
  inputSheetName: string = 'Input'
): Promise<BinaryPerfectResult> {
  try {
    console.log(`🔧 바이너리 완벽 처리 시작: ${sourcePath} -> ${targetPath}`);
    
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
    console.log(`📋 원본 workbook.xml 크기: ${workbookContent.length} bytes`);
    
    // 시트 정보 파싱
    const sheetPattern = /<sheet[^>]*name="([^"]+)"[^>]*sheetId="(\d+)"[^>]*r:id="(rId\d+)"[^>]*\/>/g;
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
    
    // workbook.xml에서 Input 시트 제거
    const sheetElementPattern = new RegExp(`<sheet[^>]*name="${inputSheetName}"[^>]*\\/?>`, 'g');
    workbookContent = workbookContent.replace(sheetElementPattern, '');
    
    // xl/workbook.xml.rels 파일 수정
    const relsPath = 'xl/_rels/workbook.xml.rels';
    const relsFile = zipData.files[relsPath];
    if (relsFile) {
      let relsContent = await relsFile.async('string');
      
      // Input 시트의 관계 제거
      const relationPattern = new RegExp(`<Relationship[^>]*Id="${inputSheet.rId}"[^>]*\\/>`, 'g');
      relsContent = relsContent.replace(relationPattern, '');
      
      // 수정된 rels 파일 저장
      zipData.file(relsPath, relsContent);
      console.log(`🔧 관계 파일 수정: ${relsPath}`);
    }
    
    // 시트 번호 추출 (예: rId3 -> 3)
    const sheetNumberMatch = inputSheet.rId.match(/rId(\d+)/);
    const sheetNumber = sheetNumberMatch ? sheetNumberMatch[1] : inputSheet.sheetId;
    
    // 실제 시트 파일들 제거
    const filesToRemove = [
      `xl/worksheets/sheet${sheetNumber}.xml`,
      `xl/worksheets/_rels/sheet${sheetNumber}.xml.rels`
    ];
    
    for (const filePath of filesToRemove) {
      if (zipData.files[filePath]) {
        zipData.remove(filePath);
        console.log(`🗑️ 파일 제거: ${filePath}`);
      }
    }
    
    // 수정된 workbook.xml 저장
    zipData.file('xl/workbook.xml', workbookContent);
    console.log(`🔧 workbook.xml 수정 완료`);
    
    // 수정된 ZIP 파일 생성
    const result = await zipData.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
    
    // 파일 저장
    fs.writeFileSync(targetPath, result);
    console.log(`✅ 바이너리 완벽 처리 완료: ${targetPath}`);
    
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
    console.error(`❌ 바이너리 완벽 처리 실패:`, error);
    
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
 * 엑셀 파일의 구조 분석 (디버깅용)
 */
export async function analyzeExcelStructure(filePath: string): Promise<void> {
  try {
    const data = fs.readFileSync(filePath);
    const zip = new JSZip();
    const zipData = await zip.loadAsync(data);
    
    console.log(`📊 엑셀 파일 구조 분석: ${filePath}`);
    console.log(`📁 ZIP 엔트리 개수: ${Object.keys(zipData.files).length}`);
    
    // 주요 파일들 나열
    const importantFiles = [
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/sharedStrings.xml'
    ];
    
    for (const file of importantFiles) {
      if (zipData.files[file]) {
        console.log(`✅ ${file} 존재`);
      } else {
        console.log(`❌ ${file} 없음`);
      }
    }
    
    // 워크시트 파일들 찾기
    const worksheetFiles = Object.keys(zipData.files)
      .filter(name => name.startsWith('xl/worksheets/') && name.endsWith('.xml'))
      .sort();
    
    console.log(`📋 워크시트 파일들: ${worksheetFiles.join(', ')}`);
    
    // 스타일 파일들 찾기
    const styleFiles = Object.keys(zipData.files)
      .filter(name => name.includes('style') || name.includes('theme'))
      .sort();
    
    console.log(`🎨 스타일 파일들: ${styleFiles.join(', ')}`);
    
  } catch (error) {
    console.error(`❌ 구조 분석 실패:`, error);
  }
}