# UI 표준 적용 필요 화면 목록

## 현재 상태 분석 기준
✅ = 이미 적용된 화면 (orders-professional.tsx, dashboard.tsx 등)  
🔄 = 부분 적용된 화면  
❌ = 적용이 필요한 화면  

## 핵심 업데이트 체크포인트
1. **최대 너비 1366px** (`max-w-[1366px] mx-auto`)
2. **배경색 계층화** (`bg-gray-50` → `bg-white` → `bg-blue-50`)
3. **그림자 효과** (`shadow-sm`)
4. **파란색 계열 색상** (#3B82F6, #2563EB)
5. **호버 효과** (`hover:bg-gray-50 transition-colors`)
6. **아이콘 크기** (`w-5 h-5`, `w-4 h-4`)
7. **테이블 헤더 정렬** (clickable headers with sort icons)

---

## 우선순위 1 (즉시 적용 필요 - 메인 화면들)

### 1. 대시보드 관련
- ✅ `/pages/dashboard.tsx` - 이미 적용됨
- ❌ `/pages/dashboard-professional.tsx` - 신규 화면, 적용 필요

### 2. 발주서 관리 (Orders)
- ✅ `/pages/orders-professional.tsx` - 이미 적용됨 (레퍼런스)
- ❌ `/pages/orders.tsx` - 기존 화면, 전면 업데이트 필요
- ❌ `/pages/orders-optimized.tsx` - 최적화 버전, 업데이트 필요
- ❌ `/pages/orders-professional-optimized.tsx` - 적용 필요

### 3. 발주서 상세/편집
- ❌ `/pages/order-detail.tsx` - 기존 상세 화면
- ❌ `/pages/order-detail-standard.tsx` - 표준 상세 화면
- ❌ `/pages/order-detail-professional.tsx` - 전문 버전
- ❌ `/pages/order-edit.tsx` - 편집 화면
- ❌ `/pages/order-preview.tsx` - 미리보기 화면

### 4. 발주서 생성 (Create Order)
- ❌ `/pages/create-order.tsx` - 메인 생성 화면
- ❌ `/pages/create-order-standard.tsx` - 표준 생성
- ❌ `/pages/create-order-standard-refactored.tsx` - 리팩토링된 버전
- ❌ `/pages/create-order-standard-professional.tsx` - 전문 버전
- ❌ `/pages/create-order-standard-compact.tsx` - 컴팩트 버전
- ❌ `/pages/create-order-unified.tsx` - 통합 버전
- ❌ `/pages/create-order-excel.tsx` - 엑셀 생성

---

## 우선순위 2 (단기 적용 - 관리 화면들)

### 5. 거래처 관리 (Vendor)
- ❌ `/pages/vendors.tsx` - 거래처 목록
- ❌ `/pages/vendor-detail.tsx` - 거래처 상세
- ❌ `/pages/vendor-detail-refactored.tsx` - 리팩토링된 버전
- ❌ `/pages/vendor-edit.tsx` - 거래처 편집

### 6. 프로젝트 관리 (Project)
- ❌ `/pages/projects.tsx` - 프로젝트 목록
- ❌ `/pages/project-detail.tsx` - 프로젝트 상세
- ❌ `/pages/project-edit.tsx` - 프로젝트 편집

### 7. 품목 관리 (Item)
- ❌ `/pages/items.tsx` - 품목 목록
- ❌ `/pages/item-detail.tsx` - 품목 상세

### 8. 사용자 관리 (User) 
- ❌ `/pages/users.tsx` - 사용자 목록
- ❌ `/pages/user-management.tsx` - 사용자 관리
- ❌ `/pages/user-detail.tsx` - 사용자 상세
- ❌ `/pages/positions.tsx` - 직급 관리

---

## 우선순위 3 (중기 적용 - 추가 기능들)

### 9. 관리자/설정
- 🔄 `/pages/admin.tsx` - 관리자 설정 (부분 적용됨)
- ❌ `/pages/admin-backup.tsx` - 백업 관리
- 🔄 `/pages/category-management.tsx` - 카테고리 관리 (부분 적용됨)

### 10. 보고서/분석
- ❌ `/pages/reports.tsx` - 보고서 화면
- ❌ `/pages/approvals.tsx` - 승인 관리

### 11. 템플릿 관리
- ❌ `/pages/template-management.tsx` - 템플릿 목록
- ❌ `/pages/template-edit.tsx` - 템플릿 편집

### 12. 회사 관리
- ❌ `/pages/companies.tsx` - 회사 관리

---

## 우선순위 4 (장기 적용 - 특수 기능들)

### 13. 엑셀 자동화
- ❌ `/pages/excel-automation-test.tsx` - 엑셀 자동화 테스트
- ❌ `/pages/create-order-excel.test.tsx` - 엑셀 생성 테스트

### 14. 특수 발주서 유형
- ❌ `/pages/create-order-accessories.tsx` - 부속품 발주
- ❌ `/pages/create-order-materials.tsx` - 자재 발주
- ❌ `/pages/create-order-extrusion.tsx` - 압출 발주
- ❌ `/pages/create-order-panel.tsx` - 패널 발주

### 15. 기타 페이지
- ❌ `/pages/import-export.tsx` - 가져오기/내보내기
- ❌ `/pages/profile.tsx` - 프로필
- ❌ `/pages/login.tsx` - 로그인
- ❌ `/pages/landing.tsx` - 랜딩 페이지
- ❌ `/pages/not-found.tsx` - 404 페이지

---

## 즉시 적용 가능한 공통 업데이트 사항

### 모든 화면에 공통 적용할 패턴:

```tsx
// 1. 메인 컨테이너 구조
<div className="min-h-screen bg-gray-50">
  <div className="max-w-[1366px] mx-auto p-6">
    {/* 페이지 헤더 */}
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">페이지 제목</h1>
          <p className="text-sm text-gray-500 mt-1">설명</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
          주요 액션
        </Button>
      </div>
    </div>
    
    {/* 필터/검색 카드 */}
    <Card className="mb-6 shadow-sm">
      <CardContent className="p-6">
        {/* 필터 내용 */}
      </CardContent>
    </Card>
    
    {/* 메인 콘텐츠 카드 */}
    <Card className="shadow-sm">
      {/* 콘텐츠 */}
    </Card>
  </div>
</div>
```

### 2. 테이블 헤더 정렬 패턴:
```tsx
<th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
  <button
    onClick={() => handleSort("fieldName")}
    className="flex items-center gap-1 hover:text-gray-700"
  >
    헤더명
    <ChevronsUpDown className="h-3 w-3" />
  </button>
</th>
```

### 3. 액션 버튼 패턴:
```tsx
<div className="flex items-center justify-center gap-2">
  <button
    className="text-gray-400 hover:text-blue-600 transition-colors"
    title="상세보기"
  >
    <Eye className="h-5 w-5" />
  </button>
  <button
    className="text-gray-400 hover:text-blue-600 transition-colors"
    title="수정"
  >
    <Edit className="h-5 w-5" />
  </button>
</div>
```

## 업데이트 순서 권장사항

### Week 1: 핵심 화면들
1. `/pages/orders.tsx` → orders-professional.tsx 스타일로 전환
2. `/pages/dashboard-professional.tsx` 완성
3. `/pages/order-detail.tsx` 업데이트

### Week 2: 관리 화면들  
1. `/pages/vendors.tsx`, `/pages/projects.tsx`, `/pages/items.tsx`
2. 각 화면에 카드뷰/테이블뷰 토글 추가

### Week 3: 생성 화면들
1. `/pages/create-order.tsx` 및 하위 생성 화면들
2. 통일된 폼 스타일 적용

### Week 4: 상세/편집 화면들
1. 나머지 상세 화면들 업데이트
2. 최종 QA 및 통합 테스트

이 리스트를 기준으로 단계적으로 업데이트를 진행하시면, 일관된 UI/UX를 구축할 수 있습니다.