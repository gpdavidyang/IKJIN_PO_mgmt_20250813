# Gmail SMTP 설정 가이드

네이버 SMTP에서 계속 인증 오류가 발생하므로 Gmail SMTP로 대안 설정을 진행합니다.

## 🔧 Gmail SMTP 설정 방법

### 1단계: Google 계정 설정
1. Google 계정 (davidswyang@gmail.com)에 로그인
2. **Google 계정** → **보안** 이동
3. **2단계 인증** 활성화 (필수)
4. **앱 비밀번호** 생성:
   - 보안 → 앱 비밀번호
   - 앱 선택: **메일**
   - 기기 선택: **기타 (맞춤 이름)**
   - 이름: `익진엔지니어링 발주시스템`
   - **생성** 클릭
   - 생성된 16자리 비밀번호 복사

### 2단계: .env 파일 수정
```bash
# Email Configuration - Gmail (더 안정적)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=davidswyang@gmail.com
SMTP_PASS=your_16_digit_app_password_here
```

### 3단계: 테스트
```bash
node test-naver-smtp.js
```

## ✅ Gmail SMTP 장점
- 더 안정적인 연결
- 명확한 앱 비밀번호 시스템
- 높은 신뢰성과 가용성
- 스팸 필터링 우수

## 📧 발송자 정보
Gmail 사용 시 발송자가 `davidswyang@gmail.com`로 표시됩니다.
회사 도메인 이메일이 필요한 경우:
1. Gmail에서 **다른 주소에서 메일 보내기** 설정
2. 또는 회사 G Suite/Google Workspace 계정 사용

## 🔄 전환 후 테스트
Gmail SMTP 설정 완료 후:
1. 애플리케이션 재시작
2. Excel 업로드 → 이메일 발송 테스트
3. 정상 작동 확인