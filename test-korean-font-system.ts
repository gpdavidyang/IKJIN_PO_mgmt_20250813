/**
 * 한글 폰트 시스템 테스트
 * Vercel 환경에서 한글 폰트 지원 상태 확인
 */

import { fontManager } from './server/utils/korean-font-manager';
import { ProfessionalPDFGenerationService } from './server/services/professional-pdf-generation-service';
import * as fs from 'fs';

async function testKoreanFontSystem() {
  console.log('🚀 한글 폰트 시스템 테스트 시작...\n');

  // 1. 폰트 관리자 상태 확인
  console.log('=== 1. 폰트 관리자 상태 ===');
  const fontReport = fontManager.getFontReport();
  console.log('📊 폰트 지원 상태:', JSON.stringify(fontReport, null, 2));
  
  // 2. 최적 폰트 선택 테스트
  console.log('\n=== 2. 최적 폰트 선택 테스트 ===');
  const bestFont = fontManager.getBestKoreanFont();
  if (bestFont) {
    console.log(`✅ 선택된 폰트: ${bestFont.name}`);
    console.log(`📍 폰트 경로: ${bestFont.path}`);
    console.log(`📏 폰트 크기: ${Math.round((bestFont.size || 0) / 1024)}KB`);
  } else {
    console.log('❌ 사용 가능한 한글 폰트 없음');
  }

  // 3. Base64 인코딩 테스트
  console.log('\n=== 3. Base64 인코딩 테스트 ===');
  try {
    const base64Font = await fontManager.getFontAsBase64();
    if (base64Font) {
      console.log(`✅ Base64 인코딩 성공: ${Math.round(base64Font.length / 1024)}KB`);
      console.log(`🔗 Base64 미리보기: ${base64Font.substring(0, 100)}...`);
    } else {
      console.log('❌ Base64 인코딩 실패');
    }
  } catch (error) {
    console.error('💥 Base64 인코딩 오류:', error);
  }

  // 4. 한글 텍스트 안전 변환 테스트
  console.log('\n=== 4. 한글 텍스트 안전 변환 테스트 ===');
  const testTexts = [
    '구매발주서',
    '발주번호: PO-2024-001',
    '거래처: 테스트 업체',
    '품목명: 건설자재',
    '수량: 100개',
    '단가: 50,000원',
    '총 금액: 5,500,000원',
    '특이사항: 현장 직접 납품',
  ];

  console.log('📝 한글 폰트 있는 경우:');
  testTexts.forEach(text => {
    const safeText = fontManager.safeKoreanText(text, true);
    console.log(`  "${text}" → "${safeText}"`);
  });

  console.log('\n📝 한글 폰트 없는 경우:');
  testTexts.forEach(text => {
    const safeText = fontManager.safeKoreanText(text, false);
    console.log(`  "${text}" → "${safeText}"`);
  });

  // 5. PDF 생성 테스트 (실제 발주서 데이터 사용)
  console.log('\n=== 5. 샘플 PDF 생성 테스트 ===');
  try {
    const sampleOrderData = {
      orderNumber: 'PO-TEST-KOREAN-001',
      orderDate: new Date(),
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일 후
      createdAt: new Date(),

      issuerCompany: {
        name: '익진건설주식회사',
        businessNumber: '123-45-67890',
        representative: '김대표',
        address: '서울특별시 강남구 테헤란로 123',
        phone: '02-1234-5678',
        email: 'info@ikjin.co.kr',
      },

      vendorCompany: {
        name: '한글테스트 거래처',
        businessNumber: '987-65-43210',
        representative: '박대표',
        address: '경기도 성남시 분당구 정자일로 95',
        phone: '031-987-6543',
        email: 'vendor@test.co.kr',
        contactPerson: '김담당자',
      },

      project: {
        name: '한글지원 테스트 현장',
        code: 'TEST-KR-001',
        location: '서울특별시 종로구',
        projectManager: '이현장',
        projectManagerContact: '010-1234-5678',
        orderManager: '최발주',
        orderManagerContact: 'order@ikjin.co.kr',
      },

      creator: {
        name: '테스트관리자',
        email: 'admin@ikjin.co.kr',
        phone: '010-9876-5432',
      },

      items: [
        {
          sequenceNo: 1,
          name: '한글품목명 테스트용 건설자재',
          specification: '규격: 1200x600x100mm, 두께 10cm',
          quantity: 50,
          unit: '매',
          unitPrice: 25000,
          totalPrice: 1250000,
          deliveryLocation: '서울 강남구 테스트 현장',
          deliveryEmail: 'delivery@test.com',
          remarks: '현장 직접 납품, 오전 배송 희망',
        },
        {
          sequenceNo: 2,
          name: '추가 한글 품목명',
          specification: '특수 규격품',
          quantity: 20,
          unit: '박스',
          unitPrice: 75000,
          totalPrice: 1500000,
          deliveryLocation: '경기 성남시 분당구',
          deliveryEmail: 'delivery2@test.com',
          remarks: '포장 상태 확인 필요',
        },
      ],

      financial: {
        subtotalAmount: 2750000,
        vatRate: 0.1,
        vatAmount: 275000,
        totalAmount: 3025000,
        discountAmount: 0,
        currencyCode: 'KRW',
      },

      metadata: {
        notes: '한글 폰트 지원 테스트를 위한 샘플 발주서입니다. 모든 한글 텍스트가 올바르게 렌더링되는지 확인해주세요.',
        documentId: 'TEST-DOC-KOREAN-FONT-001',
        generatedAt: new Date(),
        generatedBy: '한글폰트시스템테스트',
        templateVersion: 'v2.1.0-korean-optimized',
      },
    };

    console.log('📄 샘플 PDF 생성 중...');
    const pdfBuffer = await ProfessionalPDFGenerationService.generateProfessionalPDFWithPDFKit(sampleOrderData);
    
    const testPdfPath = './test-korean-font-output.pdf';
    fs.writeFileSync(testPdfPath, pdfBuffer);
    
    console.log(`✅ 샘플 PDF 생성 성공: ${testPdfPath}`);
    console.log(`📏 PDF 파일 크기: ${Math.round(pdfBuffer.length / 1024)}KB`);

  } catch (pdfError) {
    console.error('💥 PDF 생성 오류:', pdfError);
  }

  // 6. Vercel 최적화 상태 확인
  console.log('\n=== 6. Vercel 최적화 상태 ===');
  const isVercelOptimized = fontManager.isVercelOptimized();
  console.log(`🔧 Vercel 최적화 상태: ${isVercelOptimized ? '✅ 최적화됨' : '❌ 최적화 필요'}`);
  
  if (process.env.VERCEL) {
    console.log('☁️ 현재 Vercel 서버리스 환경에서 실행 중');
  } else {
    console.log('🏠 현재 로컬 개발 환경에서 실행 중');
  }

  console.log('\n🎉 한글 폰트 시스템 테스트 완료!');
}

// 테스트 실행
testKoreanFontSystem().catch(console.error);

export { testKoreanFontSystem };