import { test, expect } from '@playwright/test';

test('현장관리 디버그 테스트', async ({ page }) => {
  // 콘솔 로그 캡처
  page.on('console', msg => console.log('Browser:', msg.text()));
  
  // 1. 로그인
  console.log('1. 로그인 시도...');
  await page.goto('http://localhost:3000');
  await page.screenshot({ path: 'field-1-login.png' });
  
  await page.fill('input[name="email"]', 'admin@company.com');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  
  // 2. 대시보드 대기
  console.log('2. 대시보드 로드 대기...');
  await page.waitForSelector('h1:has-text("대시보드")', { timeout: 10000 });
  await page.screenshot({ path: 'field-2-dashboard.png' });
  
  // 3. 네비게이션 메뉴 확인
  console.log('3. 네비게이션 메뉴 확인...');
  const navLinks = await page.locator('a, button').allTextContents();
  console.log('Available navigation links:', navLinks.filter(text => text.includes('관리')));
  
  // 4. 현장 관리 링크 찾기
  console.log('4. 현장 관리 링크 찾기...');
  const fieldManagementLink = page.locator('a:has-text("현장 관리")').first();
  const projectsLink = page.locator('a[href="/projects"]').first();
  
  let linkFound = false;
  if (await fieldManagementLink.count() > 0) {
    console.log('Found: 현장 관리 link');
    await fieldManagementLink.click();
    linkFound = true;
  } else if (await projectsLink.count() > 0) {
    console.log('Found: /projects link');
    await projectsLink.click();
    linkFound = true;
  } else {
    console.log('No field management link found');
    // 사이드바가 숨겨져 있을 수 있음
    const menuButton = page.locator('button[aria-label*="menu"], button:has([class*="menu"])').first();
    if (await menuButton.isVisible()) {
      console.log('Opening menu...');
      await menuButton.click();
      await page.waitForTimeout(500);
      
      // 다시 링크 찾기
      const fieldLink = page.locator('a:has-text("현장 관리")').first();
      if (await fieldLink.isVisible()) {
        await fieldLink.click();
        linkFound = true;
      }
    }
  }
  
  if (!linkFound) {
    // 직접 URL로 이동
    console.log('직접 URL로 이동: /projects');
    await page.goto('http://localhost:3000/projects');
  }
  
  // 5. 페이지 로드 대기
  console.log('5. 페이지 로드 대기...');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // 6. 현재 페이지 확인
  console.log('6. 현재 페이지 확인...');
  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);
  
  await page.screenshot({ path: 'field-3-projects-page.png' });
  
  // 7. 페이지 컨텐츠 확인
  const pageText = await page.locator('body').innerText();
  console.log('Page text (first 500 chars):', pageText.substring(0, 500));
  
  // 8. 헤더 확인
  const headers = await page.locator('h1, h2').allTextContents();
  console.log('Headers found:', headers);
  
  // 9. 테이블 또는 카드 뷰 확인
  const hasTable = await page.locator('table').count() > 0;
  const hasCards = await page.locator('[class*="card"]').count() > 0;
  console.log('Has table:', hasTable);
  console.log('Has cards:', hasCards);
  
  expect(linkFound || currentUrl.includes('/projects')).toBeTruthy();
});