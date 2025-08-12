# 발주서 관리 시스템 통합 워크플로우 UI/UX 개선안

## 📋 개요

이 문서는 발주서 관리 시스템의 표준 발주서와 엑셀 발주서 작성 방식을 통합하여 일관된 사용자 경험을 제공하는 전문적인 UI/UX 개선안을 제시합니다.

## 🔍 현황 분석

### 현재 시스템의 두 가지 발주서 작성 방식

1. **표준 발주서 작성**
   - 폼 기반 직접 입력
   - PDF 미리보기 및 다운로드 지원
   - 승인 워크플로우 구현
   - 이메일 발송 미구현 (토스트만 표시)

2. **엑셀 발주서 작성**
   - 파일 업로드 기반
   - 자동화된 파싱 및 처리
   - 거래처 검증 시스템
   - 이메일 발송 완전 구현
   - 승인 워크플로우 없음

### 주요 문제점

- **일관성 부족**: 두 방식의 기능 격차가 크고 사용자 경험이 상이함
- **중복 개발**: 동일한 기능이 각각 다르게 구현되어 유지보수 어려움
- **불완전한 구현**: 각 방식마다 누락된 핵심 기능 존재

## 🎯 통합 워크플로우 설계

### 1. 통합 5단계 프로세스

```
1️⃣ 작성 방식 선택 → 2️⃣ 발주서 작성 → 3️⃣ 승인 처리 → 4️⃣ 후처리 → 5️⃣ 완료
```

#### 상세 단계별 설명

**1단계: 작성 방식 선택**
- 표준 발주서 (폼 입력)
- 엑셀 발주서 (파일 업로드)
- 각 방식의 장단점 안내

**2단계: 발주서 작성**
- 표준: 폼 필드 입력, 실시간 검증
- 엑셀: 파일 업로드, 데이터 파싱, 미리보기

**3단계: 승인 처리 (선택적)**
- 역할 기반 승인 워크플로우
- 금액별 자동 승인 경로
- 긴급 처리 옵션

**4단계: 후처리 파이프라인**
- PDF 생성 및 미리보기
- 거래처 정보 검증
- 이메일 준비 및 편집
- 첨부파일 관리

**5단계: 완료 및 결과**
- 시스템 저장 확인
- 이메일 발송 결과
- 다음 액션 안내

### 2. 기능 통합 매트릭스

| 기능 | 현재 표준 | 현재 엑셀 | 통합 후 |
|------|----------|----------|---------|
| PDF 생성 | ✅ | ❌ | ✅ 공통 |
| 이메일 발송 | ❌ | ✅ | ✅ 공통 |
| 승인 워크플로우 | ✅ | ❌ | ✅ 선택적 |
| 거래처 검증 | ❌ | ✅ | ✅ 공통 |
| 첨부파일 관리 | ⚠️ | ✅ | ✅ 공통 |

## 🏗️ 정보 아키텍처

### 통합 데이터 모델

```typescript
interface UnifiedOrderWorkflow {
  // 공통 데이터
  orderData: PurchaseOrder;
  creationMethod: 'standard' | 'excel';
  
  // 상태 관리
  currentStep: WorkflowStep;
  stepStates: {
    creation: CreationState;
    approval: ApprovalState;
    processing: ProcessingState;
    completed: CompletedState;
  };
  
  // 메타데이터
  metadata: {
    startedAt: Date;
    lastModified: Date;
    userId: string;
    sessionId: string;
  };
}
```

### 공통 컴포넌트 구조

```
UnifiedOrderWorkflow/
├── components/
│   ├── common/
│   │   ├── ProgressTracker.tsx
│   │   ├── StepContainer.tsx
│   │   └── ActionButtons.tsx
│   ├── creation/
│   │   ├── MethodSelection.tsx
│   │   ├── StandardForm.tsx
│   │   └── ExcelUpload.tsx
│   ├── approval/
│   │   ├── ApprovalWorkflow.tsx
│   │   └── ApprovalStatus.tsx
│   └── processing/
│       ├── PostProcessingPipeline.tsx
│       ├── PDFGenerator.tsx
│       ├── VendorValidator.tsx
│       └── EmailComposer.tsx
├── hooks/
│   ├── useOrderWorkflow.ts
│   └── usePostProcessing.ts
└── contexts/
    └── OrderWorkflowContext.tsx
```

## 💡 UI/UX 개선 사항

### 1. 진행 상황 시각화

```tsx
<ProgressIndicator 
  steps={[
    { id: 'select', title: '방식 선택', status: 'completed' },
    { id: 'create', title: '발주서 작성', status: 'current' },
    { id: 'approve', title: '승인', status: 'pending' },
    { id: 'process', title: '후처리', status: 'pending' },
    { id: 'complete', title: '완료', status: 'pending' }
  ]}
  showTimeEstimate={true}
  allowStepNavigation={false}
/>
```

### 2. 공통 후처리 파이프라인

```tsx
<PostProcessingPipeline>
  <ProcessingStep 
    title="PDF 생성"
    description="발주서를 PDF로 변환하고 있습니다"
    status={pdfStatus}
    actions={
      <Button onClick={previewPDF}>미리보기</Button>
    }
  />
  
  <ProcessingStep 
    title="거래처 검증"
    description="거래처 정보를 확인하고 있습니다"
    status={vendorStatus}
    details={vendorValidationDetails}
  />
  
  <ProcessingStep 
    title="이메일 준비"
    description="이메일을 작성하고 있습니다"
    status={emailStatus}
    actions={
      <Button onClick={editEmail}>편집</Button>
    }
  />
</PostProcessingPipeline>
```

### 3. 반응형 디자인 전략

**데스크톱 (1200px+)**
- 3컬럼 레이아웃: 진행상황 + 메인 콘텐츠 + 도움말
- 실시간 미리보기 패널
- 드래그&드롭 지원

**태블릿 (768px-1199px)**
- 2컬럼 레이아웃: 메인 콘텐츠 + 접을 수 있는 사이드바
- 터치 최적화 인터페이스

**모바일 (767px 이하)**
- 단일 컬럼 레이아웃
- 스와이프 네비게이션
- 단계별 전체화면 표시

## 📐 디자인 시스템

### 색상 팔레트

```css
:root {
  /* Primary Colors */
  --workflow-primary: #3B82F6;
  --workflow-primary-hover: #2563EB;
  
  /* Status Colors */
  --workflow-success: #10B981;
  --workflow-warning: #F59E0B;
  --workflow-error: #EF4444;
  --workflow-info: #3B82F6;
  
  /* Neutral Colors */
  --workflow-bg: #F9FAFB;
  --workflow-border: #E5E7EB;
  --workflow-text: #111827;
  --workflow-text-muted: #6B7280;
}
```

### 컴포넌트 스타일 가이드

```scss
// 카드 컴포넌트
.workflow-card {
  @apply bg-white rounded-lg shadow-sm border border-gray-200 p-6;
  
  &.active {
    @apply border-blue-500 shadow-md;
  }
}

// 진행 단계
.workflow-step {
  @apply flex items-center space-x-4 p-4 rounded-lg transition-all;
  
  &.completed {
    @apply bg-green-50 text-green-700;
  }
  
  &.current {
    @apply bg-blue-50 text-blue-700 font-semibold;
  }
}

// 액션 버튼
.workflow-action {
  @apply px-6 py-3 rounded-lg font-medium transition-all;
  
  &.primary {
    @apply bg-blue-600 text-white hover:bg-blue-700;
  }
  
  &.secondary {
    @apply bg-gray-100 text-gray-700 hover:bg-gray-200;
  }
}
```

## 🚀 구현 로드맵

### Phase 1: 공통 인프라 구축 (1-2주)
- [ ] 통합 타입 및 인터페이스 정의
- [ ] 상태 관리 시스템 구축
- [ ] 공통 유틸리티 함수 개발
- [ ] 테스트 환경 설정

### Phase 2: 공통 컴포넌트 개발 (2-3주)
- [ ] 진행 상황 추적기
- [ ] 메서드 선택 UI
- [ ] 후처리 파이프라인 컴포넌트
- [ ] PDF/이메일 미리보기 컴포넌트

### Phase 3: 표준 발주서 통합 (1-2주)
- [ ] 기존 코드 리팩토링
- [ ] 이메일 발송 기능 구현
- [ ] 공통 워크플로우 적용
- [ ] 테스트 및 버그 수정

### Phase 4: 엑셀 발주서 통합 (1-2주)
- [ ] 승인 워크플로우 추가
- [ ] UI 일관성 적용
- [ ] 성능 최적화
- [ ] 통합 테스트

### Phase 5: 배포 및 모니터링 (1주)
- [ ] 사용자 교육 자료 준비
- [ ] 단계적 배포
- [ ] 사용자 피드백 수집
- [ ] 성능 모니터링

## 📊 예상 효과

### 정량적 효과
- **개발 효율성**: 코드 중복 50% 감소
- **유지보수 시간**: 30% 단축
- **사용자 만족도**: 4.5/5.0 이상
- **처리 시간**: 평균 20% 단축

### 정성적 효과
- **일관된 사용자 경험**: 모든 발주서 작성 방식에서 동일한 품질
- **확장 가능성**: 새로운 작성 방식 쉽게 추가 가능
- **품질 보장**: 표준화된 검증 및 처리 프로세스
- **접근성 향상**: WCAG 2.1 AA 준수

## 🔗 관련 문서

- [시스템 아키텍처](SYSTEM_DOCUMENTATION.md)
- [UI 표준 가이드](UI_STANDARDS.md)
- [API 문서](API_DOCUMENTATION.md)
- [테스트 계획](TEST_PLAN.md)

---

*Last Updated: 2025-08-05*
*Version: 1.0*
*Author: UX Design Team*