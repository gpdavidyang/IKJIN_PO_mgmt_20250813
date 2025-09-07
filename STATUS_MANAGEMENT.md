# 발주서 상태 관리 시스템

## 개요

본 시스템은 **발주상태(Order Status)**와 **승인상태(Approval Status)**를 명확히 분리한 이중 상태 시스템을 사용합니다.
이 두 상태는 독립적으로 관리되며, 서로 다른 비즈니스 로직을 담당합니다.

## 상태 정의

### 1. 발주상태 (orderStatus)

발주서의 진행 상태를 나타냅니다.

| 상태값 | 한글명 | 설명 | 비즈니스 로직 |
|--------|--------|------|---------------|
| `draft` | 임시저장 | 작성 중이거나 임시 저장된 발주서 | - 편집 가능<br>- 승인 불필요<br>- 이메일 발송 불가 |
| `created` | 발주생성 | 발주서가 생성되어 발송 대기 중 | - PDF 생성 가능<br>- 이메일 발송 가능<br>- 편집 제한적 허용 |
| `sent` | 발주완료 | 이메일로 발송 완료된 발주서 | - 이메일 기록 조회 가능<br>- 편집 불가<br>- 납품 검수 가능 |
| `delivered` | 납품완료 | 납품이 완료된 발주서 | - 최종 상태<br>- 모든 편집 불가<br>- 기록 조회만 가능 |

### 2. 승인상태 (approvalStatus)

발주서의 승인 진행 상태를 나타냅니다.

| 상태값 | 한글명 | 설명 | 비즈니스 로직 |
|--------|--------|------|---------------|
| `not_required` | 승인불필요 | 승인이 필요하지 않은 발주서 | - 금액이 승인 한도 이하<br>- 직접 발주생성 가능<br>- 승인 프로세스 생략 |
| `pending` | 승인대기 | 승인 대기 중인 발주서 | - 승인자 지정됨<br>- 발주생성 불가<br>- 승인/반려 대기 |
| `approved` | 승인완료 | 승인이 완료된 발주서 | - 발주생성 가능<br>- 승인 프로세스 완료 |
| `rejected` | 반려 | 승인이 거부된 발주서 | - 반려 사유 기록<br>- 수정 후 재승인 요청 필요<br>- 발주생성 불가 |

## 데이터베이스 스키마

```sql
-- 발주상태 ENUM
CREATE TYPE order_status AS ENUM ('draft', 'created', 'sent', 'delivered');

-- 승인상태 ENUM  
CREATE TYPE approval_status AS ENUM ('not_required', 'pending', 'approved', 'rejected');

-- 발주서 테이블
CREATE TABLE purchase_orders (
    -- ... 기타 필드들 ...
    
    -- 발주상태 (주 상태)
    order_status order_status DEFAULT 'draft',
    
    -- 승인상태 (독립 상태)  
    approval_status approval_status DEFAULT 'not_required',
    
    -- DEPRECATED: 하위 호환성을 위해서만 유지
    status purchase_order_status DEFAULT 'pending'
);
```

## 상태 전환 규칙

### 발주상태 전환 흐름

```
draft → created → sent → delivered
  ↓       ↓        ↓       ↓
임시저장 → 발주생성 → 발주완료 → 납품완료
```

### 승인상태 전환 흐름

```
not_required ← (금액 기준으로 자동 설정)
     ↓
   pending → approved → (발주생성 가능)
     ↓         ↓
  rejected ← (반려 시)
```

### 상태 조합 매트릭스

| 발주상태 | 가능한 승인상태 | 설명 |
|----------|----------------|------|
| `draft` | `not_required`, `pending` | 임시저장: 승인 필요 여부 결정 |
| `created` | `not_required`, `approved` | 발주생성: 승인완료 또는 승인불필요 |
| `sent` | `not_required`, `approved` | 발주완료: 이미 승인된 상태 |
| `delivered` | `not_required`, `approved` | 납품완료: 최종 완료 상태 |

## UI 표시 규칙

### 1. 상태 표시 우선순위

화면에서 상태를 표시할 때는 **발주상태**를 주요 상태로 표시하되, 승인이 필요한 경우 승인상태를 함께 표시합니다.

```javascript
// 상태 표시 로직
function getDisplayStatus(orderStatus, approvalStatus) {
  // 승인 대기/반려인 경우 승인상태 우선 표시
  if (approvalStatus === 'pending') return '승인대기';
  if (approvalStatus === 'rejected') return '반려';
  
  // 그 외의 경우 발주상태 표시
  return getOrderStatusText(orderStatus);
}
```

### 2. 버튼/액션 가능 여부

```javascript
// 액션 가능 여부 판단
const canEdit = orderStatus === 'draft' || 
                (orderStatus === 'created' && approvalStatus !== 'pending');
const canSendEmail = orderStatus === 'created' && 
                     (approvalStatus === 'approved' || approvalStatus === 'not_required');
const canViewEmailHistory = orderStatus === 'sent' || orderStatus === 'delivered';
const canApprove = approvalStatus === 'pending';
```

## API 사용 규칙

### 1. 상태 업데이트

```javascript
// ✅ 올바른 사용법
await updateOrderStatus(orderId, {
  orderStatus: 'created',  // 발주상태만 업데이트
});

await updateApprovalStatus(orderId, {
  approvalStatus: 'approved',  // 승인상태만 업데이트
});

// ❌ 잘못된 사용법 - 혼재 사용 금지
await updateOrder(orderId, {
  status: 'approved',  // deprecated 필드 사용 금지
});
```

### 2. 필터링 및 검색

```javascript
// ✅ 올바른 필터링
const filters = {
  orderStatus: 'created',     // 발주상태 필터
  approvalStatus: 'pending'   // 승인상태 필터
};

// ❌ 잘못된 필터링
const filters = {
  status: 'approved'  // deprecated 필드 사용 금지
};
```

## 프론트엔드 컴포넌트 가이드라인

### 1. Status Display 컴포넌트

```jsx
function OrderStatusBadge({ orderStatus, approvalStatus }) {
  const displayStatus = getDisplayStatus(orderStatus, approvalStatus);
  const color = getStatusColor(orderStatus, approvalStatus);
  
  return (
    <Badge className={color}>
      {displayStatus}
      {approvalStatus === 'pending' && <Clock className="ml-1 h-3 w-3" />}
    </Badge>
  );
}
```

### 2. Action Buttons

```jsx
function OrderActionButtons({ order, user }) {
  const { orderStatus, approvalStatus } = order;
  
  const canEdit = useMemo(() => 
    orderStatus === 'draft' || 
    (orderStatus === 'created' && approvalStatus !== 'pending'), 
    [orderStatus, approvalStatus]
  );
  
  const canSendEmail = useMemo(() =>
    orderStatus === 'created' && 
    (approvalStatus === 'approved' || approvalStatus === 'not_required'),
    [orderStatus, approvalStatus]  
  );
  
  return (
    <div className="flex gap-2">
      {canEdit && <Button onClick={onEdit}>수정</Button>}
      {canSendEmail && <Button onClick={onSendEmail}>이메일 발송</Button>}
      {/* 기타 액션들... */}
    </div>
  );
}
```

## 백엔드 서비스 가이드라인

### 1. 상태 업데이트 서비스

```javascript
class OrderStatusService {
  // 발주상태만 업데이트
  async updateOrderStatus(orderId, newOrderStatus) {
    return database.db.update(purchaseOrders)
      .set({ 
        orderStatus: newOrderStatus,
        updatedAt: new Date() 
      })
      .where(eq(purchaseOrders.id, orderId));
  }
  
  // 승인상태만 업데이트
  async updateApprovalStatus(orderId, newApprovalStatus) {
    return database.db.update(purchaseOrders)
      .set({ 
        approvalStatus: newApprovalStatus,
        updatedAt: new Date() 
      })
      .where(eq(purchaseOrders.id, orderId));
  }
}
```

### 2. 비즈니스 로직 분리

```javascript
class OrderWorkflowService {
  async createOrder(orderData) {
    // 금액에 따른 승인 필요 여부 결정
    const needsApproval = await this.checkApprovalRequired(orderData.totalAmount);
    
    const order = await this.orderService.create({
      ...orderData,
      orderStatus: 'draft',
      approvalStatus: needsApproval ? 'pending' : 'not_required'
    });
    
    if (needsApproval) {
      await this.approvalService.requestApproval(order.id);
    }
    
    return order;
  }
  
  async sendEmail(orderId) {
    const order = await this.orderService.getById(orderId);
    
    // 이메일 발송 가능 여부 검증
    if (order.orderStatus !== 'created') {
      throw new Error('발주생성 상태가 아닌 발주서는 발송할 수 없습니다.');
    }
    
    if (order.approvalStatus === 'pending') {
      throw new Error('승인 대기 중인 발주서는 발송할 수 없습니다.');
    }
    
    // 이메일 발송 로직...
    await this.emailService.send(order);
    
    // 발주상태를 '발송완료'로 변경
    await this.orderStatusService.updateOrderStatus(orderId, 'sent');
  }
}
```

## 마이그레이션 가이드

### 기존 코드에서의 변경사항

1. **status 필드 사용 중단**
   ```javascript
   // ❌ 기존 코드 (deprecated)
   order.status === 'approved'
   
   // ✅ 새 코드
   order.orderStatus === 'created' && order.approvalStatus === 'approved'
   ```

2. **상태 유틸리티 함수 교체**
   ```javascript
   // ❌ 기존 함수
   getStatusText(order.status)
   
   // ✅ 새 함수  
   getOrderStatusText(order.orderStatus)
   getApprovalStatusText(order.approvalStatus)
   ```

3. **필터 조건 변경**
   ```javascript
   // ❌ 기존 필터
   { status: 'approved' }
   
   // ✅ 새 필터
   { 
     orderStatus: 'created',
     approvalStatus: 'approved' 
   }
   ```

## 주의사항

1. **절대 금지 사항**
   - `status` 필드와 `orderStatus`/`approvalStatus` 필드 혼재 사용 금지
   - 승인상태 값을 발주상태 로직에 사용 금지
   - 하나의 조건문에서 두 상태를 혼합하여 판단 금지

2. **권장 사항**  
   - 상태 관련 로직은 별도 유틸리티 함수로 분리
   - 상태 전환은 반드시 정의된 서비스를 통해서만 수행
   - UI에서는 두 상태를 조합한 display 함수 사용

3. **테스팅**
   - 각 상태 조합에 대한 단위 테스트 작성 필요
   - 상태 전환 워크플로우에 대한 통합 테스트 작성 필요

---

**마지막 업데이트**: 2025-01-07  
**담당자**: Claude Code Assistant