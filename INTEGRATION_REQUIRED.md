# 발주서 생성 프로세스 통합 필요사항

## 현재 상황
직접 입력 방식과 엑셀 업로드 방식이 서로 다른 처리 경로를 사용하고 있음

## 차이점 분석

### 1. API 엔드포인트
| 방식 | 엔드포인트 | 서비스 |
|------|-----------|---------|
| 직접 입력 | `/api/orders/create-unified` | UnifiedOrderCreationService |
| 엑셀 업로드 | `/api/orders/bulk-create-simple` | 별도 bulk 처리 |

### 2. 처리 프로세스
#### 직접 입력 (order-form.tsx)
```
1. 폼 데이터 입력
2. /api/orders/create-unified 호출
3. UnifiedOrderCreationService 처리
   - 데이터 검증
   - DB 저장
   - 첨부파일 처리
   - PDF 자동 생성
   - 상태 업데이트
4. 진행상황 SSE 알림
5. 완료
```

#### 엑셀 업로드 (simple-excel-bulk-upload.tsx)
```
1. 엑셀 파일 업로드
2. 클라이언트 파싱
3. 편집 UI 제공
4. /api/orders/bulk-create-simple 호출
5. 별도 처리 (PDF 생성 미포함)
6. 완료
```

## 통합 방안

### Option 1: 엑셀 업로드도 UnifiedOrderCreationService 사용
```javascript
// bulk-order-editor-two-row.tsx 수정
const saveIndividualOrder = useMutation({
  mutationFn: async ({ order, sendEmail, index }) => {
    const formData = new FormData();
    
    // 통합 서비스용 데이터 준비
    formData.append('method', 'excel');
    formData.append('projectId', order.projectId);
    formData.append('vendorId', order.vendorId);
    formData.append('items', JSON.stringify(order.items));
    // ... 기타 필드
    
    // 통합 API 호출
    const response = await fetch('/api/orders/create-unified', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    
    return response.json();
  }
});
```

### Option 2: bulk-create-simple API 개선
```javascript
// server/routes/orders.ts에 추가
router.post("/orders/bulk-create-simple", async (req, res) => {
  // 기존 bulk 처리 로직
  
  // UnifiedOrderCreationService 활용
  for (const orderData of orders) {
    const unifiedService = new UnifiedOrderCreationService();
    const result = await unifiedService.createOrder({
      method: 'excel',
      ...orderData
    }, sessionId);
  }
});
```

## 권장사항

1. **단기 해결책**: Option 2 적용
   - 기존 API 경로 유지
   - UnifiedOrderCreationService 내부 활용
   - PDF 생성 등 후속 절차 통합

2. **장기 해결책**: 완전 통합
   - 모든 발주서 생성을 UnifiedOrderCreationService로 통합
   - 단일/벌크 처리 모두 지원
   - 일관된 후속 처리 보장

## 구현 우선순위

1. ✅ 직접 입력 방식 - 완료
2. ⚠️ 엑셀 업로드 방식 - 통합 필요
   - PDF 자동 생성 미적용
   - 진행상황 추적 미적용
   - 승인 워크플로우 미통합

## 액션 아이템

- [ ] bulk-create-simple API를 UnifiedOrderCreationService와 통합
- [ ] 엑셀 업로드 시에도 PDF 자동 생성 적용
- [ ] 진행상황 추적 (SSE) 통합
- [ ] 승인 워크플로우 일관성 확보
- [ ] 테스트 케이스 작성