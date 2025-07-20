/**
 * Input으로 시작하는 모든 시트를 제거하는 완전한 ZIP 처리기
 */

import JSZip from 'jszip';
import fs from 'fs';
import { DOMParser, XMLSerializer } from 'xmldom';

export interface InputSheetRemovalResult {
  success: boolean;
  removedSheets: string[];
  remainingSheets: string[];
  originalFormat: boolean;
  error?: string;
  processedFilePath?: string;
}

/**
 * Input으로 시작하는 모든 시트를 제거하면서 완전한 서식 보존
 */
export async function removeAllInputSheets(
  sourcePath: string,
  targetPath: string
): Promise<InputSheetRemovalResult> {
  try {
    console.log(`🔧 Input 시트 완전 제거 시작: ${sourcePath} -> ${targetPath}`);
    
    // 원본 파일 읽기
    const data = fs.readFileSync(sourcePath);
    const zip = new JSZip();
    const zipData = await zip.loadAsync(data);
    
    const parser = new DOMParser();
    const serializer = new XMLSerializer();

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
    
    console.log(`📋 발견된 모든 시트: ${sheets.map(s => s.name).join(', ')}`);
    
    // Input으로 시작하는 시트들 찾기
    const inputSheets = sheets.filter(s => s.name.startsWith('Input'));
    const remainingSheetNames = sheets.filter(s => !s.name.startsWith('Input')).map(s => s.name);
    
    console.log(`🎯 제거할 Input 시트들: ${inputSheets.map(s => s.name).join(', ')}`);
    console.log(`📋 보존할 시트들: ${remainingSheetNames.join(', ')}`);
    
    if (inputSheets.length === 0) {
      console.log(`⚠️ Input으로 시작하는 시트를 찾을 수 없습니다.`);
      fs.copyFileSync(sourcePath, targetPath);
      return {
        success: true,
        removedSheets: [],
        remainingSheets: remainingSheetNames,
        originalFormat: true,
        processedFilePath: targetPath
      };
    }

    // 2. xl/_rels/workbook.xml.rels에서 실제 시트 파일 매핑 확인
    const relsPath = 'xl/_rels/workbook.xml.rels';
    const relsFile = zipData.files[relsPath];
    const filesToRemove: string[] = [];
    
    if (relsFile) {
      const relsContent = await relsFile.async('string');
      const relsDoc = parser.parseFromString(relsContent, 'text/xml');
      const relationships = relsDoc.getElementsByTagName('Relationship');
      
      // Input 시트들의 실제 파일 매핑 찾기
      for (const inputSheet of inputSheets) {
        for (let i = 0; i < relationships.length; i++) {
          const rel = relationships[i] as Element;
          if (rel.getAttribute('Id') === inputSheet.rId) {
            const target = rel.getAttribute('Target') || '';
            const actualSheetFile = target.replace('worksheets/', '');
            filesToRemove.push(`xl/worksheets/${actualSheetFile}`);
            filesToRemove.push(`xl/worksheets/_rels/${actualSheetFile.replace('.xml', '.xml.rels')}`);
            console.log(`🔍 매핑 확인: ${inputSheet.name} -> ${actualSheetFile}`);
            break;
          }
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
      
      // Input 시트들에 해당하는 Override 엔트리 제거
      for (const fileToRemove of filesToRemove) {
        if (fileToRemove.endsWith('.xml')) {
          const sheetPartName = `/${fileToRemove}`;
          
          for (let i = overrides.length - 1; i >= 0; i--) {
            const override = overrides[i] as Element;
            if (override.getAttribute('PartName') === sheetPartName) {
              override.parentNode?.removeChild(override);
              console.log(`🗑️ [Content_Types].xml에서 제거: ${sheetPartName}`);
              break;
            }
          }
        }
      }
      
      // 수정된 [Content_Types].xml 저장
      const updatedContentTypesXml = serializer.serializeToString(contentTypesDoc);
      zipData.file(contentTypesPath, updatedContentTypesXml);
    }
    
    // 4. workbook.xml에서 Input 시트들 제거
    for (const inputSheet of inputSheets) {
      inputSheet.element.parentNode?.removeChild(inputSheet.element);
    }
    
    // 5. sheetId 재조정 (연속적으로 만들기)
    const remainingSheetElements = workbookDoc.getElementsByTagName('sheet');
    for (let i = 0; i < remainingSheetElements.length; i++) {
      const sheet = remainingSheetElements[i] as Element;
      const newSheetId = (i + 1).toString();
      sheet.setAttribute('sheetId', newSheetId);
    }
    
    // 수정된 workbook.xml 저장
    const updatedWorkbookXml = serializer.serializeToString(workbookDoc);
    zipData.file('xl/workbook.xml', updatedWorkbookXml);
    
    // 6. xl/_rels/workbook.xml.rels에서 Input 시트들의 관계 제거
    if (relsFile) {
      const relsContent = await relsFile.async('string');
      const relsDoc = parser.parseFromString(relsContent, 'text/xml');
      const relationships = relsDoc.getElementsByTagName('Relationship');
      
      for (const inputSheet of inputSheets) {
        for (let i = relationships.length - 1; i >= 0; i--) {
          const rel = relationships[i] as Element;
          if (rel.getAttribute('Id') === inputSheet.rId) {
            rel.parentNode?.removeChild(rel);
            console.log(`🗑️ 관계 제거: ${inputSheet.rId}`);
            break;
          }
        }
      }
      
      // 수정된 rels 파일 저장
      const updatedRelsXml = serializer.serializeToString(relsDoc);
      zipData.file(relsPath, updatedRelsXml);
    }
    
    // 7. 실제 시트 파일들 제거
    for (const filePath of filesToRemove) {
      if (zipData.files[filePath]) {
        zipData.remove(filePath);
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
    console.log(`✅ Input 시트 완전 제거 완료: ${targetPath}`);
    console.log(`📊 제거된 시트: ${inputSheets.map(s => s.name).join(', ')}`);
    console.log(`📊 보존된 시트: ${remainingSheetNames.join(', ')}`);
    
    return {
      success: true,
      removedSheets: inputSheets.map(s => s.name),
      remainingSheets: remainingSheetNames,
      originalFormat: true,
      processedFilePath: targetPath
    };
    
  } catch (error) {
    console.error(`❌ Input 시트 제거 실패:`, error);
    
    // 실패 시 타겟 파일 삭제
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
    
    return {
      success: false,
      removedSheets: [],
      remainingSheets: [],
      originalFormat: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}