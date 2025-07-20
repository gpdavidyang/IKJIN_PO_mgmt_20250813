/**
 * Node.js에서 Python openpyxl 스크립트를 호출하는 모듈
 * 완벽한 엑셀 서식 보존을 위해 Python의 openpyxl 라이브러리 사용
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface PythonProcessResult {
  success: boolean;
  removedSheet: boolean;
  remainingSheets: string[];
  originalFormat: boolean;
  error?: string;
  processedFilePath?: string;
}

/**
 * Python openpyxl 스크립트를 호출하여 Input 시트 제거
 */
export async function removeInputSheetWithPython(
  sourcePath: string,
  targetPath: string,
  inputSheetName: string = 'Input'
): Promise<PythonProcessResult> {
  return new Promise((resolve) => {
    try {
      console.log(`🐍 Python openpyxl 스크립트 호출: ${sourcePath} -> ${targetPath}`);
      
      // Python 스크립트 경로
      const scriptPath = path.join(__dirname, 'excel-python-perfect.py');
      
      // Python 스크립트 실행
      const pythonProcess = spawn('python3', [scriptPath, sourcePath, targetPath, inputSheetName], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      // 표준 출력 수집
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      // 표준 에러 수집 (로그 메시지)
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      // 프로세스 종료 처리
      pythonProcess.on('close', (code) => {
        console.log(`🐍 Python 프로세스 종료 코드: ${code}`);
        
        if (stderr) {
          console.log(`🐍 Python 로그:\n${stderr}`);
        }
        
        if (code === 0) {
          try {
            // JSON 출력 파싱
            const result = JSON.parse(stdout);
            console.log(`✅ Python 처리 성공:`, result);
            
            resolve({
              success: result.success,
              removedSheet: result.removed_sheet,
              remainingSheets: result.remaining_sheets,
              originalFormat: result.original_format,
              processedFilePath: targetPath,
              error: result.error
            });
          } catch (parseError) {
            console.error(`❌ Python 출력 파싱 실패:`, parseError);
            console.log(`Python stdout:`, stdout);
            
            resolve({
              success: false,
              removedSheet: false,
              remainingSheets: [],
              originalFormat: false,
              error: `Python 출력 파싱 실패: ${parseError}`
            });
          }
        } else {
          console.error(`❌ Python 프로세스 실패 (코드: ${code})`);
          console.log(`Python stdout:`, stdout);
          console.log(`Python stderr:`, stderr);
          
          resolve({
            success: false,
            removedSheet: false,
            remainingSheets: [],
            originalFormat: false,
            error: `Python 프로세스 실패 (코드: ${code}): ${stderr}`
          });
        }
      });
      
      // 프로세스 에러 처리
      pythonProcess.on('error', (error) => {
        console.error(`❌ Python 프로세스 에러:`, error);
        
        resolve({
          success: false,
          removedSheet: false,
          remainingSheets: [],
          originalFormat: false,
          error: `Python 프로세스 에러: ${error.message}`
        });
      });
      
    } catch (error) {
      console.error(`❌ Python 호출 실패:`, error);
      
      resolve({
        success: false,
        removedSheet: false,
        remainingSheets: [],
        originalFormat: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

/**
 * Python과 openpyxl이 설치되어 있는지 확인
 */
export async function checkPythonEnvironment(): Promise<{
  pythonAvailable: boolean;
  openpyxlAvailable: boolean;
  pythonVersion?: string;
  error?: string;
}> {
  return new Promise((resolve) => {
    // Python 버전 확인
    const pythonProcess = spawn('python3', ['--version'], { stdio: 'pipe' });
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        const pythonVersion = stdout.trim() || stderr.trim();
        console.log(`🐍 Python 버전: ${pythonVersion}`);
        
        // openpyxl 확인
        const openpyxlProcess = spawn('python3', ['-c', 'import openpyxl; print(openpyxl.__version__)'], { stdio: 'pipe' });
        
        let openpyxlStdout = '';
        let openpyxlStderr = '';
        
        openpyxlProcess.stdout.on('data', (data) => {
          openpyxlStdout += data.toString();
        });
        
        openpyxlProcess.stderr.on('data', (data) => {
          openpyxlStderr += data.toString();
        });
        
        openpyxlProcess.on('close', (openpyxlCode) => {
          if (openpyxlCode === 0) {
            const openpyxlVersion = openpyxlStdout.trim();
            console.log(`📦 openpyxl 버전: ${openpyxlVersion}`);
            
            resolve({
              pythonAvailable: true,
              openpyxlAvailable: true,
              pythonVersion: `${pythonVersion}, openpyxl ${openpyxlVersion}`
            });
          } else {
            console.log(`⚠️ openpyxl이 설치되어 있지 않습니다: ${openpyxlStderr}`);
            
            resolve({
              pythonAvailable: true,
              openpyxlAvailable: false,
              pythonVersion,
              error: `openpyxl이 설치되어 있지 않습니다. 설치 명령: pip3 install openpyxl`
            });
          }
        });
      } else {
        console.log(`⚠️ Python3이 설치되어 있지 않습니다: ${stderr}`);
        
        resolve({
          pythonAvailable: false,
          openpyxlAvailable: false,
          error: 'Python3이 설치되어 있지 않습니다'
        });
      }
    });
  });
}