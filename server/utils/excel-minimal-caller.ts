/**
 * 최소한의 처리로 Input 시트만 삭제하는 모듈
 * 원본 파일을 복사한 후 Input 시트만 삭제하여 서식 완전 보존
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface MinimalProcessingResult {
  success: boolean;
  removedSheet: boolean;
  remainingSheets: string[];
  originalFormat: boolean;
  error?: string;
  processedFilePath?: string;
  method: string;
}

/**
 * 최소한의 처리로 Input 시트만 제거
 */
export async function removeInputSheetMinimal(
  sourcePath: string,
  targetPath: string,
  inputSheetName: string = 'Input'
): Promise<MinimalProcessingResult> {
  return new Promise((resolve) => {
    try {
      console.log(`📋 최소한의 처리 시작: ${sourcePath} -> ${targetPath}`);
      
      const scriptPath = path.join(__dirname, 'excel-minimal-processing.py');
      const pythonProcess = spawn('python3', [scriptPath, 'minimal', sourcePath, targetPath, inputSheetName], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        console.log(`📋 최소한의 처리 종료 코드: ${code}`);
        
        if (stderr) {
          console.log(`📋 최소한의 처리 로그:\n${stderr}`);
        }
        
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            console.log(`✅ 최소한의 처리 성공:`, result);
            
            resolve({
              success: result.success,
              removedSheet: result.removed_sheet,
              remainingSheets: result.remaining_sheets,
              originalFormat: result.original_format,
              processedFilePath: targetPath,
              method: 'minimal_processing',
              error: result.error
            });
          } catch (parseError) {
            console.error(`❌ 최소한의 처리 출력 파싱 실패:`, parseError);
            console.log(`stdout:`, stdout);
            
            resolve({
              success: false,
              removedSheet: false,
              remainingSheets: [],
              originalFormat: false,
              method: 'minimal_processing',
              error: `출력 파싱 실패: ${parseError}`
            });
          }
        } else {
          console.error(`❌ 최소한의 처리 실패 (코드: ${code})`);
          console.log(`stdout:`, stdout);
          console.log(`stderr:`, stderr);
          
          resolve({
            success: false,
            removedSheet: false,
            remainingSheets: [],
            originalFormat: false,
            method: 'minimal_processing',
            error: `프로세스 실패 (코드: ${code}): ${stderr}`
          });
        }
      });
      
      pythonProcess.on('error', (error) => {
        console.error(`❌ 최소한의 처리 프로세스 에러:`, error);
        
        resolve({
          success: false,
          removedSheet: false,
          remainingSheets: [],
          originalFormat: false,
          method: 'minimal_processing',
          error: `프로세스 에러: ${error.message}`
        });
      });
      
    } catch (error) {
      console.error(`❌ 최소한의 처리 호출 실패:`, error);
      
      resolve({
        success: false,
        removedSheet: false,
        remainingSheets: [],
        originalFormat: false,
        method: 'minimal_processing',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

/**
 * 바이너리 복사 후 Input 시트만 제거
 */
export async function removeInputSheetBinaryCopy(
  sourcePath: string,
  targetPath: string,
  inputSheetName: string = 'Input'
): Promise<MinimalProcessingResult> {
  return new Promise((resolve) => {
    try {
      console.log(`🔧 바이너리 복사 후 처리 시작: ${sourcePath} -> ${targetPath}`);
      
      const scriptPath = path.join(__dirname, 'excel-minimal-processing.py');
      const pythonProcess = spawn('python3', [scriptPath, 'binary', sourcePath, targetPath, inputSheetName], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        console.log(`🔧 바이너리 복사 후 처리 종료 코드: ${code}`);
        
        if (stderr) {
          console.log(`🔧 바이너리 복사 후 처리 로그:\n${stderr}`);
        }
        
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            console.log(`✅ 바이너리 복사 후 처리 성공:`, result);
            
            resolve({
              success: result.success,
              removedSheet: result.removed_sheet,
              remainingSheets: result.remaining_sheets,
              originalFormat: result.original_format,
              processedFilePath: targetPath,
              method: 'binary_copy',
              error: result.error
            });
          } catch (parseError) {
            console.error(`❌ 바이너리 복사 후 처리 출력 파싱 실패:`, parseError);
            console.log(`stdout:`, stdout);
            
            resolve({
              success: false,
              removedSheet: false,
              remainingSheets: [],
              originalFormat: false,
              method: 'binary_copy',
              error: `출력 파싱 실패: ${parseError}`
            });
          }
        } else {
          console.error(`❌ 바이너리 복사 후 처리 실패 (코드: ${code})`);
          console.log(`stdout:`, stdout);
          console.log(`stderr:`, stderr);
          
          resolve({
            success: false,
            removedSheet: false,
            remainingSheets: [],
            originalFormat: false,
            method: 'binary_copy',
            error: `프로세스 실패 (코드: ${code}): ${stderr}`
          });
        }
      });
      
      pythonProcess.on('error', (error) => {
        console.error(`❌ 바이너리 복사 후 처리 프로세스 에러:`, error);
        
        resolve({
          success: false,
          removedSheet: false,
          remainingSheets: [],
          originalFormat: false,
          method: 'binary_copy',
          error: `프로세스 에러: ${error.message}`
        });
      });
      
    } catch (error) {
      console.error(`❌ 바이너리 복사 후 처리 호출 실패:`, error);
      
      resolve({
        success: false,
        removedSheet: false,
        remainingSheets: [],
        originalFormat: false,
        method: 'binary_copy',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}