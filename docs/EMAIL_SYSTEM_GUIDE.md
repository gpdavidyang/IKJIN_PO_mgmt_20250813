# 이메일 시스템 가이드 - Vercel 최적화

## 🔧 문제 해결 내역

### 문제점
1. **첨부파일 미전송**: 사용자가 업로드한 파일이 전송되지 않음
2. **이메일 내용 무시**: 모달에서 작성한 메시지가 무시되고 기본 템플릿이 사용됨

### 해결책
1. **FormData 지원**: 사용자 업로드 파일을 위한 새로운 엔드포인트 생성
2. **사용자 메시지 우선**: 사용자 작성 메시지를 기본으로 사용하는 로직 추가
3. **에러 핸들링 강화**: Vercel 환경에 최적화된 상세 로깅 및 오류 처리

## 📁 변경된 파일들

### 클라이언트
- `client/src/services/emailService.ts` - FormData 지원 추가
- `client/src/components/email-send-dialog.tsx` - 기존 컴포넌트 (변경 없음)

### 서버
- `server/routes/orders.ts` - 새로운 `/send-email-with-files` 엔드포인트 추가
- `server/utils/po-email-service.ts` - `sendEmailWithDirectAttachments` 메소드 추가

## 🔄 이메일 발송 플로우

### 기존 방식 (JSON)
```
클라이언트 → /api/orders/send-email (JSON) → POEmailService
```
- 사용자 업로드 파일 전송 불가
- 고정된 이메일 템플릿만 사용

### 새로운 방식 (FormData)
```
클라이언트 → /api/orders/send-email-with-files (FormData) → POEmailService
```
- 사용자 업로드 파일 지원
- 사용자 메시지 우선 사용
- 기존 첨부파일과 새 파일 모두 지원

## 🚀 사용법

### 1. 환경 변수 설정
```bash
SMTP_HOST=smtp.naver.com
SMTP_PORT=587
SMTP_USER=your-email@naver.com
SMTP_PASS=your-password
```

### 2. 클라이언트에서 이메일 발송
```typescript
// EmailService.sendPurchaseOrderEmail 호출
const emailData = {
  to: ['recipient@example.com'],
  cc: ['cc@example.com'],
  subject: '발주서 전송',
  message: '사용자가 작성한 메시지',
  selectedAttachmentIds: [1, 2, 3], // 기존 첨부파일
  customFiles: [file1, file2] // 사용자 업로드 파일
};

await EmailService.sendPurchaseOrderEmail(orderData, emailData);
```

### 3. 이메일 내용 우선순위
1. **사용자 메시지 있음**: 사용자 메시지를 기본으로 사용 + 발주 정보 추가
2. **사용자 메시지 없음**: 기본 템플릿 사용

## 📎 첨부파일 처리

### 지원되는 첨부파일 타입
1. **기존 첨부파일** (`selectedAttachmentIds`)
   - 데이터베이스에 저장된 Base64 데이터
   - 발주서와 연결된 파일들

2. **사용자 업로드 파일** (`customFiles`)
   - 이메일 모달에서 직접 업로드
   - 드래그&드롭 지원
   - 최대 10MB, 10개 파일

### 첨부파일 결합
```javascript
// 최종 첨부파일 = 기존 첨부파일 + 사용자 업로드 파일
const finalAttachments = [
  ...existingAttachments, // DB에서 조회
  ...userUploadedFiles    // FormData에서 전송
];
```

## 🔍 디버깅 및 로깅

### 서버 로그 확인 사항
```javascript
console.log('📧 파일 포함 이메일 발송 요청:', { 
  orderData, to, cc, subject, 
  messageLength: message ? message.length : 0,
  selectedAttachmentIds,
  uploadedFilesCount: uploadedFiles.length 
});
```

### Vercel 환경 특별 로깅
```javascript
if (process.env.VERCEL) {
  console.log('🌐 Vercel 환경 이메일 발송:', {
    error: result.error,
    emailOptions: { to, subject, attachmentCount },
    env: { hasSmtpHost: !!process.env.SMTP_HOST }
  });
}
```

## ⚠️ 주의사항

### 1. Vercel 환경 제한
- 파일 시스템 제한: 임시 파일 생성 시 주의
- 메모리 제한: 큰 첨부파일 처리 시 고려
- 실행 시간 제한: 긴 작업 시 타임아웃 고려

### 2. SMTP 설정
- Naver SMTP 권장: `smtp.naver.com:587`
- 2단계 인증 사용 시 앱 비밀번호 필요
- TLS/SSL 설정 확인

### 3. 에러 처리
```javascript
// 사용자 친화적 에러 메시지
if (result.error?.includes('EAUTH')) {
  errorResponse.userMessage = '이메일 계정 인증 실패';
} else if (result.error?.includes('ECONNECTION')) {
  errorResponse.userMessage = '이메일 서버 연결 실패';
}
```

## 🧪 테스트

### 로컬 테스트
```bash
node test-vercel-email-robust.js
```

### Vercel 환경 테스트
```bash
curl -X POST https://your-app.vercel.app/api/orders/send-email-with-files \
  -F "orderData={\"orderNumber\":\"TEST-001\"}" \
  -F "to=[\"test@example.com\"]" \
  -F "subject=테스트" \
  -F "message=테스트 메시지" \
  -F "selectedAttachmentIds=[]" \
  -F "customFiles=@test.txt"
```

## 🔄 마이그레이션 가이드

### 기존 코드에서 새로운 시스템으로 이전

#### Before (문제 있던 방식)
```typescript
// 사용자 업로드 파일 전송 불가
// 이메일 내용 커스터마이징 제한
await emailService.sendPurchaseOrderEmail(orderData, {
  to, cc, subject, message, selectedAttachmentIds
});
```

#### After (개선된 방식)
```typescript
// 사용자 업로드 파일 지원
// 사용자 메시지 우선 사용
await emailService.sendPurchaseOrderEmail(orderData, {
  to, cc, subject, message, 
  selectedAttachmentIds, 
  customFiles // 새로 추가
});
```

## 📊 성능 최적화

### 1. 첨부파일 크기 제한
- 개별 파일: 10MB
- 전체 첨부파일: 50MB
- Base64 변환 오버헤드 고려

### 2. 메모리 사용 최적화
- Buffer 재사용
- Stream 처리 고려
- 임시 파일 즉시 삭제

### 3. 에러 복구
- SMTP 연결 실패 시 재시도
- 첨부파일 오류 시 본문만 발송
- 부분 실패 시 사용자 알림

## 🚦 상태 관리

### 이메일 발송 후 발주서 상태 업데이트
```javascript
// 이메일 발송 성공 시 자동으로 'sent' 상태로 변경
if (result.success) {
  await updateOrderStatusAfterEmail(orderData.orderNumber);
}
```

### 발송 실패 시 처리
```javascript
// 상태 변경 없이 유지
// 사용자에게 상세 오류 메시지 제공
// 재시도 가능 상태 유지
```