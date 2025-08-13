# 데이터 가져오기 템플릿 파일

이 디렉토리에는 대량 데이터 등록을 위한 템플릿 파일들이 포함되어 있습니다.

## 📋 템플릿 파일 목록

### 1. 발주서 등록 템플릿
- **파일**: `purchase_orders_template.xlsx`, `purchase_orders_template.csv`
- **용도**: 대량 발주서 데이터 등록
- **주요 필드**:
  - 발주번호 (orderNumber) - 고유한 발주 번호
  - 현장ID (projectId) - 현장 ID 참조
  - 거래처ID (vendorId) - 거래처 ID 참조  
  - 발주일자 (orderDate) - YYYY-MM-DD 형식
  - 납기일자 (deliveryDate) - YYYY-MM-DD 형식
  - 품목명 (itemName) - 발주 품목명
  - 규격 (specification) - 품목 상세 규격
  - 단위 (unit) - 수량 단위 (톤, ㎥, 매 등)
  - 수량 (quantity) - 주문 수량
  - 단가 (unitPrice) - 품목 단가
  - 총금액 (totalAmount) - 수량 × 단가
  - 대분류/중분류/소분류 - 품목 카테고리
  - 비고 (notes) - 추가 정보

### 2. 현장 등록 템플릿  
- **파일**: `projects_template.xlsx`, `projects_template.csv`
- **용도**: 대량 현장(프로젝트) 데이터 등록
- **주요 필드**:
  - 현장명 (projectName) - 현장/프로젝트명
  - 현장코드 (projectCode) - 고유한 현장 코드
  - 발주처명 (clientName) - 클라이언트/발주처명
  - 현장유형 (projectType) - residential, commercial, industrial, infrastructure
  - 위치 (location) - 현장 주소/위치
  - 시작일 (startDate) - YYYY-MM-DD 형식
  - 종료일 (endDate) - YYYY-MM-DD 형식  
  - 상태 (status) - planning, active, on_hold, completed, cancelled
  - 총예산 (totalBudget) - 숫자 형태
  - 현장관리자ID (projectManagerId) - 사용자 ID 참조
  - 발주담당자ID (orderManagerId) - 사용자 ID 참조
  - 설명 (description) - 프로젝트 상세 설명

### 3. 거래처 등록 템플릿
- **파일**: `vendors_template.xlsx`, `vendors_template.csv`  
- **용도**: 대량 거래처 데이터 등록
- **주요 필드**:
  - 거래처명 (name) - 거래처 정식명칭
  - 거래처코드 (vendorCode) - 고유한 거래처 코드  
  - 사업자번호 (businessNumber) - 하이픈 없이 숫자만
  - 담당자 (contactPerson) - 거래처 담당자명
  - 이메일 (email) - 연락용 이메일 주소
  - 전화번호 (phone) - 연락처
  - 주소 (address) - 거래처 주소
  - 업종 (businessType) - 사업 분야
  - 별칭 (aliases) - 쉼표(,)로 구분된 별칭 목록

## 📝 사용 방법

1. **템플릿 다운로드**: 필요한 템플릿 파일을 다운로드합니다.
2. **데이터 입력**: Excel 또는 CSV 편집 도구로 데이터를 입력합니다.
3. **형식 확인**: 각 필드의 데이터 형식을 확인합니다.
4. **파일 업로드**: 데이터 가져오기 화면에서 파일을 업로드합니다.

## ⚠️ 주의사항

- **필수 필드**: 각 템플릿의 필수 필드는 반드시 입력해야 합니다.
- **데이터 형식**: 날짜는 YYYY-MM-DD 형식, 숫자는 천단위 구분자 없이 입력
- **참조 무결성**: ID 필드들은 실제 존재하는 데이터를 참조해야 합니다.
- **중복 방지**: 고유 필드(코드, 번호 등)는 중복되지 않도록 주의하세요.
- **파일 크기**: 한 번에 업로드할 수 있는 파일 크기는 10MB 이하입니다.

## 🔧 템플릿 생성 스크립트

템플릿 파일들은 `scripts/create-templates.cjs` 스크립트로 생성됩니다:

```bash
node scripts/create-templates.cjs
```

스크립트 실행 시 최신 데이터베이스 스키마를 반영한 템플릿이 생성됩니다.