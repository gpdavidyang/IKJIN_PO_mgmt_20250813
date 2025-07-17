/**
 * Python openpyxl 스크립트를 호출하여 완벽한 서식 보존 처리
 * ExcelJS보다 더 강력한 서식 보존 능력 제공
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export interface PythonExcelResult {
  success: boolean;
  removedSheet: boolean;
  remainingSheets: string[];
  originalFormat: boolean;
  processedFilePath?: string;
  formatVerification?: any;
  comparison?: any;
  error?: string;
}

export class PythonExcelProcessor {
  
  private static readonly PYTHON_SCRIPT_PATH = path.join(__dirname, '../../scripts/excel_format_preserving.py');

  /**
   * Python 환경 확인 및 openpyxl 설치 상태 검증
   */
  static async checkPythonEnvironment(): Promise<{ available: boolean; error?: string; details?: any }> {
    try {
      // Python 버전 확인
      const { stdout: pythonVersion } = await execAsync('python3 --version');
      console.log(`🐍 Python 버전: ${pythonVersion.trim()}`);

      // openpyxl 모듈 확인
      const { stdout: openpyxlCheck } = await execAsync('python3 -c "import openpyxl; print(openpyxl.__version__)"');
      console.log(`📦 openpyxl 버전: ${openpyxlCheck.trim()}`);

      return {
        available: true,
        details: {
          pythonVersion: pythonVersion.trim(),
          openpyxlVersion: openpyxlCheck.trim()
        }
      };

    } catch (error) {
      console.log(`⚠️ Python 환경 확인 실패: ${error}`);
      
      // openpyxl 자동 설치 시도
      try {
        console.log(`📦 openpyxl 설치 시도 중...`);
        await execAsync('python3 -m pip install openpyxl');
        console.log(`✅ openpyxl 설치 완료`);
        
        return await PythonExcelProcessor.checkPythonEnvironment();
      } catch (installError) {
        return {
          available: false,
          error: `Python 또는 openpyxl을 사용할 수 없습니다: ${installError}`
        };
      }
    }
  }

  /**
   * Python 스크립트를 사용하여 Input 시트 제거 및 서식 보존
   */
  static async removeInputSheetWithPython(
    sourcePath: string,
    targetPath: string,
    inputSheetName: string = 'Input',
    options: {
      verify?: boolean;
      compare?: boolean;
    } = {}
  ): Promise<PythonExcelResult> {
    try {
      console.log(`🐍 Python openpyxl 처리 시작: ${sourcePath} -> ${targetPath}`);

      // Python 환경 확인
      const envCheck = await PythonExcelProcessor.checkPythonEnvironment();
      if (!envCheck.available) {
        throw new Error(envCheck.error || 'Python 환경을 사용할 수 없습니다');
      }

      // 소스 파일 존재 확인
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`소스 파일을 찾을 수 없습니다: ${sourcePath}`);
      }

      // Python 스크립트 존재 확인
      if (!fs.existsSync(PythonExcelProcessor.PYTHON_SCRIPT_PATH)) {
        throw new Error(`Python 스크립트를 찾을 수 없습니다: ${PythonExcelProcessor.PYTHON_SCRIPT_PATH}`);
      }

      // Python 스크립트 실행
      const args = [
        PythonExcelProcessor.PYTHON_SCRIPT_PATH,
        sourcePath,
        targetPath,
        '--input-sheet', inputSheetName,
        '--json'
      ];

      if (options.verify) args.push('--verify');
      if (options.compare) args.push('--compare');

      const result = await PythonExcelProcessor.executePythonScript(args);

      if (!result.success) {
        throw new Error(result.error || 'Python 스크립트 실행 실패');
      }

      console.log(`✅ Python 처리 완료: ${result.remaining_sheets?.length || 0}개 시트 보존`);

      return {
        success: true,
        removedSheet: result.removed_sheet || false,
        remainingSheets: result.remaining_sheets || [],
        originalFormat: result.original_format || false,
        processedFilePath: targetPath,
        formatVerification: result.verification,
        comparison: result.comparison
      };

    } catch (error) {
      console.error(`❌ Python Excel 처리 실패:`, error);
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
   * Python 스크립트 실행 헬퍼
   */
  private static async executePythonScript(args: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', args);
      
      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        console.log(`🐍 Python 스크립트 종료 코드: ${code}`);
        
        if (code === 0) {
          try {
            // JSON 출력 파싱
            const lines = stdout.trim().split('\n');
            const jsonLine = lines.find(line => line.startsWith('{'));
            
            if (jsonLine) {
              const result = JSON.parse(jsonLine);
              resolve(result);
            } else {
              resolve({ success: true, output: stdout });
            }
          } catch (parseError) {
            console.log(`📄 Python 출력 (비JSON):`, stdout);
            resolve({ success: true, output: stdout });
          }
        } else {
          reject(new Error(`Python 스크립트 실행 실패 (코드 ${code}): ${stderr || stdout}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Python 프로세스 오류: ${error.message}`));
      });
    });
  }

  /**
   * 서식 비교 전용 함수
   */
  static async compareExcelFormats(
    originalPath: string,
    processedPath: string
  ): Promise<{
    formatPreserved: boolean;
    differences: string[];
    originalFormat: any;
    processedFormat: any;
  }> {
    try {
      const args = [
        PythonExcelProcessor.PYTHON_SCRIPT_PATH,
        originalPath,
        processedPath,
        '--compare',
        '--json'
      ];

      const result = await PythonExcelProcessor.executePythonScript(args);
      
      return result.comparison || {
        formatPreserved: false,
        differences: ['비교 실패'],
        originalFormat: {},
        processedFormat: {}
      };

    } catch (error) {
      console.error(`❌ 서식 비교 실패:`, error);
      return {
        formatPreserved: false,
        differences: ['비교 처리 오류'],
        originalFormat: {},
        processedFormat: {}
      };
    }
  }
}

/**
 * 기존 인터페이스와 호환되는 래퍼 함수
 */
export async function removeInputSheetWithPythonFallback(
  sourcePath: string,
  targetPath: string,
  inputSheetName: string = 'Input'
): Promise<{ success: boolean; removedSheet: boolean; remainingSheets: string[]; error?: string }> {
  const result = await PythonExcelProcessor.removeInputSheetWithPython(
    sourcePath,
    targetPath,
    inputSheetName,
    { verify: true, compare: false }
  );

  return {
    success: result.success,
    removedSheet: result.removedSheet,
    remainingSheets: result.remainingSheets,
    error: result.error
  };
}