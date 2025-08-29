import { test, expect } from '@playwright/test';

test('디버그 로그인 프로세스', async ({ page }) => {
  // 콘솔 로그 캡처
  page.on('console', msg => console.log('Browser console:', msg.text()));
  
  // 네트워크 요청 캡처
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      console.log('API Request:', request.method(), request.url());
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log('API Response:', response.status(), response.url());
    }
  });

  // 홈페이지 접속
  await page.goto('http://localhost:3000');
  
  // 로그인 폼 확인
  console.log('Checking login form...');
  await page.screenshot({ path: 'debug-1-login-page.png' });
  
  // 이메일 입력
  await page.fill('input[name="email"]', 'admin@company.com');
  console.log('Email filled');
  
  // 비밀번호 입력
  await page.fill('input[name="password"]', 'admin123');
  console.log('Password filled');
  
  await page.screenshot({ path: 'debug-2-filled-form.png' });
  
  // 제출 버튼 클릭
  const submitButton = page.locator('button[type="submit"]');
  console.log('Submit button found:', await submitButton.isVisible());
  
  // 클릭과 네비게이션 대기
  const navigationPromise = page.waitForNavigation({ 
    timeout: 5000,
    waitUntil: 'networkidle' 
  }).catch(e => {
    console.log('Navigation did not happen:', e.message);
    return null;
  });
  
  await submitButton.click();
  console.log('Submit button clicked');
  
  // 네비게이션 대기
  await navigationPromise;
  
  // 3초 대기
  await page.waitForTimeout(3000);
  
  // 현재 URL 확인
  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);
  
  // 에러 메시지 확인
  const errorMessages = await page.locator('[class*="error"], [class*="toast"], [class*="alert"]').allTextContents();
  if (errorMessages.length > 0) {
    console.log('Error messages found:', errorMessages);
  }
  
  // 최종 스크린샷
  await page.screenshot({ path: 'debug-3-after-submit.png' });
  
  // 페이지 HTML 일부 출력
  const bodyText = await page.locator('body').innerText();
  console.log('Page text (first 500 chars):', bodyText.substring(0, 500));
});