/**
 * 완전한 ZIP 구조 기반 Excel 시트 삭제 - 100% 서식 보존
 * [Content_Types].xml, sheetId 재조정, 정확한 rId 매핑까지 모든 XML 수정
 */

import JSZip from 'jszip';
import fs from 'fs';
import { DOMParser, XMLSerializer } from 'xmldom';

export interface CompleteZipResult {
  success: boolean;
  removedSheet: boolean;
  remainingSheets: string[];
  originalFormat: boolean;
  error?: string;
  processedFilePath?: string;
  debugInfo?: {
    removedFiles: string[];
    modifiedFiles: string[];
    contentTypesUpdated: boolean;
    sheetIdsReordered: boolean;
  };
}

/**
 * ZIP 구조에서 Excel 시트를 완전히 제거하면서 모든 XML 파일 수정
 */
export async function removeInputSheetZipComplete(
  sourcePath: string,
  targetPath: string,
  inputSheetName: string = 'Input'
): Promise<CompleteZipResult> {
  try {
    console.log(`🔧 완전한 ZIP 구조 처리 시작: ${sourcePath} -> ${targetPath}`);
    console.log(`🔧 [DEBUG] removeInputSheetZipComplete called at ${new Date().toISOString()}`);
    
    // 원본 파일 읽기
    const data = fs.readFileSync(sourcePath);
    const zip = new JSZip();
    const zipData = await zip.loadAsync(data);
    
    const parser = new DOMParser();
    const serializer = new XMLSerializer();
    const debugInfo = {
      removedFiles: [] as string[],
      modifiedFiles: [] as string[],
      contentTypesUpdated: false,
      sheetIdsReordered: false
    };

    // 1. workbook.xml 분석
    const workbookXml = zipData.files['xl/workbook.xml'];
    if (!workbookXml) {
      throw new Error('workbook.xml을 찾을 수 없습니다.');
    }
    
    const workbookContent = await workbookXml.async('string');
    const workbookDoc = parser.parseFromString(workbookContent, 'text/xml');
    
    // 시트 정보 파싱
    const sheets: Array<{name: string, sheetId: string, rId: string, element: Element}> = [];
    const sheetElements = workbookDoc.getElementsByTagName('sheet');
    
    for (let i = 0; i < sheetElements.length; i++) {
      const sheet = sheetElements[i] as Element;
      sheets.push({
        name: sheet.getAttribute('name') || '',
        sheetId: sheet.getAttribute('sheetId') || '',
        rId: sheet.getAttribute('r:id') || '',
        element: sheet
      });
    }
    
    console.log(`📋 발견된 시트: ${sheets.map(s => s.name).join(', ')}`);
    
    // Input 시트 찾기
    const inputSheet = sheets.find(s => s.name === inputSheetName);
    if (!inputSheet) {
      console.log(`⚠️ "${inputSheetName}" 시트를 찾을 수 없습니다.`);
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
    
    // 2. xl/_rels/workbook.xml.rels에서 실제 시트 파일 매핑 확인
    const relsPath = 'xl/_rels/workbook.xml.rels';
    const relsFile = zipData.files[relsPath];
    let actualSheetFile = '';
    
    if (relsFile) {
      const relsContent = await relsFile.async('string');
      const relsDoc = parser.parseFromString(relsContent, 'text/xml');
      const relationships = relsDoc.getElementsByTagName('Relationship');
      
      for (let i = 0; i < relationships.length; i++) {
        const rel = relationships[i] as Element;
        if (rel.getAttribute('Id') === inputSheet.rId) {
          const target = rel.getAttribute('Target') || '';
          actualSheetFile = target.replace('worksheets/', '');
          console.log(`🔍 실제 시트 파일: ${actualSheetFile}`);
          break;
        }
      }
    }
    
    // 3. [Content_Types].xml 수정
    const contentTypesPath = '[Content_Types].xml';
    const contentTypesFile = zipData.files[contentTypesPath];
    
    if (contentTypesFile) {
      const contentTypesContent = await contentTypesFile.async('string');
      const contentTypesDoc = parser.parseFromString(contentTypesContent, 'text/xml');
      const overrides = contentTypesDoc.getElementsByTagName('Override');
      
      // Input 시트에 해당하는 Override 엔트리 제거
      const sheetPartName = `/xl/worksheets/${actualSheetFile}`;
      
      for (let i = overrides.length - 1; i >= 0; i--) {
        const override = overrides[i] as Element;
        if (override.getAttribute('PartName') === sheetPartName) {
          override.parentNode?.removeChild(override);
          debugInfo.contentTypesUpdated = true;
          console.log(`🗑️ [Content_Types].xml에서 제거: ${sheetPartName}`);
          break;
        }
      }
      
      // 수정된 [Content_Types].xml 저장
      const updatedContentTypesXml = serializer.serializeToString(contentTypesDoc);
      zipData.file(contentTypesPath, updatedContentTypesXml);
      debugInfo.modifiedFiles.push(contentTypesPath);
    }
    
    // 4. workbook.xml에서 Input 시트 제거
    inputSheet.element.parentNode?.removeChild(inputSheet.element);
    
    // 5. sheetId 재조정 (연속적으로 만들기)
    const remainingSheetElements = workbookDoc.getElementsByTagName('sheet');
    for (let i = 0; i < remainingSheetElements.length; i++) {
      const sheet = remainingSheetElements[i] as Element;
      const newSheetId = (i + 1).toString();
      sheet.setAttribute('sheetId', newSheetId);
      debugInfo.sheetIdsReordered = true;
    }
    
    // 수정된 workbook.xml 저장
    const updatedWorkbookXml = serializer.serializeToString(workbookDoc);
    zipData.file('xl/workbook.xml', updatedWorkbookXml);
    debugInfo.modifiedFiles.push('xl/workbook.xml');
    
    // 6. xl/_rels/workbook.xml.rels에서 Input 시트 관계 제거
    if (relsFile) {
      const relsContent = await relsFile.async('string');
      const relsDoc = parser.parseFromString(relsContent, 'text/xml');
      const relationships = relsDoc.getElementsByTagName('Relationship');
      
      for (let i = relationships.length - 1; i >= 0; i--) {
        const rel = relationships[i] as Element;
        if (rel.getAttribute('Id') === inputSheet.rId) {
          rel.parentNode?.removeChild(rel);
          console.log(`🗑️ 관계 제거: ${inputSheet.rId}`);
          break;
        }
      }
      
      // 수정된 rels 파일 저장
      const updatedRelsXml = serializer.serializeToString(relsDoc);
      zipData.file(relsPath, updatedRelsXml);
      debugInfo.modifiedFiles.push(relsPath);
    }
    
    // 7. 실제 시트 파일들 제거
    const filesToRemove = [
      `xl/worksheets/${actualSheetFile}`,
      `xl/worksheets/_rels/${actualSheetFile.replace('.xml', '.xml.rels')}`
    ];
    
    for (const filePath of filesToRemove) {
      if (zipData.files[filePath]) {
        zipData.remove(filePath);
        debugInfo.removedFiles.push(filePath);
        console.log(`🗑️ 파일 제거: ${filePath}`);
      }
    }
    
    // 8. 새 ZIP 파일 생성
    const result = await zipData.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
    
    // 파일 저장
    fs.writeFileSync(targetPath, result);
    console.log(`✅ 완전한 ZIP 구조 처리 완료: ${targetPath}`);
    
    // 남은 시트 목록
    const remainingSheets = sheets
      .filter(s => s.name !== inputSheetName)
      .map(s => s.name);
    
    console.log(`📊 처리 요약:`);
    console.log(`   제거된 파일: ${debugInfo.removedFiles.length}개`);
    console.log(`   수정된 파일: ${debugInfo.modifiedFiles.length}개`);
    console.log(`   Content Types 업데이트: ${debugInfo.contentTypesUpdated}`);
    console.log(`   Sheet ID 재조정: ${debugInfo.sheetIdsReordered}`);
    
    return {
      success: true,
      removedSheet: true,
      remainingSheets,
      originalFormat: true,
      processedFilePath: targetPath,
      debugInfo
    };
    
  } catch (error) {
    console.error(`❌ 완전한 ZIP 구조 처리 실패:`, error);
    
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
 * Excel 파일의 완전한 내부 구조 분석
 */
export async function analyzeCompleteExcelStructure(filePath: string): Promise<{
  contentTypes: Array<{partName: string, contentType: string}>;
  sheets: Array<{name: string, sheetId: string, rId: string, actualFile: string}>;
  relationships: Array<{id: string, type: string, target: string}>;
  files: string[];
  isValid: boolean;
}> {
  try {
    const data = fs.readFileSync(filePath);
    const zip = new JSZip();
    const zipData = await zip.loadAsync(data);
    const parser = new DOMParser();
    
    // [Content_Types].xml 분석
    const contentTypes: Array<{partName: string, contentType: string}> = [];
    const contentTypesFile = zipData.files['[Content_Types].xml'];
    if (contentTypesFile) {
      const contentTypesContent = await contentTypesFile.async('string');
      const contentTypesDoc = parser.parseFromString(contentTypesContent, 'text/xml');
      const overrides = contentTypesDoc.getElementsByTagName('Override');
      
      for (let i = 0; i < overrides.length; i++) {
        const override = overrides[i] as Element;
        contentTypes.push({
          partName: override.getAttribute('PartName') || '',
          contentType: override.getAttribute('ContentType') || ''
        });
      }
    }
    
    // workbook.xml 분석
    const sheets: Array<{name: string, sheetId: string, rId: string, actualFile: string}> = [];
    const workbookFile = zipData.files['xl/workbook.xml'];
    if (workbookFile) {
      const workbookContent = await workbookFile.async('string');
      const workbookDoc = parser.parseFromString(workbookContent, 'text/xml');
      const sheetElements = workbookDoc.getElementsByTagName('sheet');
      
      for (let i = 0; i < sheetElements.length; i++) {
        const sheet = sheetElements[i] as Element;
        sheets.push({
          name: sheet.getAttribute('name') || '',
          sheetId: sheet.getAttribute('sheetId') || '',
          rId: sheet.getAttribute('r:id') || '',
          actualFile: '' // 아래에서 채움
        });
      }
    }
    
    // xl/_rels/workbook.xml.rels 분석
    const relationships: Array<{id: string, type: string, target: string}> = [];
    const relsFile = zipData.files['xl/_rels/workbook.xml.rels'];
    if (relsFile) {
      const relsContent = await relsFile.async('string');
      const relsDoc = parser.parseFromString(relsContent, 'text/xml');
      const relElements = relsDoc.getElementsByTagName('Relationship');
      
      for (let i = 0; i < relElements.length; i++) {
        const rel = relElements[i] as Element;
        const relationship = {
          id: rel.getAttribute('Id') || '',
          type: rel.getAttribute('Type') || '',
          target: rel.getAttribute('Target') || ''
        };
        relationships.push(relationship);
        
        // 시트의 실제 파일명 매핑
        const sheet = sheets.find(s => s.rId === relationship.id);
        if (sheet && relationship.target.startsWith('worksheets/')) {
          sheet.actualFile = relationship.target.replace('worksheets/', '');
        }
      }
    }
    
    const files = Object.keys(zipData.files).filter(name => !zipData.files[name].dir);
    
    return {
      contentTypes,
      sheets,
      relationships,
      files,
      isValid: true
    };
    
  } catch (error) {
    console.error(`❌ 완전한 구조 분석 실패:`, error);
    return {
      contentTypes: [],
      sheets: [],
      relationships: [],
      files: [],
      isValid: false
    };
  }
}