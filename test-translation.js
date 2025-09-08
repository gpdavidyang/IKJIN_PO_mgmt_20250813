// 번역 함수 직접 테스트
const testTexts = [
  '발주업체',
  '수주업체', 
  '현장정보',
  '품목명',
  '규격',
  '수량',
  '단가',
  '금액',
  '소계',
  '부가세',
  '총 금액',
  '(주)익진엔지니어링',
  '삼성물산(주)',
  '철근',
  '레미콘'
];

function translateForVercel(text) {
  if (!text) return text;
  
  const translations = {
    // 기본 용어
    '구매발주서': 'Purchase Order',
    '발주서': 'Purchase Order',
    '발주번호': 'PO Number',
    '발주업체': 'Issuer Company',
    '수주업체': 'Vendor Company',
    '거래처': 'Vendor',
    '품목명': 'Item Name',
    '품목': 'Item',
    '규격': 'Specification',
    '수량': 'Quantity',
    '단위': 'Unit',
    '단가': 'Unit Price',
    '금액': 'Amount',
    '합계': 'Total',
    '총 금액': 'Total Amount',
    '소계': 'Subtotal',
    '부가세': 'VAT',
    '사업자등록번호': 'Business Registration No',
    '사업자번호': 'Business No',
    '대표자': 'Representative',
    '담당자': 'Contact Person',
    '연락처': 'Phone',
    '전화번호': 'Phone',
    '주소': 'Address',
    '이메일': 'Email',
    '현장명': 'Project Name',
    '현장정보': 'Project Info',
    '현장': 'Project',
    '발주일': 'Order Date',
    '납기일': 'Delivery Date',
    '등록일': 'Created Date',
    '작성자': 'Creator',
    '특이사항': 'Remarks',
    '비고': 'Notes',
    '참고사항': 'Reference',
    '업체명': 'Company Name',
    '일정': 'Schedule',
    '순번': 'No',
    '원': 'KRW',
    
    // 회사명 및 고유명사
    '익진엔지니어링': 'IKJIN Engineering',
    '주식회사': 'Co., Ltd.',
    '(주)익진엔지니어링': 'IKJIN Engineering Co., Ltd.',
    '삼성물산': 'Samsung C&T',
    '삼성물산(주)': 'Samsung C&T Corporation',
    '래미안 원베일리 신축공사': 'Raemian One Valley Construction',
    '(주)': '',
    '유한회사': 'Ltd.',
    '건설': 'Construction',
    '엔지니어링': 'Engineering',
    '산업': 'Industries',
    '물산': 'Trading',
    '건설사': 'Construction Co.',
    
    // 건설 자재 관련
    '철근': 'Steel Rebar',
    '레미콘': 'Ready-Mixed Concrete',
    '거푸집용 합판': 'Formwork Plywood',
    '합판': 'Plywood',
    '시멘트': 'Cement',
    '콘크리트': 'Concrete',
    '자재': 'Materials',
    '강재': 'Steel',
    
    // 단위 및 규격
    '톤': 'TON',
    '개': 'PCS',
    '매': 'SHEET',
    '장': 'SHEET',
    '미터': 'M',
    '제곱미터': 'M2',
    '세제곱미터': 'M3',
    '킬로그램': 'KG'
  };
  
  let result = text;
  
  // 1단계: 정확한 단어 매칭으로 번역 (긴 단어부터)
  const sortedTranslations = Object.entries(translations)
    .sort(([a], [b]) => b.length - a.length); // 긴 단어부터 처리
  
  for (const [korean, english] of sortedTranslations) {
    result = result.replace(new RegExp(korean, 'g'), english);
  }
  
  console.log(`"${text}" → "${result}"`);
  
  // 2단계: 남은 한글을 더 스마트하게 처리
  result = result.replace(/[가-힣]{2,}/g, (match) => {
    console.log(`  남은 한글 처리: "${match}"`);
    // 특정 패턴별로 의미있는 영문으로 변환
    if (match.includes('회사') || match.includes('기업')) return 'Company';
    if (match.includes('엔지니어링')) return 'Engineering';
    if (match.includes('건설') || match.includes('시공')) return 'Construction';
    if (match.includes('산업')) return 'Industries';
    if (match.includes('관리') || match.includes('관리소')) return 'Management';
    if (match.includes('현장') || match.includes('공사')) return 'Site';
    if (match.includes('자재') || match.includes('재료')) return 'Materials';
    if (match.includes('품목') || match.includes('물품')) return 'Item';
    if (match.includes('담당') || match.includes('책임')) return 'Manager';
    if (match.includes('전화') || match.includes('연락')) return 'Contact';
    if (match.includes('주소') || match.includes('위치')) return 'Address';
    
    // 숫자가 포함된 경우 (규격, 코드 등)
    if (/\d/.test(match)) return match.replace(/[가-힣]/g, '');
    
    // 길이에 따른 범용 처리
    if (match.length <= 2) return 'KR';
    if (match.length <= 4) return 'Korean';
    return 'Korean Company';
  });
  
  // 3단계: 단일 한글 문자 처리
  result = result.replace(/[가-힣]/g, '');
  
  console.log(`  최종 결과: "${result}"`);
  return result;
}

console.log('번역 테스트 시작...');
testTexts.forEach(text => {
  translateForVercel(text);
  console.log('---');
});