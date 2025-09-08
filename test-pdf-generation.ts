/**
 * Test script to generate a sample PDF with the new beautiful layout
 */

import fetch from 'node-fetch';

async function generateSamplePDF() {
  try {
    console.log('🎨 샘플 PDF 생성 시작...');
    
    // First, login to get authentication
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@company.com',
        password: 'admin'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ 로그인 성공');

    // Generate professional PDF for order ID 320 (or any existing order)
    const pdfResponse = await fetch('http://localhost:3001/api/orders/320/regenerate-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!pdfResponse.ok) {
      const error = await pdfResponse.text();
      throw new Error(`PDF generation failed: ${pdfResponse.status} - ${error}`);
    }

    const pdfData = await pdfResponse.json();
    console.log('✅ PDF 생성 성공:', pdfData);
    
    // Download the PDF
    if (pdfData.attachmentId) {
      console.log(`📥 PDF 다운로드 가능: http://localhost:3001/api/attachments/${pdfData.attachmentId}?download=true`);
      console.log(`📄 파일명: ${pdfData.fileName}`);
      
      // Actually download the file
      const downloadResponse = await fetch(`http://localhost:3001/api/attachments/${pdfData.attachmentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (downloadResponse.ok) {
        const fs = await import('fs');
        const buffer = await downloadResponse.buffer();
        const outputPath = `/Users/david/Downloads/SAMPLE_BEAUTIFUL_PDF_${Date.now()}.pdf`;
        fs.writeFileSync(outputPath, buffer);
        console.log(`✅ PDF 저장 완료: ${outputPath}`);
      }
    }
    
  } catch (error) {
    console.error('❌ 에러 발생:', error);
  }
}

// Run the test
generateSamplePDF();