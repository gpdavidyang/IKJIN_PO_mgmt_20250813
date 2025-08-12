# UI 업데이트 체크리스트

## 개요
UI_STANDARDS.md의 최신 원칙들을 일관되게 적용하기 위해 업데이트가 필요한 화면들의 목록입니다.

## 핵심 원칙 체크포인트
- [ ] 최대 너비 1366px 제한 적용
- [ ] 파란색 계열 색상 체계 일관성
- [ ] 배경색 계층화 (gray-50 → white → blue-50)
- [ ] 그림자 효과 표준화 (shadow-sm)
- [ ] 둥근 모서리 일관성 (rounded-lg/md)
- [ ] 호버 효과 통일
- [ ] 타이포그래피 계층 구조
- [ ] 아이콘 크기 및 간격 표준화

## 업데이트 필요 화면 목록

### 1. 대시보드 (Dashboard)
**파일**: `/client/src/pages/dashboard.tsx`
- [x] 최대 너비 1366px 적용 (완료)
- [x] 카드 그림자 효과 표준화 (완료)
- [ ] 위젯 간격 표준화 (space-y-6)
- [ ] 통계 카드 아이콘 크기 통일

### 2. 발주서 목록 (Orders List)
**파일**: `/client/src/pages/orders.tsx`
- [ ] 기존 orders.tsx를 orders-professional.tsx 스타일로 전환
- [ ] 필터 섹션 UI 개선
- [ ] 테이블 헤더 정렬 기능 추가
- [ ] 액션 버튼 아이콘 표준화

### 3. 발주서 상세 (Order Detail)
**파일**: `/client/src/pages/order-detail.tsx`, `/client/src/pages/order-detail-standard.tsx`
- [ ] 레이아웃 최대 너비 제한
- [ ] 섹션 간격 표준화
- [ ] 상태 배지 스타일 통일
- [ ] 인쇄/다운로드 버튼 스타일 개선

### 4. 발주서 생성 (Create Order)
**파일**: `/client/src/pages/create-order.tsx` 및 하위 페이지들
- [ ] 워크플로우 선택 화면 개선
- [ ] 폼 입력 필드 높이 통일 (h-10)
- [ ] 단계별 진행 표시기 추가
- [ ] 제출 버튼 스타일 표준화

### 5. 거래처 관리 (Vendors)
**파일**: `/client/src/pages/vendors.tsx`
- [ ] 카드 뷰/테이블 뷰 토글 추가
- [ ] 카드 디자인 표준 적용
- [ ] 필터 섹션 UI 개선
- [ ] 액션 버튼 호버 효과 추가

### 6. 프로젝트 관리 (Projects)
**파일**: `/client/src/pages/projects.tsx`
- [ ] 프로젝트 카드 레이아웃 개선
- [ ] 상태 표시 배지 스타일 통일
- [ ] 진행률 표시 UI 개선
- [ ] 액션 버튼 아이콘 표준화

### 7. 품목 관리 (Items)
**파일**: `/client/src/pages/items.tsx`
- [ ] 카테고리 필터 UI 개선
- [ ] 가격 표시 포맷 통일
- [ ] 테이블/카드 뷰 전환 기능
- [ ] 검색 바 스타일 표준화

### 8. 사용자 관리 (User Management)
**파일**: `/client/src/pages/user-management.tsx`
- [ ] 사용자 카드 디자인 개선
- [ ] 역할 배지 스타일 통일
- [ ] 액션 버튼 간격 표준화
- [ ] 필터 옵션 UI 개선

### 9. 관리자 설정 (Admin)
**파일**: `/client/src/pages/admin.tsx`
- [ ] 설정 섹션 카드 스타일 통일
- [ ] 토글 스위치 스타일 표준화
- [ ] 저장 버튼 위치 및 스타일
- [ ] 섹션 간 간격 조정

### 10. 보고서 (Reports)
**파일**: `/client/src/pages/reports.tsx`
- [ ] 차트 컨테이너 스타일 통일
- [ ] 날짜 선택기 UI 개선
- [ ] 내보내기 버튼 스타일
- [ ] 통계 카드 레이아웃 표준화

### 11. 로그인 페이지 (Login)
**파일**: `/client/src/pages/login.tsx`
- [ ] 로그인 폼 카드 스타일
- [ ] 입력 필드 포커스 효과
- [ ] 버튼 스타일 표준화
- [ ] 에러 메시지 표시 개선

### 12. 카테고리 관리 (Category Management)
**파일**: `/client/src/pages/category-management.tsx`
- [x] 드래그앤드롭 UI 개선 (완료)
- [x] 계층 구조 시각화 (완료)
- [ ] 추가/삭제 버튼 스타일 통일
- [ ] 편집 모드 UI 개선

## 공통 컴포넌트 업데이트

### Header
**파일**: `/client/src/components/header.tsx`
- [ ] 높이 및 그림자 표준화
- [ ] 네비게이션 아이템 호버 효과
- [ ] 사용자 메뉴 드롭다운 스타일

### Sidebar
**파일**: `/client/src/components/sidebar.tsx`
- [x] 접기/펼치기 애니메이션 (완료)
- [ ] 메뉴 아이템 호버 효과 개선
- [ ] 활성 메뉴 표시 스타일
- [ ] 아이콘 크기 통일

### Filter Section (공통)
**파일**: `/client/src/components/common/FilterSection.tsx`
- [ ] 필터 태그 스타일 표준화
- [ ] 확장/축소 애니메이션
- [ ] 필터 초기화 버튼 위치
- [ ] 입력 필드 활성 상태 표시

### Status Badge (공통)
**파일**: `/client/src/components/ui/status-badge.tsx`
- [ ] 모든 상태에 대한 색상 매핑
- [ ] 크기 옵션 추가 (sm, md, lg)
- [ ] 아이콘 포함 옵션

### Loading States
**파일**: `/client/src/components/ui/loading-states.tsx`
- [ ] 스켈레톤 로더 스타일 통일
- [ ] 스피너 크기 및 색상 표준화
- [ ] 로딩 메시지 타이포그래피

## 우선순위별 작업 순서

### Phase 1 (즉시 적용)
1. 모든 페이지에 최대 너비 1366px 제한 적용
2. 메인 배경색을 gray-50으로 통일
3. 카드 shadow-sm 적용

### Phase 2 (단기)
1. 테이블 헤더 정렬 기능 추가
2. 호버 효과 표준화
3. 버튼 스타일 통일

### Phase 3 (중기)
1. 카드 뷰/테이블 뷰 토글 기능 추가
2. 필터 섹션 UI 개선
3. 로딩 상태 표준화

### Phase 4 (장기)
1. 애니메이션 및 트랜지션 효과 추가
2. 접근성 개선
3. 다크 모드 지원 (선택사항)

## 테스트 체크리스트
- [ ] 1366px 이상 화면에서 레이아웃 확인
- [ ] 태블릿/모바일 반응형 동작 확인
- [ ] 색상 일관성 검증
- [ ] 호버/포커스 상태 확인
- [ ] 로딩 상태 동작 확인
- [ ] 키보드 네비게이션 테스트

## 참고사항
- 각 화면 업데이트 시 UI_STANDARDS.md 문서 참조
- 컴포넌트 수정 시 영향받는 다른 화면들 확인
- 업데이트 완료 후 스크린샷 촬영하여 문서화