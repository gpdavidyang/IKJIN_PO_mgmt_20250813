import ProfessionalPDFGenerationService from './server/services/professional-pdf-generation-service';
import * as fs from 'fs';
import * as path from 'path';

async function testPDFGenerationDirect() {
  try {
    console.log('🚀 Starting direct PDF generation test...\n');
    
    // 샘플 PDF 생성
    console.log('📄 Generating sample PDF with new professional layout...');
    const pdfBuffer = await ProfessionalPDFGenerationService.generateSamplePDF();
    
    // 파일로 저장
    const outputPath = path.join(process.cwd(), 'test-professional-pdf.pdf');
    fs.writeFileSync(outputPath, pdfBuffer);
    
    console.log(`✅ PDF generated successfully!`);
    console.log(`📁 Saved to: ${outputPath}`);
    console.log(`📊 File size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    console.log('\n🎨 New PDF features:');
    console.log('  - Professional navy/gray color scheme');
    console.log('  - Clean 2-column layout for company info');
    console.log('  - Striped table rows for better readability');
    console.log('  - Professional header with title and order number');
    console.log('  - Company footer with full contact information');
    console.log('  - Single page layout optimized for A4');
    
  } catch (error) {
    console.error('❌ Error during PDF generation:', error);
    process.exit(1);
  }
}

// 실행
testPDFGenerationDirect().then(() => {
  console.log('\n✨ Test completed! Please check the generated PDF file.');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});