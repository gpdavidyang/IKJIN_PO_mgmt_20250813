# 발주서 상태 및 한글 인코딩 문제 수정 검증

## 수정 사항 요약

### 1. 발주서 상태 문제 수정
- **문제**: 이메일을 보내지 않고 발주서를 생성했을 때도 상태가 '발송완료(sent)'로 표시됨
- **원인**: `orders-simple.ts`에서 `sendEmail` 플래그와 무관하게 `orderStatus`를 'sent'로 설정
- **해결**: 
  - 발주서 생성 시 기본 상태를 'created'로 설정
  - 이메일 발송 성공 후에만 상태를 'sent'로 업데이트

### 2. 한글 PDF 인코딩 개선
- **문제**: PDF에서 한글이 깨지는 현상
- **원인**: PDFKit에서 한글 폰트가 제대로 등록되지 않음
- **해결**:
  - 크로스 플랫폼 폰트 경로 확장 (macOS, Windows, Linux)
  - 텍스트 안전 처리 함수 개선 (특수문자 제거)
  - Vercel 환경 대응 로직 추가

## 테스트 시나리오

### 시나리오 1: 이메일 발송 없이 발주서 생성
1. 발주서 작성 > 엑셀 업로드 입력
2. 파일 업로드
3. **이메일 발송 체크박스 해제**
4. 발주서 생성 클릭
5. 발주서 관리 목록 확인
   - ✅ **기대 결과**: 상태가 '발주생성' 또는 '승인완료'로 표시
   - ❌ **이전 문제**: 상태가 '발송완료'로 표시

### 시나리오 2: 이메일 발송과 함께 발주서 생성
1. 발주서 작성 > 엑셀 업로드 입력
2. 파일 업로드
3. **이메일 발송 체크박스 체크**
4. 발주서 생성 클릭
5. 이메일 발송 완료
6. 발주서 관리 목록 확인
   - ✅ **기대 결과**: 상태가 '발송완료'로 표시

### 시나리오 3: 한글 PDF 생성
1. 발주서 생성 (한글 포함)
2. PDF 미리보기 또는 다운로드
   - ✅ **기대 결과**: 한글이 정상적으로 표시됨
   - ❌ **이전 문제**: 한글이 깨지거나 빈 칸으로 표시

## 코드 변경 내역

### `/server/routes/orders-simple.ts`
```typescript
// Before
orderStatus = sendEmail ? 'sent' : 'created';

// After  
orderStatus = 'created'; // Always start as 'created'
// Status will be updated to 'sent' later if email is successfully sent

// Email send success callback
if (result.success) {
  await db.update(purchaseOrders).set({ 
    status: 'sent',
    orderStatus: 'sent'
  }).where(eq(purchaseOrders.id, emailInfo.orderId));
}
```

### `/server/services/professional-pdf-generation-service.ts`
```typescript
// Enhanced Korean font paths
const possibleFonts = [
  '/System/Library/Fonts/AppleSDGothicNeo.ttc', // Added
  '/System/Library/Fonts/NanumGothic.ttc', // Added
  'C:\\Windows\\Fonts\\batang.ttc', // Added
  // ... more font paths
];

// Improved text safety processing
const safeText = (text: string) => {
  if (!text) return '';
  return text
    .replace(/[\\x00-\\x1F\\x7F]/g, '') // Remove control characters
    .replace(/[\\u2028\\u2029]/g, '') // Remove line separators
    .trim();
};
```

## 배포 상태
- ✅ 코드 수정 완료
- ✅ 빌드 성공
- ✅ Git 커밋 및 푸시 완료
- 🔄 Vercel 자동 배포 진행 중...

## 확인 방법
1. 배포 완료 후 프로덕션 환경에서 테스트
2. 개발 환경에서 로컬 테스트: `npm run dev`
3. 데이터베이스 직접 확인: `purchaseOrders` 테이블의 `orderStatus` 필드

## 참고사항
- 이미 생성된 발주서의 상태는 영향받지 않음
- 새로 생성되는 발주서부터 적용됨
- PDF 한글 폰트는 서버 환경에 따라 다를 수 있음 (Vercel은 기본 폰트 사용)