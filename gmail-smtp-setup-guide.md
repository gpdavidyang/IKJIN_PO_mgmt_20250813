# Gmail SMTP 설정 완전 가이드

## 📧 Gmail 앱 비밀번호 생성 방법

### 1단계: Google 계정 2단계 인증 활성화
1. **Google 계정** (https://myaccount.google.com) 접속
2. 왼쪽 메뉴에서 **보안** 클릭
3. **Google에 로그인** 섹션에서 **2단계 인증** 클릭
4. **시작하기** 버튼 클릭하고 단계별로 설정
5. 휴대폰 인증 완료

### 2단계: Gmail 앱 비밀번호 생성
1. **Google 계정** → **보안** → **2단계 인증** 페이지로 이동
2. 페이지 하단의 **앱 비밀번호** 클릭
3. **앱 선택** 드롭다운에서 **메일** 선택
4. **기기 선택** 드롭다운에서 **기타(맞춤 이름)** 선택
5. 맞춤 이름에 `익진엔지니어링 발주시스템` 입력
6. **생성** 버튼 클릭
7. 생성된 **16자리 비밀번호를 복사** (예: abcd efgh ijkl mnop)

### 3단계: .env 파일 설정
```bash
# Email Configuration - Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=davidswyang@gmail.com
SMTP_PASS=생성된_16자리_비밀번호_여기에_입력
```

**⚠️ 주의사항**: 
- 16자리 비밀번호에서 **공백은 제거**하고 입력하세요
- 예: `abcd efgh ijkl mnop` → `abcdefghijklmnop`

### 4단계: 테스트
```bash
node test-gmail-smtp.js
```

## 🔧 Gmail SMTP 설정값
- **호스트**: smtp.gmail.com
- **포트**: 587 (STARTTLS)
- **보안**: STARTTLS 사용
- **인증**: 사용자명 + 앱 비밀번호

## ✅ Gmail SMTP 장점
- 높은 안정성 및 가용성
- 명확한 앱 비밀번호 시스템
- 우수한 스팸 필터링
- 개발 환경에서 테스트하기 적합
- 일일 전송 제한: 500통 (개인 계정)

## 🚨 문제 해결
만약 인증 오류가 발생하면:
1. 2단계 인증이 정상 활성화되었는지 확인
2. 앱 비밀번호를 다시 생성
3. 생성된 비밀번호에서 공백을 모두 제거했는지 확인
4. Gmail 계정에 로그인이 정상인지 확인