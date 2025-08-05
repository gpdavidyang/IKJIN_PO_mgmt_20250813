# UI 표준화 문서 (Version 4.0)
Purchase Order Management System - 전문적인 UI/UX 디자인 시스템

## 최신 업데이트
- 2025-08-06: **폰트 크기, 여백, 버튼 일관성 표준화** - 시각적 일관성 문제 해결
- 2025-08-06: 전문적인 UI/UX 원칙 대폭 강화
- 최대 너비 1366px 제한 및 레이아웃 표준화
- 시각적 계층 구조 및 일관된 디자인 패턴 추가
- 2025-08-05: 통합 워크플로우 UI/UX 가이드라인 추가

## 핵심 UI/UX 원칙

### 0. **UI 일관성 표준 (CRITICAL)** 🔥
#### 폰트 크기 표준화
- **페이지 제목**: `text-2xl font-bold` (24px) - 모든 페이지 동일
- **페이지 설명**: `text-sm text-gray-600` (14px) - 모든 페이지 동일  
- **테이블 헤더**: `text-xs font-medium text-gray-500 uppercase` (12px)
- **테이블 데이터**: `text-sm text-gray-900` (14px) - **모든 테이블 동일**
- **버튼 텍스트**: `text-sm font-medium` (14px)

#### 여백 표준화
- **페이지 컨테이너**: `p-6` (24px) - 모든 페이지 동일
- **제목-설명 간격**: `mb-2` (8px) - 모든 페이지 동일
- **설명-검색영역 간격**: `mb-6` (24px) - **모든 페이지 동일** 
- **검색영역-테이블 간격**: `mb-6` (24px) - **모든 페이지 동일**
- **테이블 행 높이**: `py-4` (16px 상하) - **모든 테이블 동일**
- **테이블 셀 패딩**: `px-6 py-4` (24px 좌우, 16px 상하) - **모든 테이블 동일**

#### 버튼 표준화
- **주요 액션 버튼**: `px-4 py-2 text-sm font-medium` - 위치 우측 상단 일관
- **버튼 텍스트 형식**: "{항목명} 추가" (예: "발주서 추가", "현장 추가", "거래처 추가")
- **아이콘 버튼**: `h-8 w-8 p-0` - 액션 버튼 크기 통일
- **버튼 간격**: `gap-2` - 액션 버튼 간 간격 통일

#### 검색창 표준화
- **플레이스홀더 형식**: "{주요필드1}, {주요필드2}로 검색..." (최대 2개)
- **검색창 높이**: `h-10` (40px) - 모든 페이지 동일

### 1. 레이아웃 & 공간 활용
- **최대 너비 제한**: 1366px (`max-w-[1366px]`) - 대형 모니터에서도 최적의 가독성 유지
- **일관된 여백**: 카드 간 6px (`space-y-6`), 카드 내부 `p-4` 또는 `p-6` 표준화
- **반응형 그리드**: 모바일부터 데스크톱까지 유연하게 대응
- **메인 컨테이너**: `<div className="max-w-[1366px] mx-auto p-6">`

### 2. 색상 체계
- **주요 색상**: 파란색 계열 (#3B82F6, #2563EB, #1E40AF)
- **배경 계층화**:
  - 메인 배경: `bg-gray-50`
  - 카드 배경: `bg-white`
  - 강조 영역: `bg-blue-50`
- **상태별 색상 코딩**: 일관된 상태 표시 색상 사용

### 3. 시각적 계층 구조
```tsx
// 제목 계층
<h1 className="text-2xl font-bold">     // 페이지 제목
<h2 className="text-xl font-semibold">  // 섹션 제목
<h3 className="text-lg font-medium">    // 카드 제목
<p className="text-sm">                 // 본문
<span className="text-xs">              // 작은 텍스트
```

### 4. 그림자 효과
- **카드**: `shadow-sm` - 부드러운 그림자로 깊이감 표현
- **버튼**: `shadow-sm` - 미세한 그림자로 클릭 가능함 표시
- **호버**: `hover:shadow-md` - 인터랙션 시 그림자 강화

### 5. 둥근 모서리
- **카드**: `rounded-lg` (8px)
- **버튼**: `rounded-md` (6px)
- **입력 필드**: `rounded-md` (6px)
- **배지**: `rounded-full` (완전 둥글게)

### 6. 아이콘 사용 원칙
- **크기**: 주요 아이콘 `w-5 h-5`, 보조 아이콘 `w-4 h-4`
- **색상**: 텍스트와 동일하거나 약간 연한 색상
- **위치**: 텍스트 왼쪽에 배치, `gap-2` 간격

### 7. 호버 효과
```tsx
// 일관된 호버 상태
className="hover:bg-gray-50 transition-colors"  // 테이블 행
className="hover:text-blue-700"                 // 링크
className="hover:bg-blue-700"                   // 버튼
className="text-gray-400 hover:text-blue-600"   // 아이콘 버튼
```

### 8. 타이포그래피
- **본문**: `text-sm` (14px) - 대부분의 콘텐츠
- **작은 텍스트**: `text-xs` (12px) - 라벨, 보조 정보
- **제목**: `font-bold` 또는 `font-semibold`
- **줄 간격**: 적절한 `leading-relaxed` 사용

### 9. 상태 표시
```tsx
// 배지 스타일 (일관된 패턴)
<Badge className="bg-[color]-100 text-[color]-800 border border-[color]-200">
```

### 10. 로딩 상태
- **스켈레톤 로더**: 콘텐츠 로딩 시
- **스피너**: `animate-spin` 애니메이션
- **진행률 표시**: 장시간 작업 시

### 11. 데이터 표시 원칙
- **숫자**: 천 단위 콤마 (`toLocaleString('ko-KR')`)
- **통화**: `₩` 기호 + 천 단위 콤마
- **날짜**: 한국식 표기 (YYYY. MM. DD)
- **빈 값**: "-" 또는 "없음" 표시

### 12. 인터랙션 피드백
- **즉각적인 시각적 피드백**: 클릭, 호버 시
- **토스트 메시지**: 작업 결과 알림
- **진행 상태 표시**: 실시간 업데이트

### 13. 접근성 고려사항
- **포커스 표시**: `focus:ring-2 focus:ring-blue-500`
- **적절한 대비율**: WCAG 기준 준수
- **키보드 네비게이션**: 모든 인터랙티브 요소 접근 가능

### 14. 폼 디자인
```tsx
// 일관된 입력 필드 스타일
<Input className="h-10 text-sm border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
```

### 15. 테이블 디자인 (표준화됨)
```tsx
// 표준화된 테이블 스타일 - 모든 테이블에 적용
<table className="w-full">
  <thead className="bg-gray-50 border-b border-gray-200">
    <tr>
      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        <button className="flex items-center gap-1 hover:text-gray-700">
          헤더
          <ChevronsUpDown className="h-3 w-3" />
        </button>
      </th>
    </tr>
  </thead>
  <tbody className="bg-white divide-y divide-gray-200">
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        내용
      </td>
    </tr>
  </tbody>
</table>
```

#### 테이블 표준 요구사항 (CRITICAL)
- **행 높이**: 모든 테이블 `py-4` (16px 상하) 통일
- **셀 패딩**: 모든 테이블 `px-6 py-4` (24px 좌우, 16px 상하) 통일  
- **데이터 폰트**: 모든 테이블 `text-sm text-gray-900` (14px) 통일
- **헤더 폰트**: 모든 테이블 `text-xs font-medium text-gray-500 uppercase` 통일
- **호버 효과**: 모든 테이블 `hover:bg-gray-50 transition-colors` 통일

## 1. 컬러 시스템

### Design Token 기반 컬러 팔레트

#### Primary Brand Colors (파란색 계열)
```css
--color-primary-50: #eff6ff;    /* 가장 연한 파란색 - 배경 */
--color-primary-100: #dbeafe;   /* 연한 파란색 - 호버 배경 */
--color-primary-200: #bfdbfe;   /* 라이트 블루 - 선택된 배경 */
--color-primary-300: #93c5fd;   /* 중간 파란색 - 보조 */
--color-primary-400: #60a5fa;   /* 밝은 파란색 - 강조 */
--color-primary-500: #3b82f6;   /* 메인 파란색 - 주요 액션 */
--color-primary-600: #2563eb;   /* 진한 파란색 - 호버 */
--color-primary-700: #1d4ed8;   /* 더 진한 파란색 - 액티브 */
--color-primary-800: #1e40af;   /* 다크 블루 - 텍스트 */
--color-primary-900: #1e3a8a;   /* 가장 진한 파란색 */
```

#### Semantic Colors
```css
/* Success (성공) */
--color-success-50: #f0fdf4;
--color-success-100: #dcfce7;
--color-success-500: #22c55e;
--color-success-600: #16a34a;

/* Warning (경고) */
--color-warning-50: #fffbeb;
--color-warning-100: #fef3c7;
--color-warning-500: #f59e0b;
--color-warning-600: #d97706;

/* Error (오류) */
--color-error-50: #fef2f2;
--color-error-100: #fee2e2;
--color-error-500: #ef4444;
--color-error-600: #dc2626;
```

#### Neutral Grays
```css
--color-gray-25: #fcfcfd;   /* 거의 흰색 */
--color-gray-50: #f9fafb;   /* 페이지 배경 */
--color-gray-100: #f3f4f6;  /* 카드 배경 */
--color-gray-200: #e5e7eb;  /* 테두리 */
--color-gray-300: #d1d5db;  /* 비활성 테두리 */
--color-gray-400: #9ca3af;  /* 비활성 텍스트 */
--color-gray-500: #6b7280;  /* 보조 텍스트 */
--color-gray-600: #4b5563;  /* 본문 텍스트 */
--color-gray-700: #374151;  /* 제목 텍스트 */
--color-gray-800: #1f2937;  /* 강조 텍스트 */
--color-gray-900: #111827;  /* 가장 진한 텍스트 */
```

### Status Color Mapping
| 상태 | 배경 | 텍스트 | 테두리 | 사용처 |
|------|------|--------|--------|--------|
| Draft (임시저장) | `gray-100` | `gray-800` | `gray-200` | 초안 상태 |
| Pending (대기중) | `yellow-100` | `yellow-800` | `yellow-200` | 승인 대기 |
| Approved (승인됨) | `green-100` | `green-800` | `green-200` | 승인 완료 |
| Sent (발송됨) | `blue-100` | `blue-800` | `blue-200` | 발송 완료 |
| Completed (완료) | `purple-100` | `purple-800` | `purple-200` | 최종 완료 |
| Rejected (반려) | `red-100` | `red-800` | `red-200` | 반려/취소 |

### Filter Tag Colors
- **Project**: `bg-purple-100 text-purple-800 border-purple-200`
- **Amount**: `bg-emerald-100 text-emerald-800 border-emerald-200`
- **Date**: `bg-blue-100 text-blue-800 border-blue-200`
- **Vendor**: `bg-orange-100 text-orange-800 border-orange-200`

### Background & Text
- **Background**: `bg-white` (카드 배경)
- **Secondary Background**: `bg-gray-50` (페이지 배경)
- **Text Primary**: `text-gray-900`
- **Text Secondary**: `text-gray-600`
- **Text Muted**: `text-gray-400`
- **Border**: `border-gray-200`

## 2. 타이포그래피 시스템

### Typography Scale
```css
/* Font Sizes */
--text-xs: 0.75rem;     /* 12px - 캡션, 작은 라벨 */
--text-sm: 0.875rem;    /* 14px - 보조 텍스트 */
--text-base: 1rem;      /* 16px - 본문 */
--text-lg: 1.125rem;    /* 18px - 서브 헤딩 */
--text-xl: 1.25rem;     /* 20px - 헤딩 */
--text-2xl: 1.5rem;     /* 24px - 페이지 타이틀 */
--text-3xl: 1.875rem;   /* 30px - 대형 타이틀 */

/* Line Heights */
--leading-none: 1;
--leading-tight: 1.25;
--leading-snug: 1.375;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
--leading-loose: 2;
```

### Font Weight System
| Weight | CSS Class | 사용처 |
|--------|-----------|--------|
| Light (300) | `font-light` | 대형 디스플레이 텍스트 |
| Normal (400) | `font-normal` | 본문 텍스트 |
| Medium (500) | `font-medium` | 버튼, 라벨 |
| Semibold (600) | `font-semibold` | 서브 헤딩, 강조 |
| Bold (700) | `font-bold` | 헤딩, 중요 정보 |

### Typography Components
```typescript
/* Heading Styles */
H1: "text-3xl font-bold tracking-tight text-gray-900"
H2: "text-2xl font-semibold tracking-tight text-gray-900"
H3: "text-xl font-semibold text-gray-900"
H4: "text-lg font-semibold text-gray-900"

/* Body Styles */
Body: "text-base text-gray-700 leading-relaxed"
Small: "text-sm text-gray-600"
Caption: "text-xs text-gray-500"
```

## 3. 금액 표시 표준

### 한국 원화 포맷팅
- **Format Function**: `formatKoreanWon(amount)` - ₩ 기호, 천 단위 구분자, 소수점 제거
- **Parse Function**: `parseKoreanWon(formattedAmount)` - 포맷된 금액을 숫자로 변환
- **Number Format**: `formatNumber(amount)` - 천 단위 구분자만 적용 (통화 기호 없음)

### 적용 기준
- **모든 금액 필드**: 총 예산, 발주 금액, 품목 가격, 송장 금액 등
- **표시 형식**: ₩12,345,000 (소수점 없음)
- **입력 필드**: 실시간 포맷팅 적용으로 사용자 편의성 향상
- **데이터 저장**: 숫자 형태로 저장, 표시할 때만 포맷팅 적용

### 예시
```javascript
// 표시용
formatKoreanWon(12345000) → "₩12,345,000"
formatKoreanWon("12345000") → "₩12,345,000"
formatKoreanWon(null) → "₩0"

// 파싱용
parseKoreanWon("₩12,345,000") → 12345000
parseKoreanWon("12,345,000") → 12345000

// 숫자만 포맷팅
formatNumber(12345000) → "12,345,000"
```

### 색상 강조
- **금액 텍스트**: `text-blue-600` - 파란색으로 금액 강조 표시
- **중요 금액**: `font-semibold text-blue-600` - 굵은 파란색으로 강조

## 4. 레이아웃 & 스페이싱 시스템

### Spacing Scale
```css
/* Spacing Tokens */
--space-0: 0;           /* 0px */
--space-1: 0.25rem;     /* 4px */
--space-2: 0.5rem;      /* 8px */
--space-3: 0.75rem;     /* 12px */
--space-4: 1rem;        /* 16px */
--space-5: 1.25rem;     /* 20px */
--space-6: 1.5rem;      /* 24px */
--space-8: 2rem;        /* 32px */
--space-10: 2.5rem;     /* 40px */
--space-12: 3rem;       /* 48px */
--space-16: 4rem;       /* 64px */
--space-20: 5rem;       /* 80px */
```

### Container System
```css
/* Container Widths */
--container-xs: 20rem;    /* 320px */
--container-sm: 24rem;    /* 384px */
--container-md: 28rem;    /* 448px */
--container-lg: 32rem;    /* 512px */
--container-xl: 36rem;    /* 576px */
--container-2xl: 42rem;   /* 672px */
--container-3xl: 48rem;   /* 768px */
--container-4xl: 56rem;   /* 896px */
--container-5xl: 64rem;   /* 1024px */
--container-6xl: 72rem;   /* 1152px */
--container-7xl: 80rem;   /* 1280px */
```

### Layout Patterns
| Component | Spacing | 설명 |
|-----------|---------|------|
| Page Container | `p-6 space-y-6` | 페이지 메인 컨테이너 |
| Card | `p-4` | 카드 내부 패딩 |
| Section | `space-y-6` | 섹션 간 간격 |
| Form Fields | `space-y-4` | 폼 필드 간격 |
| Inline Elements | `space-x-2` | 인라인 요소 간격 |

### Component Dimensions
```css
/* Heights */
--h-8: 2rem;    /* 32px - 작은 버튼 */
--h-9: 2.25rem; /* 36px - 컴팩트 입력 */
--h-10: 2.5rem; /* 40px - 기본 입력/버튼 */
--h-11: 2.75rem;/* 44px - 큰 입력 */
--h-12: 3rem;   /* 48px - 특대 버튼 */

/* Border Radius */
--radius-sm: 0.125rem;    /* 2px */
--radius-md: 0.375rem;    /* 6px - 기본 */
--radius-lg: 0.5rem;      /* 8px */
--radius-xl: 0.75rem;     /* 12px */
--radius-2xl: 1rem;       /* 16px */
--radius-full: 9999px;    /* 완전한 원 */
```

### Shadow System
```css
/* Box Shadows */
--shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
--shadow-inner: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
--shadow-none: none;
```

## 4. 컴포넌트 패턴

### Card Structure
```typescript
<Card>
  <CardContent className="p-4">
    // 내용
  </CardContent>
</Card>
```

### Filter Section Pattern
```typescript
// Always Visible Section
<div className="space-y-4 mb-4">
  <div className="flex flex-col lg:flex-row lg:items-end gap-4">
    // 검색 + 주요 필터
  </div>
</div>

// Collapsible Section
{isFilterExpanded && (
  <div className="border-t pt-4">
    // 상세 필터들
  </div>
)}
```

### Input Field Active State
```typescript
className={`h-10 ${value ? "border-blue-500 bg-blue-50" : ""}`}
```

### Button Patterns
- **Primary**: `Button` (기본 스타일)
- **Secondary**: `Button variant="outline"`
- **Small**: `Button size="sm" className="h-8 text-sm"`

### Badge Pattern (Status)
```typescript
<Badge className={getStatusColor(status)}>
  {getStatusText(status)}
</Badge>
```

### Filter Tag Pattern
```typescript
<span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800 border border-purple-200">
  라벨: 값
  <button onClick={clearFilter} className="ml-2 hover:bg-purple-200 rounded-full w-4 h-4 flex items-center justify-center text-purple-600">
    ×
  </button>
</span>
```

### View Toggle Pattern (표준화됨)
```typescript
// 검색 섹션에 뷰 전환 버튼 추가 - 아이콘 전용 디자인
<div className="flex items-center gap-2">
  <span className="text-sm text-gray-600">{totalCount}개 항목</span>
  <div className="flex items-center bg-gray-100 rounded-lg p-1">
    <Button
      variant={viewMode === "table" ? "default" : "ghost"}
      size="sm"
      onClick={() => setViewMode("table")}
      className="h-8 w-8 p-0"
      title="목록 보기"
    >
      <List className="h-4 w-4" />
    </Button>
    <Button
      variant={viewMode === "cards" ? "default" : "ghost"}
      size="sm"
      onClick={() => setViewMode("cards")}
      className="h-8 w-8 p-0"
      title="카드 보기"
    >
      <Grid className="h-4 w-4" />
    </Button>
  </div>
</div>
```

### 카드 뷰 표준 (프로젝트 카드 기준)

#### 기본 구조
- 카드 컨테이너: `Card` 컴포넌트에 `p-4 hover:shadow-md transition-shadow` 클래스
- CardHeader/CardContent 대신 직접 div 구조 사용

#### 헤더 섹션
```typescript
<div className="flex items-start justify-between mb-3">
  <div className="flex items-center space-x-3">
    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
      {/* 엔티티별 아이콘 */}
    </div>
    <div>
      <h3 className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600" 
          onClick={() => navigate(`/path/${item.id}`)}>
        {item.name}
      </h3>
      {/* 선택적 배지 */}
    </div>
  </div>
  {/* 우측 상태 배지 */}
</div>
```

#### 콘텐츠 섹션
```typescript
<div className="space-y-2 mb-3">
  <div className="flex items-center text-sm text-gray-600">
    <span className="font-medium">라벨:</span>
    <span className="ml-2">값</span>
  </div>
  {/* 추가 정보 행들 */}
</div>
```

#### 푸터 섹션
```typescript
<div className="flex items-center justify-between text-xs text-gray-500 mb-3">
  <span>등록일: {formatDate(item.createdAt)}</span>
</div>

{/* 관리자 액션 버튼 (아이콘 전용) */}
{user?.role === "admin" && (
  <div className="flex items-center justify-end gap-2 pt-2 border-t">
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
      title="수정"
    >
      <Edit className="h-3 w-3" />
    </Button>
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
      title="삭제"
    >
      <Trash2 className="h-3 w-3" />
    </Button>
  </div>
)}
```

#### 카드 디자인 원칙
1. **일관된 제목 아이콘**: 모든 카드는 10x10 크기의 원형 아이콘 배경 사용
   - 프로젝트: FolderOpen 아이콘
   - 벤더: Building 아이콘  
   - 아이템: Package 아이콘
2. **섹션 헤더 아이콘**: 모든 정보 라벨 앞에 h-4 w-4 크기의 컨텍스트 아이콘
   - 프로젝트: Building2 (고객사), MapPin (위치), DollarSign (예산), Calendar (날짜)
   - 벤더: Hash (사업자번호), User (담당자), Phone (전화번호)
   - 아이템: Ruler (규격), Scale (단위), DollarSign (단가)
3. **제목 클릭 가능**: 모든 제목은 상세 페이지로 이동하는 클릭 가능한 링크
4. **라벨-값 구조**: `gap-2` 간격으로 아이콘 + 라벨 + 값 배치
5. **일관된 간격**: mb-3를 사용한 섹션 간 간격
6. **호버 효과**: shadow-md transition-shadow로 인터랙션 피드백
7. **액션 버튼**: -space-x-1으로 아이콘 겹침 효과, hover:bg-blue-50/red-50 배경

## 5. 반응형 브레이크포인트

### Tailwind Breakpoints (iPad 기준)
- **Mobile**: `기본` (0px~)
- **Small Mobile**: `sm:` (640px~)
- **Tablet**: `md:` (768px~)
- **Large Tablet**: `lg:` (1024px~)
- **iPad Pro (기준점)**: `xl:` (1386px~)
- **Desktop**: `2xl:` (1536px~)
- **Large Desktop**: `3xl:` (1920px~)

### 반응형 패턴 (iPad 기준 최적화)
- **Flex Direction**: `flex-col md:flex-row xl:flex-row`
- **Grid Columns**: 
  - 모바일: `grid-cols-1`
  - 태블릿: `md:grid-cols-2`
  - iPad Pro: `xl:grid-cols-3`
  - 데스크톱: `2xl:grid-cols-4`
- **Container Width**:
  - 기본: `w-full`
  - iPad Pro: `xl:max-w-[1386px] xl:mx-auto`
  - 데스크톱: `2xl:max-w-7xl`
- **Sidebar Layout**:
  - 모바일/태블릿: 숨김 (햄버거 메뉴)
  - iPad Pro 이상: `xl:w-64` (고정 사이드바)
- **주요 컨텐츠 영역**:
  - iPad Pro: `xl:ml-64` (사이드바 고려)
  - 패딩: `px-4 md:px-6 xl:px-8`

## 6. 상태 처리

### Loading States
- **Button Loading**: `disabled` 상태 + 로딩 인디케이터
- **Data Loading**: Skeleton 컴포넌트 또는 로딩 스피너

### Error States
- **Toast Notifications**: `useToast` 훅 사용
- **Destructive Variant**: `variant="destructive"`

### Empty States
- **No Data**: 적절한 메시지와 액션 버튼 제공

## 7. 아이콘 사용

### Lucide Icons 사용
- **Search**: `Search` (검색)
- **Plus**: `Plus` (추가)
- **Filter**: `Filter` (필터)
- **ChevronUp/Down**: `ChevronUp`, `ChevronDown` (확장/축소)
- **Eye**: `Eye` (보기)
- **Edit**: `Edit` (편집)
- **Trash2**: `Trash2` (삭제)
- **Download**: `Download` (다운로드)

### 아이콘 크기
- **Small**: `h-4 w-4` (16px)
- **Medium**: `h-5 w-5` (20px)

## 8. 테이블 스타일

### Column Widths
```typescript
const columns = [
  { key: 'orderNumber', label: '발주번호', width: 'w-32 min-w-[8rem]' },
  { key: 'project', label: '프로젝트', width: 'w-40 min-w-[10rem]' },
  { key: 'vendor', label: '거래처', width: 'w-32 min-w-[8rem]' },
  // ...
];
```

### Table Structure
- **Headers**: 정렬 가능, 클릭 시 화살표 표시
- **Cells**: 적절한 패딩과 정렬
- **Row Hover**: 마우스 오버 시 배경색 변경

## 9. 유틸리티 함수

### 숫자 포맷팅
```typescript
const formatKoreanWon = (amount: string | number) => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '₩0';
  return `₩${numAmount.toLocaleString('ko-KR')}`;
};
```

### 텍스트 줄임
```typescript
const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
```

## 10. 접근성

### 키보드 네비게이션
- **Tab Order**: 논리적 순서
- **Enter Key**: 검색 필드에서 검색 실행
- **Escape Key**: 모달/드롭다운 닫기

### ARIA 속성
- **title**: 버튼과 입력 필드에 툴팁 제공
- **placeholder**: 입력 필드 가이드

## 11. 구현 가이드라인

### CSS 변수 사용법
```css
/* 색상 사용 예시 */
.primary-button {
  background-color: var(--color-primary-500);
  color: white;
}

.primary-button:hover {
  background-color: var(--color-primary-600);
}

/* 간격 사용 예시 */
.card {
  padding: var(--space-4);
  margin-bottom: var(--space-6);
}

/* 그림자 사용 예시 */
.card:hover {
  box-shadow: var(--shadow-lg);
}
```

### Tailwind CSS 통합
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          // ... 나머지 색상
        }
      },
      spacing: {
        '18': 'var(--space-18)',
        '22': 'var(--space-22)',
      }
    }
  }
}
```

### 마이그레이션 전략
1. **Phase 1**: 새로운 디자인 토큰 시스템 도입
2. **Phase 2**: 핵심 컴포넌트 리팩토링
3. **Phase 3**: 페이지별 점진적 업데이트
4. **Phase 4**: 구 시스템 제거 및 최종 검증

## 12. 통합 워크플로우 UI 패턴

### 12.1 워크플로우 진행 상황 표시

#### 5단계 프로세스 표시기
```tsx
interface WorkflowStep {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'current' | 'completed' | 'error';
}

// 통합 워크플로우 단계
const workflowSteps: WorkflowStep[] = [
  { id: 'select', title: '방식 선택', description: '표준/엑셀 선택' },
  { id: 'create', title: '발주서 작성', description: '데이터 입력' },
  { id: 'approve', title: '승인 처리', description: '선택적' },
  { id: 'process', title: '후처리', description: 'PDF/이메일' },
  { id: 'complete', title: '완료', description: '결과 확인' }
];
```

#### 진행 상황 표시 스타일
```css
/* 워크플로우 진행 상황 표시기 */
.workflow-progress {
  --progress-inactive: var(--color-gray-200);
  --progress-active: var(--color-primary-500);
  --progress-complete: var(--color-success-500);
  --progress-error: var(--color-error-500);
}

.workflow-step {
  @apply flex items-center space-x-3 p-4 rounded-lg transition-all duration-200;
}

.workflow-step.pending {
  @apply bg-gray-50 text-gray-500;
}

.workflow-step.current {
  @apply bg-blue-50 text-blue-700 font-semibold shadow-sm;
}

.workflow-step.completed {
  @apply bg-green-50 text-green-700;
}

.workflow-step.error {
  @apply bg-red-50 text-red-700;
}
```

### 12.2 공통 후처리 파이프라인 UI

#### 처리 단계 카드 컴포넌트
```tsx
interface ProcessingStep {
  title: string;
  description: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  progress?: number;
  actions?: ReactNode;
  details?: string[];
}

// 후처리 단계 스타일
.processing-step-card {
  @apply bg-white rounded-lg border border-gray-200 p-6 transition-all;
  
  &.processing {
    @apply border-blue-400 shadow-md;
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  
  &.completed {
    @apply border-green-400 bg-green-50;
  }
  
  &.error {
    @apply border-red-400 bg-red-50;
  }
}
```

### 12.3 통합 액션 버튼 패턴

#### 워크플로우 액션 버튼
```css
/* 주요 액션 버튼 (다음 단계) */
.workflow-action-primary {
  @apply px-6 py-3 bg-primary-600 text-white font-medium rounded-lg;
  @apply hover:bg-primary-700 active:bg-primary-800;
  @apply transition-all duration-200;
  @apply disabled:bg-gray-300 disabled:cursor-not-allowed;
}

/* 보조 액션 버튼 (이전, 취소) */
.workflow-action-secondary {
  @apply px-6 py-3 bg-white text-gray-700 font-medium rounded-lg;
  @apply border border-gray-300;
  @apply hover:bg-gray-50 active:bg-gray-100;
  @apply transition-all duration-200;
}

/* 위험 액션 버튼 (삭제, 취소) */
.workflow-action-danger {
  @apply px-6 py-3 bg-error-600 text-white font-medium rounded-lg;
  @apply hover:bg-error-700 active:bg-error-800;
  @apply transition-all duration-200;
}
```

### 12.4 상태별 알림 메시지

#### 통합 알림 스타일
```css
.workflow-alert {
  @apply p-4 rounded-lg flex items-start space-x-3;
  
  &.info {
    @apply bg-blue-50 text-blue-800 border border-blue-200;
  }
  
  &.success {
    @apply bg-green-50 text-green-800 border border-green-200;
  }
  
  &.warning {
    @apply bg-yellow-50 text-yellow-800 border border-yellow-200;
  }
  
  &.error {
    @apply bg-red-50 text-red-800 border border-red-200;
  }
}
```

### 12.5 반응형 워크플로우 레이아웃

#### 브레이크포인트별 레이아웃
```css
/* 데스크톱 (1200px+) */
@media (min-width: 1200px) {
  .workflow-container {
    @apply grid grid-cols-12 gap-6;
  }
  
  .workflow-sidebar {
    @apply col-span-3;
  }
  
  .workflow-main {
    @apply col-span-6;
  }
  
  .workflow-aside {
    @apply col-span-3;
  }
}

/* 태블릿 (768px-1199px) */
@media (min-width: 768px) and (max-width: 1199px) {
  .workflow-container {
    @apply grid grid-cols-8 gap-4;
  }
  
  .workflow-sidebar {
    @apply col-span-2;
  }
  
  .workflow-main {
    @apply col-span-6;
  }
}

/* 모바일 (767px 이하) */
@media (max-width: 767px) {
  .workflow-container {
    @apply block space-y-4;
  }
  
  .workflow-progress {
    @apply overflow-x-auto pb-2;
  }
}
```

### 12.6 애니메이션 및 트랜지션

#### 워크플로우 전환 효과
```css
/* 단계 전환 애니메이션 */
@keyframes slideInFromRight {
  from {
    transform: translateX(1rem);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.workflow-step-enter {
  animation: slideInFromRight 0.3s ease-out;
}

.workflow-step-exit {
  animation: fadeIn 0.2s ease-out reverse;
}

/* 프로그레스 바 애니메이션 */
.workflow-progress-bar {
  @apply h-2 bg-primary-600 rounded-full;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
```

## 13. 페이지별 표준 템플릿 (신규 추가)

### 13.1 관리 페이지 표준 템플릿
모든 관리 페이지(발주서, 현장, 거래처 등)는 동일한 구조를 따라야 합니다.

#### 페이지 구조
```tsx
// 표준 관리 페이지 템플릿
<div className="max-w-[1366px] mx-auto p-6">
  {/* 1. 페이지 헤더 - 고정 구조 */}
  <div className="mb-6">
    <div className="flex justify-between items-center mb-2">
      <h1 className="text-2xl font-bold text-gray-900">{페이지명} 관리</h1>
      <Button className="px-4 py-2 text-sm font-medium">
        <Plus className="h-4 w-4 mr-2" />
        {페이지명} 추가
      </Button>
    </div>
    <p className="text-sm text-gray-600">{설명문구}</p>
  </div>

  {/* 2. 검색 및 필터 영역 - 고정 간격 */}
  <div className="mb-6">
    <div className="flex flex-col lg:flex-row lg:items-end gap-4 mb-4">
      <div className="flex-1">
        <Input
          className="h-10 text-sm"
          placeholder="{주요필드1}, {주요필드2}로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {/* 추가 필터들 */}
    </div>
  </div>

  {/* 3. 테이블 영역 - 표준화된 테이블 */}
  <Card>
    <CardContent className="p-0">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {/* 헤더 내용 */}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          <tr className="hover:bg-gray-50 transition-colors">
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {/* 데이터 내용 */}
            </td>
          </tr>
        </tbody>
      </table>
    </CardContent>
  </Card>
</div>
```

#### 설명문구 표준 형식
- **발주서 관리**: "전체 발주서를 조회하고 관리하세요"
- **현장 관리**: "프로젝트 현장을 조회하고 관리하세요"  
- **거래처 관리**: "거래처 정보를 조회하고 관리하세요"
- **형식**: "{전체|항목명} {항목}을 조회하고 관리하세요"

#### 검색 플레이스홀더 표준
- **발주서**: "발주번호, 거래처명으로 검색..."
- **현장**: "현장명, 고객사명으로 검색..."  
- **거래처**: "거래처명, 사업자번호로 검색..."
- **형식**: 최대 2개 주요 필드만 포함

### 13.2 버튼 텍스트 표준화
모든 관리 페이지의 주요 액션 버튼은 일관된 형식을 사용해야 합니다.

#### 표준 버튼 텍스트
| 페이지 | 현재 | 표준화 후 |
|--------|------|----------|
| 발주서 관리 | "새 발주서 작성" | "발주서 추가" |
| 현장 관리 | "현장 추가" | "현장 추가" ✅ |
| 거래처 관리 | "거래처 추가" | "거래처 추가" ✅ |

#### 일관성 규칙
- **형식**: "{항목명} 추가"
- **길이**: 4-6자 내외로 통일
- **위치**: 페이지 우측 상단 고정

### 13.3 테이블 컬럼 표준화
모든 테이블은 일관된 컬럼 수와 레이아웃을 유지해야 합니다.

#### 권장 컬럼 수
- **최적**: 6개 컬럼 (현장 관리, 거래처 관리 기준)
- **최대**: 7개 컬럼 (발주서 관리 기준)
- **최소**: 5개 컬럼

#### 공통 컬럼 패턴
1. **식별자** (ID, 번호) - `w-32 min-w-[8rem]`
2. **주요 이름** (제목, 명칭) - `w-40 min-w-[10rem]`  
3. **관련 엔티티** (프로젝트, 거래처) - `w-32 min-w-[8rem]`
4. **상태/구분** (상태, 타입) - `w-24 min-w-[6rem]`
5. **수치 정보** (금액, 날짜) - `w-28 min-w-[7rem]`
6. **액션** (관리 버튼) - `w-20 min-w-[5rem]`

### 13.4 시각적 밀도 표준화
모든 페이지는 동일한 시각적 밀도를 유지해야 합니다.

#### 표준 간격
- **페이지 패딩**: `p-6` (24px)
- **섹션 간격**: `mb-6` (24px)  
- **테이블 행 높이**: `py-4` (상하 16px)
- **테이블 셀 패딩**: `px-6 py-4` (좌우 24px, 상하 16px)

#### 문제 해결 목표
- **발주서 관리**: 여백 축소 (현재 너무 넓음)
- **거래처 관리**: 여백 확대 및 폰트 크기 증가 (현재 너무 좁음)
- **현장 관리**: 기준점으로 유지 (적절한 밀도)

이 표준을 바탕으로 표준 발주서와 엑셀 발주서의 통합 워크플로우를 일관되게 구현하여 사용자 경험을 통합합니다.