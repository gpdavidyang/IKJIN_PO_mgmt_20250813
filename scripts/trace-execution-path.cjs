/**
 * 실행 경로 추적 스크립트
 * API 호출 시 실제로 어떤 함수가 호출되는지 확인
 */

const fs = require('fs');
const path = require('path');

function findFunctionUsage(functionName, directory) {
  const results = [];
  
  function searchInDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        searchInDirectory(filePath);
      } else if (file.endsWith('.ts') || file.endsWith('.js')) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          if (content.includes(functionName)) {
            const lines = content.split('\n');
            lines.forEach((line, index) => {
              if (line.includes(functionName)) {
                results.push({
                  file: filePath,
                  line: index + 1,
                  content: line.trim()
                });
              }
            });
          }
        } catch (error) {
          // 파일 읽기 실패 무시
        }
      }
    }
  }
  
  searchInDirectory(directory);
  return results;
}

console.log('🔍 Excel 처리 함수 사용 현황 분석...\n');

const functionsToTrace = [
  'extractSheetsToFile',
  'removeInputSheetSafely',
  'removeInputSheetZipComplete',
  'removeAllInputSheets'
];

const projectRoot = '/Users/davidyang/workspace/20250713_PO_Mgmt';

functionsToTrace.forEach(funcName => {
  console.log(`📋 ${funcName} 사용 현황:`);
  const usage = findFunctionUsage(funcName, projectRoot);
  
  if (usage.length === 0) {
    console.log('   ❌ 사용되지 않음');
  } else {
    usage.forEach(result => {
      const relativePath = result.file.replace(projectRoot, '');
      console.log(`   ✅ ${relativePath}:${result.line} - ${result.content}`);
    });
  }
  console.log('');
});

console.log('🎯 권장사항:');
console.log('1. 사용되지 않는 함수들은 제거하거나 명확히 표시');
console.log('2. 실제 사용되는 함수만 수정');
console.log('3. CLAUDE.md에 실행 경로 문서화');