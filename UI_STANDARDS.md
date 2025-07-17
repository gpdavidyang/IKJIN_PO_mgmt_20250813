# UI 표준화 문서 (Phase 1 분석 결과)
발주서 관리 화면을 기준으로 한 전체 시스템 UI 표준

## 1. 컬러 시스템

### Primary Colors
- **Primary Blue**: `#3B82F6` (파란색 계열 - 메인 액션 버튼, 활성 상태)
- **Primary Blue Light**: `#EBF5FF` (연한 파란색 - 입력 필드 활성 배경)
- **Primary Blue Border**: `#3B82F6` (파란색 테두리 - 활성 입력 필드)

### Status Colors
- **Gray**: `bg-gray-100 text-gray-800` (임시저장, 기본 상태)
- **Yellow**: `bg-yellow-100 text-yellow-800` (대기 중)
- **Blue**: `bg-blue-100 text-blue-800` (진행 중)
- **Green**: `bg-green-100 text-green-800` (완료)
- **Purple**: `bg-purple-100 text-purple-800` (승인됨)
- **Red**: `bg-red-100 text-red-800` (취소/오류)

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

## 2. 타이포그래피

### Font Weights
- **Bold**: `font-bold` (제목, 라벨)
- **Semibold**: `font-semibold` (중요 정보)
- **Medium**: `font-medium` (라벨, 버튼)
- **Regular**: `font-normal` (본문)

### Font Sizes
- **Small**: `text-sm` (12px - 보조 정보, 필터 태그)
- **Base**: `text-base` (14px - 기본 본문)
- **Large**: `text-lg` (16px - 카드 제목)

### Line Heights
- **Tight**: `leading-tight` (제목용)
- **Normal**: `leading-normal` (본문용)

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

## 4. 레이아웃 & 스페이싱

### Container Spacing
- **Page Container**: `p-6 space-y-6` (24px - 모든 관리 페이지의 메인 컨테이너)
- **Card Padding**: `p-4` (16px)
- **Section Spacing**: `space-y-6` (24px - 페이지 섹션 간격)
- **Table Cell Padding**: `py-2 px-4` (8px 상하, 16px 좌우)

### Grid System
- **Mobile**: `grid-cols-1`
- **Tablet**: `sm:grid-cols-2`
- **Desktop**: `lg:grid-cols-3`

### Component Heights
- **Input Fields**: `h-10` (40px - 기본), `h-9` (36px - 컴팩트)
- **Buttons**: `h-8` (32px - 작은 버튼), `h-10` (40px - 기본)
- **Select Dropdowns**: `h-10` (40px - 기본), `h-9` (36px - 컴팩트)

### Border Radius
- **Small**: `rounded` (4px - 기본)
- **Medium**: `rounded-md` (6px - 카드)
- **Large**: `rounded-lg` (8px - 큰 컴포넌트)
- **Full**: `rounded-full` (완전한 원형 - 태그, 버튼)

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

이 표준을 바탕으로 다른 페이지들을 일관되게 개선할 예정입니다.