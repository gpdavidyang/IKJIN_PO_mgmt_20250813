# 개선된 발주 관리 시스템 DB Schema (dbdiagram.io 형식)

```sql
// 발주 관리 시스템 DB Schema (개선 버전)
// Purchase Order Management System Database Schema (Improved)

Table sessions {
  sid varchar [pk, note: "세션 ID"]
  sess jsonb [not null, note: "세션 데이터"]
  expire timestamp [not null, note: "만료 시간"]
  
  indexes {
    expire [name: "IDX_session_expire"]
  }
  
  note: "Replit Auth 세션 저장소"
}

Table ui_terms {
  id serial [pk]
  term_key varchar(100) [unique, not null, note: "용어 키"]
  term_value varchar(255) [not null, note: "용어 값"]
  category varchar(50) [default: "general", note: "카테고리"]
  description text [note: "설명"]
  is_active boolean [default: true, note: "활성 상태"]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  note: "UI 용어 관리 테이블 (다국어 지원)"
}

Table positions {
  id serial [pk]
  position_code varchar(50) [unique, not null, note: "직급 코드"]
  position_name varchar(100) [not null, note: "직급명"]
  level integer [not null, note: "직급 레벨 (1=최고위, 7=사원)"]
  department varchar(100) [note: "부서"]
  description text [note: "직급 설명"]
  is_active boolean [default: true]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  note: "직급 관리 테이블"
}

Table users {
  id varchar [pk, not null, note: "사용자 ID"]
  email varchar [unique, note: "이메일"]
  name varchar [not null, note: "사용자명"]
  position_id integer [ref: > positions.id, note: "직급 ID"]
  phone_number varchar [not null, note: "전화번호"]
  profile_image_url varchar [note: "프로필 이미지 URL"]
  role user_role [not null, default: "user", note: "역할 ENUM"]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  note: "사용자 관리 테이블 (ENUM 타입 적용)"
}

Table order_statuses {
  id serial [pk]
  code varchar(50) [unique, not null, note: "상태 코드"]
  name varchar(100) [not null, note: "상태명"]
  description text [note: "상태 설명"]
  color varchar(20) [default: "gray", note: "배지 색상"]
  sort_order integer [default: 0, note: "정렬 순서"]
  is_active boolean [default: true]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  note: "발주 상태 관리 테이블"
}

Table companies {
  id serial [pk]
  company_name varchar(255) [not null, note: "회사명"]
  business_number varchar(50) [note: "사업자번호"]
  address text [note: "주소"]
  phone varchar(50) [note: "전화번호"]
  fax varchar(50) [note: "팩스번호"]
  email varchar(255) [note: "이메일"]
  website varchar(255) [note: "웹사이트"]
  representative varchar(100) [note: "대표자명"]
  logo_url text [note: "로고 파일 URL"]
  is_active boolean [default: true]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  note: "발주사 회사 정보 테이블"
}

Table vendors {
  id serial [pk]
  name varchar(255) [not null, note: "거래처명"]
  business_number varchar(50) [note: "사업자번호"]
  industry varchar(100) [note: "업종"]
  representative varchar(100) [note: "대표자"]
  contact varchar(100) [not null, note: "연락처"]
  contact_person varchar(100) [not null, note: "담당자"]
  email varchar(255) [not null, unique, note: "이메일 (UNIQUE 제약)"]
  phone varchar(50) [note: "전화번호"]
  address text [note: "주소"]
  memo text [note: "메모"]
  is_active boolean [default: true]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  note: "거래처 관리 테이블 (NOT NULL 제약 강화)"
}

Table items {
  id serial [pk]
  name varchar(255) [not null, note: "품목명"]
  category varchar(100) [note: "카테고리"]
  specification text [note: "규격"]
  unit varchar(50) [not null, note: "단위"]
  standard_price decimal(15,2) [note: "표준 단가"]
  description text [note: "설명"]
  is_active boolean [default: true]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  note: "품목 마스터 테이블"
}

Table project_statuses {
  id serial [pk]
  status_code varchar(50) [unique, not null, note: "상태 코드"]
  status_name varchar(100) [not null, note: "상태명"]
  display_order integer [not null, default: 0, note: "표시 순서"]
  is_active boolean [default: true]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  note: "프로젝트 상태 관리 테이블"
}

Table project_types {
  id serial [pk]
  type_code varchar(50) [unique, not null, note: "유형 코드"]
  type_name varchar(100) [not null, note: "유형명"]
  display_order integer [not null, default: 0]
  is_active boolean [default: true]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  note: "프로젝트 유형 관리 테이블"
}

Table projects {
  id serial [pk]
  project_name varchar(255) [not null, note: "프로젝트명"]
  project_code varchar(100) [unique, not null, note: "프로젝트 코드"]
  client_name varchar(255) [note: "고객사명"]
  project_type varchar(100) [note: "프로젝트 유형"]
  location text [note: "위치"]
  start_date timestamp [note: "시작일"]
  end_date timestamp [note: "종료일"]
  status varchar(50) [not null, default: "active", note: "상태"]
  total_budget decimal(15,2) [note: "총 예산"]
  project_manager_id varchar [ref: > users.id, note: "프로젝트 매니저"]
  order_manager_id varchar [ref: > users.id, note: "발주 매니저"]
  description text [note: "프로젝트 설명"]
  is_active boolean [default: true]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  note: "건설 프로젝트 관리 테이블"
}

Table project_members {
  id serial [pk]
  project_id integer [ref: > projects.id, not null, note: "프로젝트 ID"]
  user_id varchar [ref: > users.id, not null, note: "사용자 ID"]
  role varchar(50) [not null, note: "역할 (manager/order_manager/member/viewer)"]
  assigned_at timestamp [default: `now()`, note: "배정일"]
  assigned_by varchar [ref: > users.id, note: "배정자"]
  is_active boolean [default: true]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    (project_id, user_id) [unique, name: "project_members_unique"]
  }
  
  note: "프로젝트 팀 구성원 관리 테이블 (복합 UNIQUE 제약)"
}

Table project_history {
  id serial [pk]
  project_id integer [ref: > projects.id, not null, note: "프로젝트 ID"]
  field_name varchar(100) [not null, note: "변경된 필드명"]
  old_value text [note: "이전 값"]
  new_value text [note: "새 값"]
  changed_by varchar [ref: > users.id, not null, note: "변경자"]
  changed_at timestamp [default: `now()`, note: "변경일시"]
  change_reason text [note: "변경 사유"]
  
  note: "프로젝트 변경 이력 추적 테이블"
}

Table order_templates {
  id serial [pk]
  template_name varchar(100) [not null, note: "템플릿명"]
  template_type varchar(50) [not null, note: "템플릿 유형"]
  fields_config jsonb [not null, note: "필드 설정 JSON"]
  is_active boolean [default: true]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  note: "발주서 템플릿 관리 테이블"
}

Table template_fields {
  id serial [pk]
  template_id integer [ref: > order_templates.id, note: "템플릿 ID"]
  field_type varchar(50) [not null, note: "필드 유형"]
  field_name varchar(100) [not null, note: "필드명"]
  label varchar(255) [not null, note: "라벨"]
  placeholder varchar(255) [note: "플레이스홀더"]
  required boolean [default: false, note: "필수 여부"]
  validation jsonb [note: "검증 규칙 JSON"]
  options jsonb [note: "선택 옵션 JSON"]
  grid_position jsonb [not null, note: "그리드 위치 JSON"]
  section_name varchar(100) [not null, note: "섹션명"]
  sort_order integer [default: 0, note: "정렬 순서"]
  is_active boolean [default: true]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  note: "동적 폼 필드 정의 테이블"
}

Table handsontable_configs {
  id serial [pk]
  template_id integer [ref: > order_templates.id, note: "템플릿 ID"]
  col_headers jsonb [not null, note: "컬럼 헤더 배열"]
  columns jsonb [not null, note: "컬럼 설정"]
  rows_count integer [default: 10, note: "행 수"]
  formulas jsonb [note: "수식 정의"]
  validation_rules jsonb [note: "셀 검증 규칙"]
  custom_styles jsonb [note: "스타일 규칙"]
  settings jsonb [note: "추가 Handsontable 설정"]
  sort_order integer [default: 0, note: "정렬 순서 (추가됨)"]
  is_active boolean [default: true]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  note: "Handsontable 스프레드시트 설정 테이블 (sort_order 추가)"
}

Table template_versions {
  id serial [pk]
  template_id integer [ref: > order_templates.id, note: "템플릿 ID"]
  version_number varchar(20) [not null, note: "버전 번호"]
  changes jsonb [note: "변경 로그"]
  template_config jsonb [not null, note: "템플릿 스냅샷"]
  created_by varchar(255) [note: "생성자"]
  created_at timestamp [default: `now()`]
  
  note: "템플릿 버전 관리 테이블"
}

Table purchase_orders {
  id serial [pk]
  order_number varchar(50) [unique, not null, note: "발주 번호"]
  project_id integer [ref: > projects.id, not null, note: "프로젝트 ID"]
  vendor_id integer [ref: > vendors.id, note: "거래처 ID"]
  user_id varchar [ref: > users.id, not null, note: "발주자 ID"]
  template_id integer [ref: > order_templates.id, note: "템플릿 ID"]
  order_date timestamp [not null, note: "발주일"]
  delivery_date timestamp [note: "납품 희망일"]
  status purchase_order_status [not null, default: "pending", note: "상태 ENUM"]
  total_amount decimal(15,2) [default: "0", note: "총 금액"]
  notes text [note: "특이사항"]
  custom_fields jsonb [note: "사용자 정의 필드"]
  is_approved boolean [default: false, note: "승인 여부"]
  approved_by varchar [ref: > users.id, note: "승인자"]
  approved_at timestamp [note: "승인일시"]
  sent_at timestamp [note: "발송일시"]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  note: "발주서 마스터 테이블 (ENUM 타입 적용)"
}

Table purchase_order_items {
  id serial [pk]
  order_id integer [ref: > purchase_orders.id, not null, note: "발주서 ID"]
  item_id integer [ref: > items.id, note: "품목 ID"]
  item_name varchar(255) [not null, note: "품목명"]
  specification text [note: "규격"]
  quantity decimal(10,2) [not null, note: "수량"]
  unit_price decimal(15,2) [not null, note: "단가"]
  total_amount decimal(15,2) [not null, note: "금액"]
  notes text [note: "비고"]
  created_at timestamp [default: `now()`]
  
  note: "발주서 품목 상세 테이블"
}

Table attachments {
  id serial [pk]
  order_id integer [ref: > purchase_orders.id, not null, note: "발주서 ID"]
  file_name varchar(255) [not null, note: "파일명"]
  original_name varchar(255) [not null, note: "원본 파일명"]
  file_size integer [not null, note: "파일 크기"]
  mime_type varchar(100) [not null, note: "MIME 타입"]
  file_path text [not null, note: "파일 경로"]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`, note: "추가된 컬럼"]
  
  note: "발주서 첨부파일 테이블 (updated_at 추가)"
}

Table order_history {
  id serial [pk]
  order_id integer [ref: > purchase_orders.id, not null, note: "발주서 ID"]
  user_id varchar [ref: > users.id, not null, note: "사용자 ID"]
  action varchar(100) [not null, note: "작업 (created/updated/approved/sent)"]
  changes jsonb [note: "변경 내용 JSON"]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`, note: "추가된 컬럼"]
  
  note: "발주서 변경 이력 테이블 (updated_at 추가)"
}

Table invoices {
  id serial [pk]
  order_id integer [ref: > purchase_orders.id, not null, note: "발주서 ID"]
  invoice_number varchar(100) [unique, not null, note: "청구서 번호"]
  invoice_type varchar(20) [not null, note: "청구서 유형 (invoice/tax_invoice)"]
  issue_date timestamp [not null, note: "발행일"]
  due_date timestamp [note: "지불 기한"]
  total_amount decimal(15,2) [not null, note: "총 금액"]
  vat_amount decimal(15,2) [default: "0", note: "부가세 금액"]
  status invoice_status [not null, default: "pending", note: "상태 ENUM"]
  file_path varchar(500) [note: "청구서 파일 경로"]
  uploaded_by varchar [not null, ref: > users.id, note: "업로드자 (FK 추가)"]
  verified_by varchar [ref: > users.id, note: "검증자 (FK 추가)"]
  verified_at timestamp [note: "검증일시"]
  tax_invoice_issued boolean [default: false, note: "세금계산서 발행 여부"]
  tax_invoice_issued_date timestamp [note: "세금계산서 발행일"]
  tax_invoice_issued_by varchar [ref: > users.id, note: "세금계산서 발행자 (FK 추가)"]
  notes text [note: "비고"]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  note: "청구서/세금계산서 관리 테이블 (ENUM 타입 및 FK 제약 적용)"
}

Table item_receipts {
  id serial [pk]
  order_item_id integer [ref: > purchase_order_items.id, not null, note: "발주 품목 ID"]
  invoice_id integer [ref: > invoices.id, note: "청구서 ID"]
  received_quantity decimal(10,2) [not null, note: "수령 수량"]
  received_date timestamp [not null, note: "수령일"]
  quality_check boolean [default: false, note: "품질 검사 여부"]
  quality_notes text [note: "품질 검사 메모"]
  verified_by varchar [not null, ref: > users.id, note: "검증자 (FK 추가)"]
  status item_receipt_status [not null, default: "pending", note: "상태 ENUM"]
  notes text [note: "비고"]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  note: "항목별 수령 확인 테이블 (ENUM 타입 및 FK 제약 적용)"
}

Table verification_logs {
  id serial [pk]
  order_id integer [ref: > purchase_orders.id, not null, note: "발주서 ID"]
  invoice_id integer [ref: > invoices.id, note: "청구서 ID"]
  item_receipt_id integer [ref: > item_receipts.id, note: "수령 확인 ID"]
  action verification_action [not null, note: "작업 ENUM"]
  details text [note: "상세 내용"]
  performed_by varchar [not null, ref: > users.id, note: "수행자 (FK 추가)"]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`, note: "추가된 컬럼"]
  
  note: "검증 로그 테이블 (ENUM 타입, FK 제약, updated_at 추가)"
}

// ENUM 타입 정의
Enum user_role {
  user
  admin
  order_manager
}

Enum purchase_order_status {
  pending
  approved
  sent
  completed
}

Enum invoice_status {
  pending
  verified
  paid
}

Enum item_receipt_status {
  pending
  approved
  rejected
}

Enum verification_action {
  invoice_uploaded
  item_verified
  quality_checked
}

// 관계 설정 (Relationships)
Ref: users.position_id > positions.id
Ref: projects.project_manager_id > users.id
Ref: projects.order_manager_id > users.id
Ref: project_members.project_id > projects.id
Ref: project_members.user_id > users.id
Ref: project_members.assigned_by > users.id
Ref: project_history.project_id > projects.id
Ref: project_history.changed_by > users.id
Ref: template_fields.template_id > order_templates.id
Ref: handsontable_configs.template_id > order_templates.id
Ref: template_versions.template_id > order_templates.id
Ref: purchase_orders.project_id > projects.id
Ref: purchase_orders.vendor_id > vendors.id
Ref: purchase_orders.user_id > users.id
Ref: purchase_orders.template_id > order_templates.id
Ref: purchase_orders.approved_by > users.id
Ref: purchase_order_items.order_id > purchase_orders.id
Ref: purchase_order_items.item_id > items.id
Ref: attachments.order_id > purchase_orders.id
Ref: order_history.order_id > purchase_orders.id
Ref: order_history.user_id > users.id
Ref: invoices.order_id > purchase_orders.id
Ref: invoices.uploaded_by > users.id
Ref: invoices.verified_by > users.id
Ref: invoices.tax_invoice_issued_by > users.id
Ref: item_receipts.order_item_id > purchase_order_items.id
Ref: item_receipts.invoice_id > invoices.id
Ref: item_receipts.verified_by > users.id
Ref: verification_logs.order_id > purchase_orders.id
Ref: verification_logs.invoice_id > invoices.id
Ref: verification_logs.item_receipt_id > item_receipts.id
Ref: verification_logs.performed_by > users.id
```

## 주요 개선사항

### 1. ENUM 타입 적용
- `user_role`: 사용자 역할 타입 안전성
- `purchase_order_status`: 발주서 상태 표준화
- `invoice_status`: 청구서 상태 관리
- `item_receipt_status`: 수령 상태 체계화
- `verification_action`: 검증 작업 타입 안전성

### 2. 외래키 제약 조건 강화
- `invoices.uploaded_by/verified_by/tax_invoice_issued_by` → `users.id`
- `item_receipts.verified_by` → `users.id`
- `verification_logs.performed_by` → `users.id`

### 3. NOT NULL 제약 조건 추가
- `users.name, phone_number`
- `vendors.contact, contact_person`
- 핵심 비즈니스 데이터 무결성 보장

### 4. 유니크 제약 조건 추가
- `vendors.email`: 이메일 중복 방지
- `project_members(project_id, user_id)`: 중복 팀원 배정 방지

### 5. 타임스탬프 컬럼 표준화
- 모든 테이블에 `created_at`, `updated_at` 기본값 설정
- 감사 추적 개선

### 6. UI 정렬 필드 추가
- `handsontable_configs.sort_order`: 스프레드시트 정렬

이 개선된 스키마는 데이터 무결성, 타입 안전성, 유지보수성을 크게 향상시킵니다.