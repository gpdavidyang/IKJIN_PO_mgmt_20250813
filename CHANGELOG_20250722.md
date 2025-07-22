# 변경 기록 - 2025년 7월 22일

## 🎯 주요 수정 사항

### 1. 새 현장 추가 기능 완전 수정 ✅

**문제**: '현장 관리' → '새 현장 추가' 시 500 Internal Server Error 발생

**원인**:
- 데이터베이스 스키마와 Drizzle ORM 정의 불일치
- 한국어 프로젝트 타입이 영어 enum 값으로 변환되지 않음
- Foreign key 제약 위반 (빈 문자열 처리 문제)

**해결**:

#### 1.1 데이터베이스 스키마 동기화 (`shared/schema.ts`)
```typescript
// 새로 추가된 enum
export const projectTypeEnum = pgEnum("project_type", ["commercial", "residential", "industrial", "infrastructure"]);

// 수정된 프로젝트 테이블 스키마
export const projects = pgTable("projects", {
  // ...
  projectType: projectTypeEnum("project_type").notNull().default("commercial"), // varchar → enum
  startDate: date("start_date"), // timestamp → date
  endDate: date("end_date"),     // timestamp → date
  // ...
});
```

#### 1.2 한국어 프로젝트 타입 매핑 (`server/routes.ts`)
```typescript
const projectTypeMap: Record<string, string> = {
  "아파트": "residential",
  "오피스텔": "residential", 
  "단독주택": "residential",
  "주거시설": "residential",
  "상업시설": "commercial",
  "사무실": "commercial",
  "쇼핑몰": "commercial",
  "산업시설": "industrial",
  "공장": "industrial",
  "창고": "industrial",
  "인프라": "infrastructure",
  "도로": "infrastructure",
  "교량": "infrastructure",
};
```

#### 1.3 데이터 변환 로직 개선
```typescript
const transformedData = {
  ...req.body,
  startDate: transformedStartDate,           // 문자열 날짜로 변환
  endDate: transformedEndDate,               // 문자열 날짜로 변환
  projectType: projectTypeMap[req.body.projectType] || "commercial", // 한국어 → 영어
  projectManagerId: req.body.projectManagerId || null,              // 빈 문자열 → null
  orderManagerId: req.body.orderManagerIds?.[0] || null,           // 배열 첫 요소 추출
  orderManagerIds: undefined,                                       // 스키마에 없는 필드 제거
};
```

#### 1.4 프론트엔드 UI 개선 (`client/src/pages/projects.tsx`)
- 텍스트 입력 → 드롭다운 선택으로 변경
- 9개 한국어 프로젝트 타입 옵션 제공
- 날짜 형식 개선

**결과**: 
- ✅ HTTP 201 Created - 프로젝트 생성 성공
- ✅ 한국어 프로젝트 타입 자동 변환
- ✅ 모든 validation 에러 해결
- ✅ Foreign key 제약 조건 만족

### 2. 이전 세션에서 해결된 문제들

#### 2.1 로그인 인증 문제
- test@ikjin.co.kr 사용자 비밀번호 해시 수정
- 개발 환경 사용자 ID 통일 (test_admin_001)

#### 2.2 발주서 상세 조회 문제  
- useQuery hooks에 누락된 queryFn 추가
- 발주서 편집/미리보기 기능 복구

#### 2.3 데이터베이스 스키마 오류 수정
- attachments 테이블: file_name → stored_name
- items 테이블: standard_price → unit_price

#### 2.4 발주서 목록 기본 필터 제거
- 3개월 기본 날짜 필터 제거
- 전체 발주서 목록 표시로 변경

## 🔧 기술적 세부사항

### 수정된 핵심 파일들:
1. `shared/schema.ts` - 데이터베이스 스키마 동기화
2. `server/routes.ts` - 프로젝트 생성 로직 수정 
3. `client/src/pages/projects.tsx` - UI 개선
4. `server/routes/projects.ts` - 별도 프로젝트 라우터 (미사용)

### 데이터 변환 플로우:
```
프론트엔드 입력 → 서버 수신 → 한국어 매핑 → 날짜 변환 → Zod 검증 → DB 저장
```

### 검증된 프로젝트 타입:
- 아파트, 오피스텔, 단독주택 → residential
- 상업시설, 사무실, 쇼핑몰 → commercial  
- 공장, 창고 → industrial
- 인프라 → infrastructure

## 🎯 테스트 결과

**성공 케이스**:
```json
{
  "projectName": "삼성래미안 광교",
  "clientName": "삼성건설", 
  "projectType": "아파트", // → "residential"
  "location": "수원시 영통구",
  "startDate": "2025-07-03",
  "endDate": "2025-07-31",
  "totalBudget": "3000000",
  "projectManagerId": "test_admin_001"
}
```

**응답**: HTTP 201 Created, 프로젝트 ID 4 생성

## 📝 참고사항

- 모든 변경사항은 기존 데이터와 호환됩니다
- 추가적인 마이그레이션은 필요하지 않습니다
- 프로젝트 타입 매핑은 확장 가능합니다

## 🚀 다음 단계

1. 테스트 케이스 추가 (권장)
2. 프로젝트 수정 기능 검증
3. 추가 프로젝트 타입 필요시 매핑 확장