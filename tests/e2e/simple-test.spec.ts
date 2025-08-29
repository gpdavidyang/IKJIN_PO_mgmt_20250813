import { test, expect } from '@playwright/test';

test('간단한 로그인 테스트', async ({ page }) => {
  // 홈페이지 접속
  await page.goto('http://localhost:3000');
  
  // 페이지 스크린샷
  await page.screenshot({ path: 'login-page.png' });
  
  // 페이지 타이틀 확인
  const title = await page.title();
  console.log('Page title:', title);
  
  // 로그인 폼 확인
  const emailInput = await page.locator('input[name="email"]').count();
  const passwordInput = await page.locator('input[name="password"]').count();
  
  console.log('Email input count:', emailInput);
  console.log('Password input count:', passwordInput);
  
  // 실제 input 요소 찾기
  const allInputs = await page.locator('input').all();
  console.log('Total inputs:', allInputs.length);
  
  for (let i = 0; i < allInputs.length; i++) {
    const name = await allInputs[i].getAttribute('name');
    const type = await allInputs[i].getAttribute('type');
    const placeholder = await allInputs[i].getAttribute('placeholder');
    console.log(`Input ${i}: name=${name}, type=${type}, placeholder=${placeholder}`);
  }
  
  // 로그인 시도
  if (emailInput > 0) {
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');
  } else {
    // name 속성이 없을 경우 type으로 찾기
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
  }
  
  // 제출 버튼 찾기
  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();
  
  // 결과 대기
  await page.waitForTimeout(3000);
  
  // 현재 URL 확인
  const currentUrl = page.url();
  console.log('Current URL after login:', currentUrl);
  
  // 페이지 스크린샷
  await page.screenshot({ path: 'after-login.png' });
});