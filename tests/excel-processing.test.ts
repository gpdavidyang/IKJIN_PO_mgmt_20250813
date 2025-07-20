/**
 * Excel 처리 파이프라인 단위 테스트
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { removeAllInputSheets } from '../server/utils/excel-input-sheet-remover';
import { POTemplateProcessorMock } from '../server/utils/po-template-processor-mock';

describe('Excel Processing Pipeline', () => {
  const testFilesDir = path.join(__dirname, 'fixtures');
  const outputDir = path.join(__dirname, 'output');
  
  beforeEach(() => {
    // 테스트 출력 디렉토리 생성
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });
  
  afterEach(() => {
    // 테스트 파일 정리
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  describe('removeAllInputSheets', () => {
    it('should remove Input sheets while preserving formatting', async () => {
      // 실제 Excel 파일이 필요한 경우에만 실행
      const testFile = path.join(testFilesDir, 'sample.xlsx');
      const outputFile = path.join(outputDir, 'output.xlsx');
      
      if (!fs.existsSync(testFile)) {
        console.log('⚠️ 테스트 파일이 없어 스킵됩니다:', testFile);
        return;
      }
      
      const result = await removeAllInputSheets(testFile, outputFile);
      
      expect(result.success).toBe(true);
      expect(result.removedSheets).toContain('Input');
      expect(result.remainingSheets).toEqual(['갑지', '을지']);
      expect(fs.existsSync(outputFile)).toBe(true);
    });
    
    it('should handle files without Input sheets', async () => {
      const testFile = path.join(testFilesDir, 'no-input.xlsx');
      const outputFile = path.join(outputDir, 'output.xlsx');
      
      if (!fs.existsSync(testFile)) {
        console.log('⚠️ 테스트 파일이 없어 스킵됩니다:', testFile);
        return;
      }
      
      const result = await removeAllInputSheets(testFile, outputFile);
      
      expect(result.success).toBe(true);
      expect(result.removedSheets).toHaveLength(0);
    });
  });
  
  describe('POTemplateProcessorMock.extractSheetsToFile', () => {
    it('should call the correct processing function', async () => {
      const testFile = path.join(testFilesDir, 'sample.xlsx');
      const outputFile = path.join(outputDir, 'extracted.xlsx');
      
      if (!fs.existsSync(testFile)) {
        console.log('⚠️ 테스트 파일이 없어 스킵됩니다:', testFile);
        return;
      }
      
      const result = await POTemplateProcessorMock.extractSheetsToFile(
        testFile,
        outputFile,
        ['갑지', '을지']
      );
      
      expect(result.success).toBe(true);
      expect(result.extractedSheets).toEqual(['갑지', '을지']);
    });
  });
  
  describe('Execution Path Verification', () => {
    it('should use the correct active functions', () => {
      // 실행 경로 검증
      const activeFunction = 'removeAllInputSheets';
      const deprecatedFunctions = [
        'removeInputSheetSafely',
        'removeInputSheetZipComplete',
        'removeInputSheetZipPerfect'
      ];
      
      // po-template-processor-mock.ts에서 올바른 함수 사용 확인
      const mockProcessorPath = path.join(__dirname, '../server/utils/po-template-processor-mock.ts');
      if (fs.existsSync(mockProcessorPath)) {
        const content = fs.readFileSync(mockProcessorPath, 'utf8');
        
        expect(content).toContain(activeFunction);
        
        deprecatedFunctions.forEach(func => {
          expect(content).not.toContain(func);
        });
      }
    });
  });
});

// 테스트 픽스처 생성 헬퍼
export function createTestFixtures() {
  const fixturesDir = path.join(__dirname, 'fixtures');
  
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
    
    console.log('📁 테스트 픽스처 디렉토리 생성됨:', fixturesDir);
    console.log('💡 실제 Excel 파일을 이 디렉토리에 추가하면 완전한 테스트가 가능합니다:');
    console.log('   - sample.xlsx (Input, 갑지, 을지 시트 포함)');
    console.log('   - no-input.xlsx (갑지, 을지 시트만 포함)');
  }
}