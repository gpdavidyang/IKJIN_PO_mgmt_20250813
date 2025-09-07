import { test, expect } from '@playwright/test';

test.describe('Email Status Features', () => {
  test.beforeEach(async ({ page }) => {
    // 서버가 실행 중인지 확인하고 로그인
    await page.goto('http://localhost:3000');
    
    // 로그인 처리 (기존 세션 또는 로그인)
    const loginButton = page.locator('button:has-text("로그인")');
    const dashboardTitle = page.locator('h1:has-text("대시보드")');
    
    if (await loginButton.isVisible()) {
      // 로그인이 필요한 경우
      await page.fill('input[type="email"]', 'admin@company.com');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button:has-text("로그인")');
      await expect(dashboardTitle).toBeVisible({ timeout: 10000 });
    } else {
      // 이미 로그인된 경우 대시보드로 이동
      await page.goto('http://localhost:3000/dashboard');
      await expect(dashboardTitle).toBeVisible({ timeout: 10000 });
    }
  });

  test('발주서 목록에서 이메일 상태 컬럼 확인', async ({ page }) => {
    console.log('🔍 발주서 목록 페이지로 이동');
    await page.goto('http://localhost:3000/orders');
    
    // 발주서 목록 테이블이 로드될 때까지 대기
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 });
    
    // 이메일 상태 컬럼 헤더 확인
    const emailHeader = page.locator('th:has-text("이메일")');
    await expect(emailHeader).toBeVisible();
    console.log('✅ 이메일 상태 컬럼 헤더 확인됨');
    
    // 첫 번째 발주서 행의 이메일 상태 확인
    const firstRowEmailStatus = page.locator('tbody tr:first-child td').nth(-2); // 이메일 컬럼 (액션 컬럼 바로 앞)
    await expect(firstRowEmailStatus).toBeVisible();
    
    const emailStatusText = await firstRowEmailStatus.textContent();
    console.log('📧 첫 번째 발주서 이메일 상태:', emailStatusText);
    
    // 이메일 상태가 "미발송", "발송됨", "열람됨" 중 하나인지 확인
    expect(['미발송', '발송됨', '열람됨'].some(status => 
      emailStatusText?.includes(status)
    )).toBeTruthy();
  });

  test('발주서 상세 화면에서 상태별 이메일 기능 확인', async ({ page }) => {
    console.log('🔍 발주서 목록에서 상세로 이동');
    await page.goto('http://localhost:3000/orders');
    
    // 첫 번째 발주서 클릭
    await page.locator('tbody tr:first-child a').first().click();
    await expect(page.locator('h1')).toContainText('PO-'); // 발주번호가 제목에 표시
    console.log('✅ 발주서 상세 화면 진입');
    
    // 발주 상태 확인
    const statusBadge = page.locator('[class*="rounded-full"]:has-text("임시저장"), [class*="rounded-full"]:has-text("발주생성"), [class*="rounded-full"]:has-text("발주완료"), [class*="rounded-full"]:has-text("납품완료")').first();
    await expect(statusBadge).toBeVisible();
    
    const statusText = await statusBadge.textContent();
    console.log('📋 발주서 상태:', statusText);
    
    if (statusText?.includes('발주생성')) {
      // created 상태: 이메일 전송 버튼 확인
      const emailSendButton = page.locator('button:has-text("이메일 발송")');
      await expect(emailSendButton).toBeVisible();
      console.log('✅ 이메일 전송 버튼 확인됨 (created 상태)');
      
      // 이메일 기록 버튼은 없어야 함
      const emailHistoryButton = page.locator('button:has-text("이메일 기록")');
      await expect(emailHistoryButton).not.toBeVisible();
      console.log('✅ 이메일 기록 버튼 숨겨짐 (created 상태)');
      
    } else if (statusText?.includes('발주완료') || statusText?.includes('납품완료')) {
      // sent/delivered 상태: 이메일 기록 버튼 확인
      const emailHistoryButton = page.locator('button:has-text("이메일 기록")');
      await expect(emailHistoryButton).toBeVisible();
      console.log('✅ 이메일 기록 버튼 확인됨 (sent/delivered 상태)');
      
      // 이메일 전송 버튼은 없어야 함
      const emailSendButton = page.locator('button:has-text("이메일 발송")');
      await expect(emailSendButton).not.toBeVisible();
      console.log('✅ 이메일 전송 버튼 숨겨짐 (sent/delivered 상태)');
      
    } else if (statusText?.includes('임시저장')) {
      // draft 상태: 이메일 관련 버튼 모두 없어야 함
      const emailSendButton = page.locator('button:has-text("이메일 발송")');
      const emailHistoryButton = page.locator('button:has-text("이메일 기록")');
      await expect(emailSendButton).not.toBeVisible();
      await expect(emailHistoryButton).not.toBeVisible();
      console.log('✅ 이메일 관련 버튼 모두 숨겨짐 (draft 상태)');
    }
  });

  test('이메일 기록 모달 기능 테스트', async ({ page }) => {
    console.log('🔍 sent/delivered 상태의 발주서 찾기');
    await page.goto('http://localhost:3000/orders');
    
    // sent/delivered 상태의 발주서 찾기 (발주완료 또는 납품완료 배지가 있는 행)
    const sentOrDeliveredRow = page.locator('tr').filter({ 
      has: page.locator('[class*="rounded-full"]:has-text("발주완료"), [class*="rounded-full"]:has-text("납품완료")') 
    }).first();
    
    if (await sentOrDeliveredRow.isVisible()) {
      // 발주서 상세로 이동
      await sentOrDeliveredRow.locator('a').first().click();
      await expect(page.locator('h1')).toContainText('PO-');
      
      // 이메일 기록 버튼 클릭
      const emailHistoryButton = page.locator('button:has-text("이메일 기록")');
      if (await emailHistoryButton.isVisible()) {
        await emailHistoryButton.click();
        console.log('✅ 이메일 기록 버튼 클릭');
        
        // 이메일 기록 모달 확인
        const modal = page.locator('[role="dialog"]');
        await expect(modal).toBeVisible({ timeout: 5000 });
        
        const modalTitle = page.locator('h2:has-text("이메일 발송 이력")');
        await expect(modalTitle).toBeVisible();
        console.log('✅ 이메일 기록 모달 표시됨');
        
        // 모달 닫기
        await page.keyboard.press('Escape');
        await expect(modal).not.toBeVisible();
        console.log('✅ 이메일 기록 모달 닫힘');
      } else {
        console.log('⚠️ 이메일 기록 버튼이 없음 (아직 이메일 발송이 안된 상태)');
      }
    } else {
      console.log('⚠️ sent/delivered 상태의 발주서가 없음');
    }
  });

  test('API 응답에서 이메일 정보 확인', async ({ page }) => {
    console.log('🔍 API 응답에서 이메일 정보 확인');
    
    // API 응답 모니터링
    let apiResponse: any = null;
    page.on('response', async (response) => {
      if (response.url().includes('/api/orders-optimized')) {
        try {
          apiResponse = await response.json();
        } catch (e) {
          console.error('API 응답 파싱 실패:', e);
        }
      }
    });
    
    // 발주서 목록 페이지 방문
    await page.goto('http://localhost:3000/orders');
    await page.waitForTimeout(3000); // API 응답 대기
    
    // API 응답 확인
    if (apiResponse && apiResponse.orders) {
      const firstOrder = apiResponse.orders[0];
      console.log('📊 첫 번째 발주서 데이터:', {
        orderNumber: firstOrder.orderNumber,
        emailStatus: firstOrder.emailStatus,
        totalEmailsSent: firstOrder.totalEmailsSent
      });
      
      // 이메일 관련 필드가 존재하는지 확인
      expect(firstOrder).toHaveProperty('emailStatus');
      expect(firstOrder).toHaveProperty('totalEmailsSent');
      expect(typeof firstOrder.totalEmailsSent).toBe('number');
      console.log('✅ API 응답에 이메일 정보 포함 확인');
    } else {
      console.error('❌ API 응답을 받지 못했거나 orders 배열이 없음');
      throw new Error('API 응답 확인 실패');
    }
  });
});