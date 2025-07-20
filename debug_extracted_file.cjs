// 생성된 extracted 파일의 실제 구조를 분석하는 스크립트

const fs = require('fs');
const JSZip = require('jszip');
const { DOMParser } = require('xmldom');

async function analyzeExtractedFile(filePath) {
  try {
    console.log(`📁 분석 시작: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      console.log('❌ 파일이 존재하지 않습니다.');
      return;
    }
    
    const data = fs.readFileSync(filePath);
    const zip = new JSZip();
    const zipData = await zip.loadAsync(data);
    
    console.log(`📊 ZIP 파일 구조:`);
    console.log(`   총 파일 수: ${Object.keys(zipData.files).length}`);
    
    // 1. [Content_Types].xml 분석
    const contentTypesFile = zipData.files['[Content_Types].xml'];
    if (contentTypesFile) {
      const content = await contentTypesFile.async('string');
      console.log(`\n📋 [Content_Types].xml:`);
      console.log(content.substring(0, 500) + '...');
    }
    
    // 2. workbook.xml 분석
    const workbookFile = zipData.files['xl/workbook.xml'];
    if (workbookFile) {
      const content = await workbookFile.async('string');
      console.log(`\n📋 workbook.xml:`);
      console.log(content.substring(0, 500) + '...');
      
      // 시트 목록 추출
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/xml');
      const sheets = doc.getElementsByTagName('sheet');
      
      console.log(`\n📋 시트 목록:`);
      for (let i = 0; i < sheets.length; i++) {
        const sheet = sheets[i];
        console.log(`   ${i+1}. ${sheet.getAttribute('name')} (ID: ${sheet.getAttribute('sheetId')}, rId: ${sheet.getAttribute('r:id')})`);
      }
    }
    
    // 3. workbook.xml.rels 분석
    const relsFile = zipData.files['xl/_rels/workbook.xml.rels'];
    if (relsFile) {
      const content = await relsFile.async('string');
      console.log(`\n📋 workbook.xml.rels:`);
      console.log(content);
    }
    
    // 4. 워크시트 파일들 확인
    const worksheetFiles = Object.keys(zipData.files)
      .filter(name => name.startsWith('xl/worksheets/') && name.endsWith('.xml'))
      .sort();
    
    console.log(`\n📋 워크시트 파일들:`);
    worksheetFiles.forEach(file => {
      console.log(`   ${file}`);
    });
    
    // 5. 스타일 관련 파일들 확인
    const styleFiles = Object.keys(zipData.files)
      .filter(name => name.includes('style') || name.includes('theme'))
      .sort();
    
    console.log(`\n🎨 스타일 파일들:`);
    styleFiles.forEach(file => {
      console.log(`   ${file}`);
    });
    
  } catch (error) {
    console.error(`❌ 분석 실패:`, error);
  }
}

// 가장 최근 extracted 파일 분석
const extractedFiles = fs.readdirSync('/Users/davidyang/workspace/20250713_PO_Mgmt/uploads/')
  .filter(file => file.startsWith('extracted-') && file.endsWith('.xlsx'))
  .sort()
  .reverse();

if (extractedFiles.length > 0) {
  const latestFile = `/Users/davidyang/workspace/20250713_PO_Mgmt/uploads/${extractedFiles[0]}`;
  analyzeExtractedFile(latestFile);
} else {
  console.log('❌ extracted 파일을 찾을 수 없습니다.');
}