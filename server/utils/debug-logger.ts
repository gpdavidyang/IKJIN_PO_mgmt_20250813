/**
 * 표준화된 디버그 로깅 유틸리티
 */

export class DebugLogger {
  private static isDebugMode = process.env.NODE_ENV === 'development';
  
  static logFunctionEntry(functionName: string, params: any = {}) {
    if (!this.isDebugMode) return;
    
    console.log(`🔧 [ENTRY] ${functionName}`);
    console.log(`   시간: ${new Date().toISOString()}`);
    if (Object.keys(params).length > 0) {
      console.log(`   파라미터:`, JSON.stringify(params, null, 2));
    }
    console.log(`   ===============================`);
  }
  
  static logFunctionExit(functionName: string, result: any = {}) {
    if (!this.isDebugMode) return;
    
    console.log(`✅ [EXIT] ${functionName}`);
    console.log(`   시간: ${new Date().toISOString()}`);
    if (Object.keys(result).length > 0) {
      console.log(`   결과:`, JSON.stringify(result, null, 2));
    }
    console.log(`   ===============================`);
  }
  
  static logError(functionName: string, error: any) {
    console.error(`❌ [ERROR] ${functionName}`);
    console.error(`   시간: ${new Date().toISOString()}`);
    console.error(`   오류:`, error);
    console.error(`   ===============================`);
  }
  
  static logExecutionPath(apiEndpoint: string, actualFunction: string) {
    if (!this.isDebugMode) return;
    
    console.log(`🔍 [EXECUTION PATH]`);
    console.log(`   API: ${apiEndpoint}`);
    console.log(`   실제 호출: ${actualFunction}`);
    console.log(`   시간: ${new Date().toISOString()}`);
    console.log(`   ===============================`);
  }
}