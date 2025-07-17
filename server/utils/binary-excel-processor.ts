/**
 * 바이너리 레벨에서 xlsx 파일을 조작하여 완벽한 서식 보존
 * xlsx는 본질적으로 ZIP 파일이므로 직접 조작 가능
 */

import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { DOMParser, XMLSerializer } from 'xmldom';

export interface BinaryExcelResult {
  success: boolean;
  removedSheet: boolean;
  remainingSheets: string[];
  originalFormat: boolean;
  processedFilePath?: string;
  error?: string;
}

export class BinaryExcelProcessor {

  /**
   * ZIP 기반 xlsx 파일에서 Input 시트만 제거하고 모든 서식 보존
   */
  static async removeInputSheetBinaryLevel(
    sourcePath: string,
    targetPath: string,
    inputSheetName: string = 'Input'
  ): Promise<BinaryExcelResult> {
    try {
      console.log(`📁 바이너리 레벨 처리 시작: ${sourcePath} -> ${targetPath}`);

      // 소스 파일 읽기
      const fileBuffer = fs.readFileSync(sourcePath);
      
      // ZIP으로 로드
      const zip = await JSZip.loadAsync(fileBuffer);
      
      // workbook.xml 파일 읽기 (시트 목록 정보)
      const workbookXml = await zip.file('xl/workbook.xml')?.async('text');
      if (!workbookXml) {
        throw new Error('workbook.xml을 찾을 수 없습니다. 올바른 Excel 파일인지 확인하세요.');
      }

      // XML 파싱
      const parser = new DOMParser();
      const serializer = new XMLSerializer();
      const workbookDoc = parser.parseFromString(workbookXml, 'text/xml');

      // 시트 목록 분석
      const sheets = workbookDoc.getElementsByTagName('sheet');
      const originalSheets: string[] = [];
      let inputSheetId = '';
      let inputSheetRId = '';

      for (let i = 0; i < sheets.length; i++) {
        const sheet = sheets[i];
        const sheetName = sheet.getAttribute('name') || '';
        const sheetId = sheet.getAttribute('sheetId') || '';
        const rId = sheet.getAttribute('r:id') || '';
        
        originalSheets.push(sheetName);
        
        if (sheetName === inputSheetName) {
          inputSheetId = sheetId;
          inputSheetRId = rId;
        }
      }

      console.log(`📋 원본 시트 목록: ${originalSheets.join(', ')}`);

      let removedSheet = false;
      
      if (inputSheetId) {
        // 1. workbook.xml에서 Input 시트 제거
        const sheetElements = workbookDoc.getElementsByTagName('sheet');
        for (let i = 0; i < sheetElements.length; i++) {
          const sheet = sheetElements[i];
          if (sheet.getAttribute('name') === inputSheetName) {
            sheet.parentNode?.removeChild(sheet);
            removedSheet = true;
            break;
          }
        }

        // 2. workbook.xml.rels에서 관련 관계 제거
        const relsPath = 'xl/_rels/workbook.xml.rels';
        const relsXml = await zip.file(relsPath)?.async('text');
        
        if (relsXml) {
          const relsDoc = parser.parseFromString(relsXml, 'text/xml');
          const relationships = relsDoc.getElementsByTagName('Relationship');
          
          for (let i = 0; i < relationships.length; i++) {
            const rel = relationships[i];
            if (rel.getAttribute('Id') === inputSheetRId) {
              rel.parentNode?.removeChild(rel);
              break;
            }
          }
          
          // 수정된 rels 파일 저장
          const updatedRelsXml = serializer.serializeToString(relsDoc);
          zip.file(relsPath, updatedRelsXml);
        }

        // 3. 실제 시트 파일 제거 (worksheets/sheet*.xml)
        const sheetFileName = `xl/worksheets/sheet${inputSheetId}.xml`;
        if (zip.file(sheetFileName)) {
          zip.remove(sheetFileName);
          console.log(`🗑️ 시트 파일 제거: ${sheetFileName}`);
        }

        console.log(`🗑️ "${inputSheetName}" 시트가 제거되었습니다.`);
      } else {
        console.log(`⚠️ "${inputSheetName}" 시트를 찾을 수 없습니다.`);
      }

      // 수정된 workbook.xml 저장
      const updatedWorkbookXml = serializer.serializeToString(workbookDoc);
      zip.file('xl/workbook.xml', updatedWorkbookXml);

      // 남은 시트 목록 계산
      const remainingSheets = originalSheets.filter(name => name !== inputSheetName);
      console.log(`📋 남은 시트 목록: ${remainingSheets.join(', ')}`);

      if (remainingSheets.length === 0) {
        throw new Error('모든 시트가 제거되어 빈 엑셀 파일이 됩니다.');
      }

      // 타겟 디렉토리 생성
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // 새 파일로 저장
      const updatedBuffer = await zip.generateAsync({ type: 'nodebuffer' });
      fs.writeFileSync(targetPath, updatedBuffer);

      console.log(`✅ 바이너리 레벨 처리 완료: ${targetPath}`);

      return {
        success: true,
        removedSheet,
        remainingSheets,
        originalFormat: true, // 바이너리 레벨에서는 모든 서식이 그대로 보존됨
        processedFilePath: targetPath
      };

    } catch (error) {
      console.error(`❌ 바이너리 레벨 처리 실패:`, error);
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
   * xlsx 파일 구조 분석
   */
  static async analyzeExcelStructure(filePath: string): Promise<{
    isValidExcel: boolean;
    sheets: Array<{ name: string; id: string; rId: string; fileName: string }>;
    files: string[];
    error?: string;
  }> {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const zip = await JSZip.loadAsync(fileBuffer);
      
      // 모든 파일 목록
      const files = Object.keys(zip.files);
      
      // workbook.xml 분석
      const workbookXml = await zip.file('xl/workbook.xml')?.async('text');
      if (!workbookXml) {
        return {
          isValidExcel: false,
          sheets: [],
          files,
          error: 'workbook.xml을 찾을 수 없습니다'
        };
      }

      const parser = new DOMParser();
      const workbookDoc = parser.parseFromString(workbookXml, 'text/xml');
      const sheetElements = workbookDoc.getElementsByTagName('sheet');
      
      const sheets = [];
      for (let i = 0; i < sheetElements.length; i++) {
        const sheet = sheetElements[i];
        const sheetInfo = {
          name: sheet.getAttribute('name') || '',
          id: sheet.getAttribute('sheetId') || '',
          rId: sheet.getAttribute('r:id') || '',
          fileName: `xl/worksheets/sheet${sheet.getAttribute('sheetId')}.xml`
        };
        sheets.push(sheetInfo);
      }

      return {
        isValidExcel: true,
        sheets,
        files
      };

    } catch (error) {
      return {
        isValidExcel: false,
        sheets: [],
        files: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * 기존 인터페이스와 호환되는 래퍼 함수
 */
export async function removeInputSheetBinaryMethod(
  sourcePath: string,
  targetPath: string,
  inputSheetName: string = 'Input'
): Promise<{ success: boolean; removedSheet: boolean; remainingSheets: string[]; error?: string }> {
  const result = await BinaryExcelProcessor.removeInputSheetBinaryLevel(
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