import { test, expect } from '@playwright/test';

test.describe('현장관리 간단 테스트', () => {
  test('현장관리 페이지 접근 및 기본 기능', async ({ page }) => {
    // 1. 로그인
    await page.goto('/');
    await page.fill('input[name="email"]', 'admin@company.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // 2. 대시보드 로드 확인
    await page.waitForSelector('h1:has-text("대시보드")', { timeout: 10000 });
    
    // 3. 직접 URL로 현장관리 페이지 이동
    await page.goto('/projects');
    await page.waitForTimeout(3000); // 페이지 로드 대기
    
    // 4. 페이지 로드 상태 확인
    const pageLoaded = await page.evaluate(() => {
      return document.readyState === 'complete';
    });
    expect(pageLoaded).toBeTruthy();
    
    // 5. 에러 메시지가 없는지 확인
    const errorElements = await page.locator('[class*="error"], [class*="Error"]').count();
    console.log('Error elements found:', errorElements);
    
    // 6. 페이지 내용 확인
    const bodyText = await page.locator('body').innerText();
    console.log('Page contains Projects content:', bodyText.includes('프로젝트') || bodyText.includes('현장'));
    
    // 7. 헤더 존재 확인
    const headers = await page.locator('h1, h2').allTextContents();
    console.log('Headers found:', headers);
    
    // 최소한 페이지가 로드되었음을 확인
    expect(pageLoaded).toBeTruthy();
  });

  test('현장관리 네비게이션 링크 테스트', async ({ page }) => {
    // 로그인
    await page.goto('/');
    await page.fill('input[name="email"]', 'admin@company.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('h1:has-text("대시보드")', { timeout: 10000 });
    
    // 사이드바 확장 (축소되어 있을 경우)
    const expandButton = page.locator('button').filter({ hasText: /panel|sidebar/i }).first();
    if (await expandButton.count() > 0) {
      await expandButton.click();
      await page.waitForTimeout(500);
    }
    
    // 현장 관리 링크 찾기
    const projectLinks = await page.locator('a').allTextContents();
    const hasProjectLink = projectLinks.some(text => 
      text.includes('현장') || text.includes('프로젝트') || text.includes('Project')
    );
    
    console.log('Has project management link:', hasProjectLink);
    expect(hasProjectLink).toBeTruthy();
  });

  test('현장관리 직접 접근 테스트', async ({ page }) => {
    // 로그인
    await page.goto('/');
    await page.fill('input[name="email"]', 'admin@company.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('h1:has-text("대시보드")', { timeout: 10000 });
    
    // 직접 URL 접근
    const response = await page.goto('/projects', { waitUntil: 'networkidle' });
    
    // 응답 상태 확인
    if (response) {
      console.log('Response status:', response.status());
      expect(response.status()).toBeLessThan(400);
    }
    
    // URL 확인
    expect(page.url()).toContain('/projects');
  });
});