# 통합 워크플로우 테스트 가이드

## 개요
통합 워크플로우 시스템의 포괄적인 테스트 스위트입니다.

## 테스트 구조

### 단위 테스트
- `unified-workflow.test.tsx` - UnifiedOrderWorkflow 컴포넌트 테스트
- `horizontal-progress-tracker.test.tsx` - HorizontalProgressTracker 컴포넌트 테스트
- `use-order-workflow.test.tsx` - useOrderWorkflow 훅 테스트

### E2E 테스트
- `e2e/unified-workflow.e2e.test.ts` - 전체 워크플로우 통합 테스트

## 테스트 실행 방법

### 모든 워크플로우 테스트 실행
```bash
npm run test:workflow
```

### 특정 테스트 파일 실행
```bash
# 컴포넌트 테스트
npm test unified-workflow.test.tsx

# 훅 테스트
npm test use-order-workflow.test.tsx

# E2E 테스트
npm run test:workflow:e2e
```

### Watch 모드로 테스트 실행
```bash
npm run test:workflow:watch
```

### 테스트 커버리지 확인
```bash
npm run test:coverage -- --testPathPattern='(unified-workflow|horizontal-progress|use-order-workflow)'
```

## 테스트 시나리오

### 1. 레이아웃 및 구조 테스트
- ✅ 상단 가로형 진행상황 표시기 렌더링
- ✅ 현재 단계 제목과 설명 표시
- ✅ 저장/취소 버튼 표시
- ✅ 네비게이션 버튼 표시

### 2. 단계 네비게이션 테스트
- ✅ 방식 선택 시 다음 단계로 이동
- ✅ 이전/다음 버튼으로 네비게이션
- ✅ 첫 단계에서 이전 버튼 비활성화
- ✅ 단계 완료 전 다음 버튼 비활성화

### 3. 엑셀 워크플로우 테스트
- ✅ 엑셀 선택 → 업로드 → 승인 → 처리 → 완료
- ✅ 파일 업로드 성공/실패 처리
- ✅ 처리 상태 표시

### 4. 표준 워크플로우 테스트
- ✅ 표준 선택 → 폼 작성 → 승인 → 처리 → 완료
- ✅ 폼 유효성 검사
- ✅ 데이터 저장 및 전달

### 5. 진행상황 저장 테스트
- ✅ 저장 버튼 클릭 시 알림 표시
- ✅ localStorage에 상태 저장
- ✅ 페이지 새로고침 후 복원

### 6. 모바일 반응형 테스트
- ✅ 모바일 뷰포트에서 레이아웃 최적화
- ✅ 단축 라벨 표시 (모바일)
- ✅ 전체 너비 버튼 (모바일)
- ✅ 터치 친화적 인터페이스

### 7. 처리 상태 테스트
- ✅ 처리 중 네비게이션 비활성화
- ✅ 처리 진행률 표시
- ✅ 애니메이션 효과
- ✅ 오류 재시도 기능

### 8. 에러 처리 테스트
- ✅ 유효하지 않은 파일 업로드 에러
- ✅ 네트워크 오류 처리
- ✅ 단계별 에러 상태 표시

## 모킹 전략

### 컴포넌트 모킹
```typescript
jest.mock('@/components/workflow/HorizontalProgressTracker', () => ({
  __esModule: true,
  default: ({ steps, currentStep, isProcessing }: any) => (
    // 간단한 모킹 구현
  )
}));
```

### localStorage 모킹
```typescript
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;
```

## 테스트 데이터

### 테스트 파일 위치
- `tests/fixtures/test-order.xlsx` - 엑셀 업로드 테스트용
- `tests/fixtures/invalid-file.txt` - 에러 테스트용

### 샘플 데이터
```typescript
const mockSteps: WorkflowStepInfo[] = [
  { id: 'select', title: '방식 선택', status: 'completed' },
  { id: 'create', title: '발주서 작성', status: 'current' },
  // ...
];
```

## 주의사항

1. **비동기 작업**: `waitFor`를 사용하여 상태 업데이트 대기
2. **타이머**: 저장 알림 등 시간 기반 동작 테스트 시 적절한 타임아웃 설정
3. **모바일 테스트**: 뷰포트 크기 변경 후 원래대로 복원
4. **E2E 테스트**: 실제 서버가 실행 중이어야 함

## 디버깅 팁

### 테스트 실패 시
1. 콘솔 로그 확인
2. `screen.debug()` 사용하여 DOM 상태 확인
3. `waitFor` 타임아웃 증가
4. 모킹 데이터 검증

### 특정 테스트만 실행
```typescript
it.only('should test specific case', () => {
  // 테스트 코드
});
```

### 스킵할 테스트
```typescript
it.skip('should skip this test', () => {
  // 테스트 코드
});
```