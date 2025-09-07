import { ProfessionalPDFGenerationService, ComprehensivePurchaseOrderData } from './server/services/professional-pdf-generation-service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 샘플 PDF 생성 스크립트
 * ProfessionalPDFGenerationService를 사용하여 테스트 PDF 생성
 */
async function generateSamplePDF() {
  console.log('📄 샘플 PDF 생성 시작...');

  // 샘플 데이터 생성
  const sampleData: ComprehensivePurchaseOrderData = {
    // 기본 발주 정보
    orderNumber: 'PO-2025-00001',
    orderDate: new Date('2025-01-07'),
    deliveryDate: new Date('2025-01-20'),
    createdAt: new Date(),

    // 발주업체 정보
    issuerCompany: {
      name: '(주)익진건설',
      businessNumber: '123-45-67890',
      representative: '김대표',
      address: '서울특별시 강남구 테헤란로 123, 익진빌딩 5층',
      phone: '02-1234-5678',
      email: 'purchase@ikjin.co.kr',
    },

    // 수주업체 정보
    vendorCompany: {
      name: '대한철강(주)',
      businessNumber: '987-65-43210',
      representative: '이철강',
      address: '경기도 화성시 동탄산업로 456',
      phone: '031-8765-4321',
      email: 'sales@daehanchulgang.co.kr',
      contactPerson: '박영업',
    },

    // 현장 정보
    project: {
      name: '판교 테크노밸리 신축공사',
      code: 'PJ-2025-001',
      location: '경기도 성남시 분당구 판교동',
      projectManager: '김현장',
      projectManagerContact: '010-1234-5678',
      orderManager: '이발주',
      orderManagerContact: 'lee.balju@ikjin.co.kr',
    },

    // 작성자 정보
    creator: {
      name: '박담당',
      email: 'park.damdang@ikjin.co.kr',
      phone: '010-9876-5432',
    },

    // 품목 정보
    items: [
      {
        sequenceNo: 1,
        name: 'H형강 400x200x8x13',
        specification: 'SS400, KS D 3503',
        quantity: 150,
        unit: 'TON',
        unitPrice: 1250000,
        totalPrice: 187500000,
        deliveryLocation: '판교 현장 자재창고 A동',
        deliveryEmail: 'warehouse.pangyo@ikjin.co.kr',
        remarks: '오전 9시-오후 5시 납품 가능',
      },
      {
        sequenceNo: 2,
        name: '철근 D25',
        specification: 'SD400, KS D 3504',
        quantity: 80,
        unit: 'TON',
        unitPrice: 950000,
        totalPrice: 76000000,
        deliveryLocation: '판교 현장 자재창고 B동',
        deliveryEmail: 'warehouse.pangyo@ikjin.co.kr',
        remarks: '절단 작업 필요',
      },
      {
        sequenceNo: 3,
        name: '데크플레이트 1.2T',
        specification: 'SPCD, 아연도금',
        quantity: 2500,
        unit: 'M2',
        unitPrice: 45000,
        totalPrice: 112500000,
        deliveryLocation: '판교 현장 야적장',
        deliveryEmail: 'yard.pangyo@ikjin.co.kr',
        remarks: '우천시 방수포 필수',
      },
      {
        sequenceNo: 4,
        name: 'C형강 200x80x3.2',
        specification: 'SS400, 아연도금',
        quantity: 35,
        unit: 'TON',
        unitPrice: 1380000,
        totalPrice: 48300000,
        deliveryLocation: '판교 현장 자재창고 C동',
        deliveryEmail: 'warehouse.pangyo@ikjin.co.kr',
        remarks: '6m 단위 절단',
      },
      {
        sequenceNo: 5,
        name: '앵글 75x75x6',
        specification: 'SS400, KS D 3503',
        quantity: 25,
        unit: 'TON',
        unitPrice: 1150000,
        totalPrice: 28750000,
        deliveryLocation: '판교 현장 자재창고 A동',
        deliveryEmail: 'warehouse.pangyo@ikjin.co.kr',
        remarks: '도색 작업 완료 후 납품',
      },
    ],

    // 금액 정보
    financial: {
      subtotalAmount: 453050000,
      vatRate: 0.1,
      vatAmount: 45305000,
      totalAmount: 498355000,
      discountAmount: 0,
      currencyCode: 'KRW',
    },

    // 기타 정보
    metadata: {
      notes: '1. 납품 전 사전 연락 필수\n2. 성적서 및 품질보증서 첨부\n3. 하자보증기간: 납품 후 1년',
      documentId: `DOC_SAMPLE_${Date.now()}`,
      generatedAt: new Date(),
      generatedBy: '박담당',
      templateVersion: 'v2.0.0',
    },
  };

  try {
    // PDF 생성
    console.log('📝 PDF 생성 중...');
    const pdfBuffer = await ProfessionalPDFGenerationService.generateProfessionalPDF(sampleData);
    
    // 파일로 저장
    const outputDir = path.join(process.cwd(), 'uploads', 'samples');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const fileName = `SAMPLE_${sampleData.orderNumber}_${Date.now()}.pdf`;
    const filePath = path.join(outputDir, fileName);
    
    fs.writeFileSync(filePath, pdfBuffer);
    
    console.log('✅ PDF 생성 완료!');
    console.log(`📁 파일 위치: ${filePath}`);
    console.log(`📏 파일 크기: ${Math.round(pdfBuffer.length / 1024)}KB`);
    
    // 파일 정보 출력
    console.log('\n📋 발주서 정보:');
    console.log(`  - 발주번호: ${sampleData.orderNumber}`);
    console.log(`  - 발주업체: ${sampleData.issuerCompany.name}`);
    console.log(`  - 수주업체: ${sampleData.vendorCompany.name}`);
    console.log(`  - 현장: ${sampleData.project.name}`);
    console.log(`  - 품목 수: ${sampleData.items.length}개`);
    console.log(`  - 총 금액: ${new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(sampleData.financial.totalAmount)}`);
    
    return filePath;
    
  } catch (error) {
    console.error('❌ PDF 생성 실패:', error);
    throw error;
  }
}

// 스크립트 실행
generateSamplePDF()
  .then(filePath => {
    console.log('\n🎉 샘플 PDF 생성이 완료되었습니다!');
    console.log(`👉 생성된 파일: ${filePath}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  });

export { generateSamplePDF };