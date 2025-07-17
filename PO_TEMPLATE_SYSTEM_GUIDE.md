# 🚀 PO Template 자동화 시스템 사용 가이드

## 📋 개요

PO Template 자동화 시스템은 Excel 파일을 업로드하여 발주서 데이터를 자동으로 파싱하고, DB에 저장한 후 이메일로 갑지/을지 시트를 발송하는 통합 시스템입니다.

## 🔧 시스템 구성요소

### 1. 파일 구조
```
server/
├── routes/po-template.ts          # PO Template API 엔드포인트
├── utils/
│   ├── po-template-processor.ts   # Excel 파싱 및 DB 저장 로직
│   ├── excel-to-pdf.ts           # Excel to PDF 변환 유틸리티
│   └── po-email-service.ts       # 이메일 발송 서비스
├── migrations/
│   └── 0008_add_po_template_fields.sql  # DB 스키마 추가
shared/
└── schema.ts                     # 업데이트된 DB 스키마
```

### 2. 데이터베이스 스키마 변경사항
`purchase_order_items` 테이블에 추가된 필드:
- `category_lv1` VARCHAR(100) - 대분류
- `category_lv2` VARCHAR(100) - 중분류  
- `category_lv3` VARCHAR(100) - 소분류
- `supply_amount` DECIMAL(15,2) - 공급가액
- `tax_amount` DECIMAL(15,2) - 세액
- `delivery_name` VARCHAR(255) - 납품처명

## 🚀 API 엔드포인트

### 1. 통합 처리 (권장)
```http
POST /api/po-template/process
Content-Type: multipart/form-data

# Body
file: [Excel 파일]
```

**응답 예시:**
```json
{
  "success": true,
  "message": "PO Template 처리 완료",
  "data": {
    "fileName": "PO_Template01_Ext_20250716_2.xlsx",
    "parsing": {
      "totalOrders": 5,
      "totalItems": 15
    },
    "database": {
      "savedOrders": 5
    },
    "extraction": {
      "extractedPath": "/uploads/extracted-1642123456789.xlsx",
      "extractedSheets": ["갑지", "을지"]
    }
  }
}
```

### 2. 단계별 처리

#### A. 파일 업로드 및 파싱
```http
POST /api/po-template/upload
Content-Type: multipart/form-data

# Body
file: [Excel 파일]
```

#### B. DB 저장
```http
POST /api/po-template/save
Content-Type: application/json

{
  "filePath": "/uploads/filename.xlsx",
  "orders": [...]
}
```

#### C. 시트 추출
```http
POST /api/po-template/extract-sheets
Content-Type: application/json

{
  "filePath": "/uploads/filename.xlsx",
  "sheetNames": ["갑지", "을지"]
}
```

#### D. 이메일 발송
```http
POST /api/po-template/send-email
Content-Type: application/json

{
  "filePath": "/uploads/filename.xlsx",
  "to": ["vendor@example.com"],
  "cc": ["manager@company.com"],
  "subject": "발주서 송부 - PO-2025-001",
  "orderNumber": "PO-2025-001",
  "vendorName": "㈜삼성전자",
  "orderDate": "2025-01-15",
  "dueDate": "2025-02-15",
  "totalAmount": 5000000,
  "additionalMessage": "긴급 발주 건입니다."
}
```

### 3. 유틸리티 API

#### 이메일 연결 테스트
```http
GET /api/po-template/test-email
```

#### 파일 다운로드
```http
GET /api/po-template/download/{filename}
```

#### 임시 파일 정리
```http
DELETE /api/po-template/cleanup/{filename}
```

## 📊 Excel 파일 형식

### Input 시트 구조 (A~Q열)
| 열 | 필드명 | 타입 | 필수 | 설명 |
|---|--------|------|------|------|
| A | 발주번호 | 문자열 | ✅ | 발주서 식별자 |
| B | 발주일 | 날짜 | ✅ | 발주 일자 |
| C | 현장명 | 문자열 | ✅ | 프로젝트/현장명 |
| D | 대분류 | 문자열 | ❌ | 품목 대분류 |
| E | 중분류 | 문자열 | ❌ | 품목 중분류 |
| F | 소분류 | 문자열 | ❌ | 품목 소분류 |
| G | 품목명 | 문자열 | ✅ | 품목 이름 |
| H | 규격 | 문자열 | ❌ | 품목 규격 |
| I | 수량 | 숫자 | ✅ | 주문 수량 |
| J | 단가 | 숫자 | ✅ | 단위 가격 |
| K | 공급가액 | 숫자 | ✅ | 부가세 제외 금액 |
| L | 세액 | 숫자 | ✅ | 부가세 금액 |
| M | 총금액 | 숫자 | ✅ | 최종 금액 |
| N | 납기일 | 날짜 | ✅ | 납품 예정일 |
| O | 거래처명 | 문자열 | ✅ | 공급업체명 |
| P | 납품처명 | 문자열 | ❌ | 납품 장소 |
| Q | 비고 | 문자열 | ❌ | 추가 메모 |

### 이메일 첨부 시트
- **갑지**: 발주서 원본 시트
- **을지**: 발주서 사본 시트

## 🔄 데이터 처리 흐름

```mermaid
graph TD
    A[Excel 파일 업로드] --> B[Input 시트 파싱]
    B --> C[데이터 유효성 검사]
    C --> D[DB 저장]
    D --> E[갑지/을지 시트 추출]
    E --> F[Excel → PDF 변환]
    F --> G[이메일 발송]
    G --> H[임시 파일 정리]
```

## 🛠️ 설치 및 설정

### 1. 의존성 설치
```bash
npm install xlsx uuid puppeteer @types/uuid
```

### 2. 환경 변수 설정
```env
# 이메일 설정
SMTP_HOST=smtp.naver.com
SMTP_PORT=587
SMTP_USER=your_email@naver.com
SMTP_PASS=your_password

# 데이터베이스 설정
DATABASE_URL=postgresql://user:password@host:port/database
```

### 3. 마이그레이션 실행
```bash
npm run db:push
```

### 4. 서버 시작
```bash
npm run dev
```

## 📝 사용 예시

### JavaScript/TypeScript 클라이언트
```typescript
// 통합 처리
const formData = new FormData();
formData.append('file', file);

const response = await fetch('/api/po-template/process', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result);

// 이메일 발송
const emailData = {
  filePath: result.data.extraction.extractedPath,
  to: ['vendor@example.com'],
  subject: '발주서 송부',
  orderNumber: 'PO-2025-001',
  vendorName: '㈜삼성전자',
  totalAmount: 5000000
};

await fetch('/api/po-template/send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(emailData)
});
```

### curl 사용 예시
```bash
# 파일 업로드 및 처리
curl -X POST -F "file=@PO_Template.xlsx" \
  http://localhost:3000/api/po-template/process

# 이메일 발송
curl -X POST -H "Content-Type: application/json" \
  -d '{
    "filePath": "/uploads/extracted-123.xlsx",
    "to": ["vendor@example.com"],
    "subject": "발주서 송부",
    "orderNumber": "PO-2025-001"
  }' \
  http://localhost:3000/api/po-template/send-email
```

## 🔍 오류 처리

### 일반적인 오류와 해결방법

1. **파일 업로드 오류**
   - Excel 파일 형식 확인 (.xlsx, .xls)
   - 파일 크기 제한 (10MB)

2. **파싱 오류**
   - Input 시트 존재 여부 확인
   - 필수 컬럼 데이터 확인

3. **DB 저장 오류**
   - 데이터베이스 연결 확인
   - 마이그레이션 실행 확인

4. **이메일 발송 오류**
   - SMTP 설정 확인
   - 이메일 주소 형식 확인

## 📈 성능 최적화

1. **파일 처리**
   - 대용량 파일 스트리밍 처리
   - 임시 파일 자동 정리

2. **DB 작업**
   - 트랜잭션 사용
   - 벌크 삽입 최적화

3. **이메일 발송**
   - 비동기 처리
   - 큐 시스템 연동 가능

## 🔒 보안 고려사항

1. **파일 업로드**
   - 파일 타입 검증
   - 크기 제한
   - 바이러스 검사 (선택사항)

2. **인증**
   - API 접근 권한 확인
   - 사용자별 접근 제어

3. **데이터 보호**
   - 임시 파일 자동 삭제
   - 개인정보 암호화

## 📞 지원 및 문의

시스템 사용 중 문제가 발생하면:
1. 로그 확인
2. API 응답 코드 확인
3. 개발팀 문의

---

*이 시스템은 지속적으로 개선되고 있습니다. 피드백이나 개선사항이 있으면 언제든지 알려주세요.*