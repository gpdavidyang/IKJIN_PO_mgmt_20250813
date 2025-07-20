/**
 * Node.js에서 xlwings Python 스크립트를 호출하는 모듈
 * 실제 엑셀 애플리케이션을 제어하여 100% 서식 보존
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface XlwingsResult {
  success: boolean;
  removedSheet: boolean;
  remainingSheets: string[];
  originalFormat: boolean;
  error?: string;
  processedFilePath?: string;
  method: string;
}

/**
 * xlwings 환경 테스트
 */
export async function testXlwingsEnvironment(): Promise<{
  available: boolean;
  error?: string;
  details?: any;
}> {
  return new Promise((resolve) => {
    try {
      console.log(`🧪 xlwings 환경 테스트 시작`);
      
      const scriptPath = path.join(__dirname, 'excel-xlwings-perfect.py');
      const pythonProcess = spawn('python3', [scriptPath, 'test'], {
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
        console.log(`🧪 xlwings 테스트 종료 코드: ${code}`);
        
        if (stderr) {
          console.log(`🧪 xlwings 테스트 로그:\n${stderr}`);
        }
        
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            console.log(`✅ xlwings 환경 테스트 성공:`, result);
            
            resolve({
              available: true,
              details: result
            });
          } catch (parseError) {
            console.error(`❌ xlwings 테스트 출력 파싱 실패:`, parseError);
            resolve({
              available: false,
              error: `출력 파싱 실패: ${parseError}`
            });
          }
        } else {
          console.error(`❌ xlwings 환경 테스트 실패 (코드: ${code})`);
          resolve({
            available: false,
            error: `테스트 실패 (코드: ${code}): ${stderr}`
          });
        }
      });
      
      pythonProcess.on('error', (error) => {
        console.error(`❌ xlwings 테스트 프로세스 에러:`, error);
        resolve({
          available: false,
          error: `프로세스 에러: ${error.message}`
        });
      });
      
    } catch (error) {
      console.error(`❌ xlwings 테스트 호출 실패:`, error);
      resolve({
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

/**
 * xlwings를 사용하여 Input 시트 제거 (100% 서식 보존)
 */
export async function removeInputSheetWithXlwings(
  sourcePath: string,
  targetPath: string,
  inputSheetName: string = 'Input'
): Promise<XlwingsResult> {
  return new Promise((resolve) => {
    try {
      console.log(`🚀 xlwings 엑셀 앱 제어 시작: ${sourcePath} -> ${targetPath}`);
      
      const scriptPath = path.join(__dirname, 'excel-xlwings-perfect.py');
      const pythonProcess = spawn('python3', [scriptPath, 'process', sourcePath, targetPath, inputSheetName], {
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
        console.log(`🚀 xlwings 프로세스 종료 코드: ${code}`);
        
        if (stderr) {
          console.log(`🚀 xlwings 로그:\n${stderr}`);
        }
        
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            console.log(`✅ xlwings 처리 성공:`, result);
            
            resolve({
              success: result.success,
              removedSheet: result.removed_sheet,
              remainingSheets: result.remaining_sheets,
              originalFormat: result.original_format,
              processedFilePath: targetPath,
              method: 'xlwings',
              error: result.error
            });
          } catch (parseError) {
            console.error(`❌ xlwings 출력 파싱 실패:`, parseError);
            console.log(`xlwings stdout:`, stdout);
            
            resolve({
              success: false,
              removedSheet: false,
              remainingSheets: [],
              originalFormat: false,
              method: 'xlwings',
              error: `출력 파싱 실패: ${parseError}`
            });
          }
        } else {
          console.error(`❌ xlwings 프로세스 실패 (코드: ${code})`);
          console.log(`xlwings stdout:`, stdout);
          console.log(`xlwings stderr:`, stderr);
          
          resolve({
            success: false,
            removedSheet: false,
            remainingSheets: [],
            originalFormat: false,
            method: 'xlwings',
            error: `xlwings 프로세스 실패 (코드: ${code}): ${stderr}`
          });
        }
      });
      
      pythonProcess.on('error', (error) => {
        console.error(`❌ xlwings 프로세스 에러:`, error);
        
        resolve({
          success: false,
          removedSheet: false,
          remainingSheets: [],
          originalFormat: false,
          method: 'xlwings',
          error: `프로세스 에러: ${error.message}`
        });
      });
      
    } catch (error) {
      console.error(`❌ xlwings 호출 실패:`, error);
      
      resolve({
        success: false,
        removedSheet: false,
        remainingSheets: [],
        originalFormat: false,
        method: 'xlwings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

/**
 * 엑셀 애플리케이션 가용성 확인
 */
export async function checkExcelApplication(): Promise<{
  available: boolean;
  platform: string;
  error?: string;
}> {
  const platform = process.platform;
  
  console.log(`📋 플랫폼: ${platform}`);
  
  // Mac에서는 엑셀 앱 확인
  if (platform === 'darwin') {
    return new Promise((resolve) => {
      const process = spawn('osascript', ['-e', 'tell application "System Events" to get name of every application process'], {
        stdio: 'pipe'
      });
      
      let stdout = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          const hasExcel = stdout.toLowerCase().includes('excel') || 
                         stdout.toLowerCase().includes('microsoft excel');
          
          console.log(`📊 Mac 엑셀 앱 확인: ${hasExcel ? '있음' : '없음'}`);
          
          resolve({
            available: hasExcel,
            platform: 'macOS',
            error: hasExcel ? undefined : 'Microsoft Excel이 설치되어 있지 않습니다'
          });
        } else {
          resolve({
            available: false,
            platform: 'macOS',
            error: '애플리케이션 확인 실패'
          });
        }
      });
    });
  }
  
  // Windows에서는 레지스트리 확인 (간단한 방법)
  if (platform === 'win32') {
    return {
      available: true, // Windows에서는 일반적으로 Excel이 설치되어 있다고 가정
      platform: 'Windows'
    };
  }
  
  // Linux에서는 지원되지 않음
  return {
    available: false,
    platform: platform,
    error: 'Linux에서는 Microsoft Excel이 지원되지 않습니다'
  };
}