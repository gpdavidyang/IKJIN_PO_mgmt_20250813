import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

const dbData = JSON.parse(fs.readFileSync('db-data.json', 'utf-8').split('\n').slice(1).join('\n'));

// Sample data combinations
const sampleOrders = [
  { vendor: '삼성건설', project: '한강 신대교 건설사업', prefix: '올바른_발주서' },
  { vendor: '현대스틸(주)', project: '충주 반도체 제조공장', prefix: '올바른_발주서' },
  { vendor: '대우건설창호(주)', project: '강남 스마트타워 신축공사', prefix: '올바른_발주서' },
  { vendor: 'GS건설', project: '판교 데이터센터 구축', prefix: '올바른_발주서' },
  { vendor: '포스코', project: '인천공항 제3터미널 확장', prefix: '올바른_발주서' },
  { vendor: '동양플라스틱공업(주)', project: '여의도 금융센터 리모델링', prefix: '샘플_발주서' },
  { vendor: '한국단열시스템(주)', project: '부산 국제회의장 신축', prefix: '샘플_발주서' },
  { vendor: '그린텍단열재(주)', project: '세종시 정부청사 제2단계', prefix: '샘플_발주서' },
  { vendor: '삼화페인트공업(주)', project: '한강 신대교 건설사업', prefix: '테스트_발주서' },
  { vendor: '코리아코팅시스템(주)', project: '울산 석유화학단지 확장', prefix: '테스트_발주서' },
  { vendor: '유진창호시스템(주)', project: '잠실 롯데타워 2차', prefix: '발주서' },
  { vendor: '대한파이프(주)', project: '서울역 복합환승센터', prefix: '발주서' },
  { vendor: '태평양관공업(주)', project: '강남 스마트타워 신축공사', prefix: '발주서' },
  { vendor: '한국유리공업(주)', project: '한강 신대교 건설사업', prefix: '구매_발주서' },
  { vendor: '아시아글라스(주)', project: '충주 반도체 제조공장', prefix: '구매_발주서' },
  { vendor: '현대스틸(주)', project: '판교 데이터센터 구축', prefix: '구매_발주서' },
  { vendor: '포스코철강(주)', project: '세종시 정부청사 제2단계', prefix: '구매_발주서' },
  { vendor: '한일시멘트(주)', project: '인천공항 제3터미널 확장', prefix: '자재_발주서' },
  { vendor: '아세아시멘트(주)', project: '여의도 금융센터 리모델링', prefix: '자재_발주서' },
  { vendor: '일진기업', project: '부산 국제회의장 신축', prefix: '자재_발주서' }
];

function getRandomItems(items: any[], count: number) {
  const shuffled = [...items].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, items.length));
}

function getRandomDate() {
  const start = new Date(2025, 0, 1);
  const end = new Date(2025, 8, 30);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function createSampleExcel(index: number) {
  const orderInfo = sampleOrders[index];
  const vendor = dbData.vendors.find((v: any) => v.name === orderInfo.vendor) || dbData.vendors[index % dbData.vendors.length];
  const project = dbData.projects.find((p: any) => p.projectName === orderInfo.project) || dbData.projects[index % dbData.projects.length];
  
  const workbook = new ExcelJS.Workbook();
  
  // Sheet 1: 발주 정보
  const infoSheet = workbook.addWorksheet('발주 정보');
  
  // Header styling
  const headerStyle = {
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE0E0E0' } },
    font: { bold: true },
    border: {
      top: { style: 'thin' as const },
      left: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      right: { style: 'thin' as const }
    }
  };
  
  const dataStyle = {
    border: {
      top: { style: 'thin' as const },
      left: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      right: { style: 'thin' as const }
    }
  };

  // Add order information
  const orderDate = getRandomDate();
  const deliveryDate = new Date(orderDate.getTime() + (7 + Math.random() * 14) * 24 * 60 * 60 * 1000);
  
  infoSheet.addRow(['항목', '내용']);
  infoSheet.addRow(['발주번호', `PO-2025-${String(index + 1).padStart(4, '0')}`]);
  infoSheet.addRow(['발주일자', formatDate(orderDate)]);
  infoSheet.addRow(['납품요청일', formatDate(deliveryDate)]);
  infoSheet.addRow(['프로젝트명', project.projectName || project.name]);
  infoSheet.addRow(['프로젝트코드', project.projectCode || project.code || `PRJ-${String(index + 1).padStart(3, '0')}`]);
  infoSheet.addRow(['거래처명', vendor.name]);
  infoSheet.addRow(['거래처 이메일', 'davidswyang@gmail.com']);
  infoSheet.addRow(['거래처 전화번호', vendor.phone || '02-1234-5678']);
  infoSheet.addRow(['거래처 담당자', vendor.contactPerson || '김담당']);
  infoSheet.addRow(['납품장소', `${project.projectName || project.name} 현장`]);
  infoSheet.addRow(['특기사항', '정품 납품 요망, 납기일 준수 필수']);
  
  // Apply styles to info sheet
  for (let i = 1; i <= 12; i++) {
    const row = infoSheet.getRow(i);
    if (i === 1) {
      row.getCell(1).style = headerStyle;
      row.getCell(2).style = headerStyle;
    } else {
      row.getCell(1).style = { ...dataStyle, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } } };
      row.getCell(2).style = dataStyle;
    }
  }
  
  infoSheet.getColumn(1).width = 20;
  infoSheet.getColumn(2).width = 40;

  // Sheet 2: 발주 품목
  const itemsSheet = workbook.addWorksheet('발주 품목');
  
  itemsSheet.addRow(['대분류', '중분류', '소분류', '품목명', '규격', '단위', '수량', '단가', '금액', '비고']);
  
  // Get random items from database
  const selectedItems = getRandomItems(dbData.items, 5 + Math.floor(Math.random() * 10));
  
  let totalAmount = 0;
  selectedItems.forEach((item: any) => {
    const quantity = Math.floor(Math.random() * 100) + 10;
    const unitPrice = Math.floor(Math.random() * 100000) + 10000;
    const amount = quantity * unitPrice;
    totalAmount += amount;
    
    itemsSheet.addRow([
      item.majorCategory || '건설자재',
      item.middleCategory || '일반자재',
      item.subCategory || '기타',
      item.name,
      item.specification || '표준규격',
      item.unit || 'EA',
      quantity,
      unitPrice,
      amount,
      ''
    ]);
  });
  
  // Add total row
  itemsSheet.addRow(['', '', '', '', '', '합계', '', '', totalAmount, '']);
  
  // Apply styles to items sheet
  const headerRow = itemsSheet.getRow(1);
  for (let i = 1; i <= 10; i++) {
    headerRow.getCell(i).style = headerStyle;
  }
  
  for (let i = 2; i <= selectedItems.length + 2; i++) {
    const row = itemsSheet.getRow(i);
    for (let j = 1; j <= 10; j++) {
      row.getCell(j).style = dataStyle;
    }
  }
  
  // Set column widths
  itemsSheet.getColumn(1).width = 15;
  itemsSheet.getColumn(2).width = 15;
  itemsSheet.getColumn(3).width = 15;
  itemsSheet.getColumn(4).width = 25;
  itemsSheet.getColumn(5).width = 20;
  itemsSheet.getColumn(6).width = 10;
  itemsSheet.getColumn(7).width = 10;
  itemsSheet.getColumn(8).width = 15;
  itemsSheet.getColumn(9).width = 15;
  itemsSheet.getColumn(10).width = 20;

  // Sheet 3: Input 시트 (will be removed during processing)
  const inputSheet = workbook.addWorksheet('Input_발주정보');
  inputSheet.addRow(['This is an input sheet that should be removed during processing']);
  inputSheet.addRow(['테스트용 입력 시트입니다']);

  // Save the file
  const projectName = project.projectName || project.name || `프로젝트_${index + 1}`;
  const fileName = `${orderInfo.prefix}_${projectName.replace(/\s+/g, '_')}_${vendor.name.replace(/[()]/g, '').replace(/\s+/g, '_')}_20250908.xlsx`;
  const filePath = path.join('PO_test', '20250908', fileName);
  
  await workbook.xlsx.writeFile(filePath);
  console.log(`Created: ${fileName}`);
}

async function createAllSamples() {
  console.log('Creating 20 sample Excel files...\n');
  
  for (let i = 0; i < 20; i++) {
    await createSampleExcel(i);
  }
  
  console.log('\n✅ All 20 sample Excel files created successfully!');
  console.log('Location: PO_test/20250908/');
}

createAllSamples().catch(console.error);