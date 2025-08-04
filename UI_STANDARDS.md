# UI 표준화 문서 (Version 2.0)
Purchase Order Management System - 엔터프라이즈급 디자인 시스템

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

### Tailwind Breakpoints
- **Mobile**: `기본` (0px~)
- **Small**: `sm:` (640px~)
- **Large**: `lg:` (1024px~)

### 반응형 패턴
- **Flex Direction**: `flex-col sm:flex-row`
- **Grid Columns**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- **Gap Spacing**: `gap-4`

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

이 표준을 바탕으로 모든 페이지를 일관되게 개선하여 엔터프라이즈급 UI/UX를 구현할 예정입니다.