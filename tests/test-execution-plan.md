# 🎯 시스템 테스트 실행 계획

## 실행 주체별 작업 분류

### 🤖 Claude가 직접 수행하는 작업

#### 1. 자동화 테스트 환경 구축
```bash
# Playwright 설치
npm install --save-dev @playwright/test playwright

# 테스트 실행
npx playwright test

# 리포트 확인
npx playwright show-report
```

#### 2. 단위 테스트 실행
```bash
# Jest 설치 (필요시)
npm install --save-dev jest @types/jest ts-jest

# 테스트 실행
npm test

# 커버리지 확인
npm test -- --coverage
```

#### 3. API 테스트
```bash
# API 엔드포인트 테스트
npm run test:api

# 통합 테스트
npm run test:integration
```

#### 4. 정적 분석
```bash
# TypeScript 타입 체크
npm run check

# ESLint (설치 필요시)
npx eslint . --ext .ts,.tsx
```

### 🎭 Playwright로 자동화 가능한 테스트

#### 1. E2E 시나리오 테스트
- 로그인/로그아웃 플로우
- 발주서 CRUD 작업
- 승인 워크플로우
- 파일 업로드 기능
- 검색 및 필터링

#### 2. 크로스 브라우저 테스트
```typescript
// playwright.config.ts에서 설정
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] }},
  { name: 'firefox', use: { ...devices['Desktop Firefox'] }},
  { name: 'webkit', use: { ...devices['Desktop Safari'] }},
  { name: 'mobile', use: { ...devices['iPhone 13'] }},
]
```

#### 3. 시각적 회귀 테스트
```typescript
// 스크린샷 비교
await expect(page).toHaveScreenshot('dashboard.png');
```

### 👤 직접 수행해야 하는 테스트

#### 1. 비즈니스 로직 검증
- **승인 한도 확인**: 역할별 금액 한도가 정확한지
- **워크플로우 검증**: 실제 업무 프로세스와 일치하는지
- **계산 로직**: 세금, 할인, 총액 계산이 정확한지

#### 2. 사용성 테스트
- **직관성**: UI가 사용하기 쉬운지
- **일관성**: 전체 앱에서 일관된 UX인지
- **피드백**: 사용자 액션에 적절한 피드백이 있는지

#### 3. 실제 환경 테스트
- **실제 이메일 발송**: SMTP 설정 및 이메일 수신 확인
- **실제 파일 처리**: 실제 업무용 엑셀 파일로 테스트
- **실제 데이터**: 프로덕션과 유사한 데이터 볼륨으로 테스트

#### 4. 보안 테스트
- **권한 우회 시도**: URL 직접 접근 등
- **세션 관리**: 다중 탭/브라우저에서 세션 처리
- **민감 정보 노출**: 개발자 도구에서 정보 확인

## 📅 권장 실행 순서

### Phase 1: 기본 검증 (Day 1)
1. ✅ 환경 설정 확인 (Claude)
2. ✅ Playwright 설치 및 설정 (Claude)
3. 기본 E2E 테스트 실행 (Claude + Playwright)
4. 로그인/권한 수동 테스트 (직접)

### Phase 2: 핵심 기능 (Day 2)
1. 발주서 CRUD 자동화 테스트 (Playwright)
2. 승인 워크플로우 수동 검증 (직접)
3. API 통합 테스트 (Claude)
4. 데이터 무결성 확인 (직접)

### Phase 3: 고급 기능 (Day 3)
1. 엑셀 자동화 전체 플로우 테스트 (Playwright + 직접)
2. 이메일 발송 테스트 (직접)
3. 성능 테스트 (Claude + 직접)
4. 보안 취약점 스캔 (Claude + 직접)

### Phase 4: 마무리 (Day 4)
1. 크로스 브라우저 테스트 (Playwright)
2. 모바일 반응형 테스트 (직접)
3. 접근성 테스트 (직접)
4. 테스트 결과 보고서 작성 (Claude)

## 🛠 도구 및 명령어

### 테스트 실행 명령어
```bash
# 모든 테스트 실행
npm test

# E2E 테스트만
npx playwright test

# 특정 파일만
npx playwright test auth.spec.ts

# 디버그 모드
npx playwright test --debug

# UI 모드
npx playwright test --ui

# 특정 브라우저만
npx playwright test --project=chromium
```

### 성능 테스트 도구
```bash
# Lighthouse CI
npm install -g @lhci/cli
lhci autorun

# k6 부하 테스트
brew install k6
k6 run load-test.js
```

### 보안 스캔
```bash
# npm audit
npm audit
npm audit fix

# OWASP ZAP (설치 필요)
# SQL Injection, XSS 등 자동 스캔
```

## 📝 체크리스트

### 테스트 전 준비
- [ ] 테스트 데이터베이스 준비
- [ ] 테스트용 사용자 계정 생성
- [ ] 테스트용 샘플 데이터 준비
- [ ] 환경 변수 설정 (.env.test)

### 테스트 중 확인사항
- [ ] 콘솔 에러 없음
- [ ] 네트워크 요청 실패 없음
- [ ] 메모리 누수 없음
- [ ] 적절한 응답 시간

### 테스트 후 정리
- [ ] 테스트 리포트 생성
- [ ] 버그 리포트 작성
- [ ] 개선사항 문서화
- [ ] 테스트 커버리지 확인