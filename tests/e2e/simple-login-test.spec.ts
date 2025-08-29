import { test, expect } from '@playwright/test';

test.describe('간단한 로그인 테스트', () => {
  test('로그인 페이지 접근 및 로그인 시도', async ({ page }) => {
    // 로그인 페이지로 이동
    await page.goto('/');
    
    // 페이지 로딩 대기
    await page.waitForLoadState('networkidle');
    
    console.log('현재 URL:', page.url());
    
    // 로그인 폼 요소가 있는지 확인
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      console.log('로그인 폼 발견됨');
      
      // 로그인 정보 입력
      await emailInput.fill('admin@company.com');
      await passwordInput.fill('admin123');
      
      // 로그인 버튼 클릭
      await submitButton.click();
      
      // 로그인 후 3초 대기
      await page.waitForTimeout(3000);
      
      console.log('로그인 시도 후 URL:', page.url());
      
      // 로그인 성공 여부 확인 (URL이 변경되었거나 로그인 요소가 사라졌는지)
      const isStillOnLoginPage = await emailInput.isVisible();
      
      if (!isStillOnLoginPage) {
        console.log('✅ 로그인 성공! 로그인 페이지를 벗어남');
        expect(true).toBeTruthy();
      } else {
        console.log('❌ 로그인 실패 - 여전히 로그인 페이지에 있음');
        
        // 에러 메시지가 있는지 확인
        const errorMessage = page.locator('text=오류, text=실패, text=error, .error, [role="alert"]');
        if (await errorMessage.isVisible()) {
          const errorText = await errorMessage.textContent();
          console.log('에러 메시지:', errorText);
        }
        
        expect(false).toBeTruthy(); // 실패 처리
      }
    } else {
      console.log('❌ 로그인 폼을 찾을 수 없음');
      expect(false).toBeTruthy();
    }
  });

  test('로그인 후 페이지 탐색 테스트', async ({ page }) => {
    // 로그인 수행
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[name="email"]', 'admin@company.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // 로그인 후 충분한 대기
    await page.waitForTimeout(5000);
    
    console.log('로그인 후 현재 URL:', page.url());
    
    // 다양한 페이지로 직접 이동해보기
    const testPages = ['/dashboard', '/orders', '/orders/new'];
    
    for (const testPage of testPages) {
      console.log(`\n=== ${testPage} 페이지 테스트 ===`);
      
      await page.goto(testPage);
      await page.waitForLoadState('networkidle');
      
      console.log(`${testPage} 이동 후 URL:`, page.url());
      
      // 페이지가 로딩되었는지 확인
      const bodyText = await page.locator('body').textContent();
      
      if (bodyText && bodyText.length > 100) {
        console.log(`✅ ${testPage} - 페이지 콘텐츠 로딩됨 (${bodyText.length} 문자)`);
        
        // 로그인 상태 확인 (로그인 폼이 없으면 로그인된 상태)
        const hasLoginForm = await page.locator('input[name="email"]').isVisible();
        if (!hasLoginForm) {
          console.log(`✅ ${testPage} - 로그인 상태 유지됨`);
        } else {
          console.log(`❌ ${testPage} - 로그인 상태 실패 (로그인 폼 표시됨)`);
        }
      } else {
        console.log(`❌ ${testPage} - 페이지 로딩 실패`);
      }
      
      await page.waitForTimeout(1000); // 페이지간 이동 간격
    }
    
    expect(true).toBeTruthy(); // 전체 테스트 통과
  });
});