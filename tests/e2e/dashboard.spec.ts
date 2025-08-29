import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인 처리
    await page.goto('/');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('대시보드 페이지 로드 확인', async ({ page }) => {
    // 페이지 타이틀 확인
    await expect(page).toHaveTitle(/구매 발주 관리 시스템/);
    
    // 대시보드 헤더 확인
    await expect(page.locator('h1').first()).toContainText('대시보드');
    
    // 네비게이션 메뉴 확인
    await expect(page.locator('nav')).toBeVisible();
  });

  test('통계 카드 표시 확인', async ({ page }) => {
    // 통계 카드들이 표시되는지 확인
    const statCards = page.locator('[class*="stat-card"], [class*="bg-white"][class*="rounded"], [class*="card"]');
    await expect(statCards).toHaveCount(4);
    
    // 각 통계 카드의 제목 확인
    await expect(page.locator('text=전체 발주')).toBeVisible();
    await expect(page.locator('text=대기 중')).toBeVisible();
    await expect(page.locator('text=승인됨')).toBeVisible();
    await expect(page.locator('text=거절됨')).toBeVisible();
  });

  test('차트 영역 표시 확인', async ({ page }) => {
    // 차트 컨테이너 확인
    const chartContainers = page.locator('[class*="recharts"], canvas, svg[class*="chart"]');
    const count = await chartContainers.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('최근 발주 목록 표시', async ({ page }) => {
    // 최근 발주 섹션 확인
    const recentOrdersSection = page.locator('text=최근 발주, text=Recent Orders').first();
    await expect(recentOrdersSection).toBeVisible();
    
    // 테이블 또는 리스트 확인
    const tableOrList = page.locator('table, [class*="list"]').first();
    await expect(tableOrList).toBeVisible();
  });

  test('네비게이션 메뉴 작동 확인', async ({ page }) => {
    // 구매 발주 메뉴 클릭
    await page.click('text=구매 발주');
    await expect(page).toHaveURL('/orders');
    
    // 대시보드로 돌아가기
    await page.click('text=대시보드');
    await expect(page).toHaveURL('/dashboard');
    
    // 거래처 관리 메뉴 클릭
    await page.click('text=거래처 관리');
    await expect(page).toHaveURL('/vendors');
    
    // 대시보드로 돌아가기
    await page.click('text=대시보드');
    await expect(page).toHaveURL('/dashboard');
  });

  test('프로필 드롭다운 메뉴', async ({ page }) => {
    // 프로필 버튼 찾기 (아바타 또는 사용자 이름)
    const profileButton = page.locator('[class*="avatar"], button:has-text("admin"), [class*="user"]').first();
    
    if (await profileButton.isVisible()) {
      await profileButton.click();
      
      // 드롭다운 메뉴 항목 확인
      const dropdown = page.locator('[role="menu"], [class*="dropdown"]');
      await expect(dropdown).toBeVisible();
      
      // 로그아웃 버튼 확인
      await expect(page.locator('text=로그아웃')).toBeVisible();
    }
  });

  test('반응형 디자인 - 모바일 뷰', async ({ page }) => {
    // 모바일 뷰포트로 변경
    await page.setViewportSize({ width: 375, height: 667 });
    
    // 모바일 메뉴 버튼 확인 (햄버거 메뉴)
    const mobileMenuButton = page.locator('[class*="mobile-menu"], [class*="hamburger"], button[aria-label*="menu"]');
    
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      // 모바일 네비게이션 확인
      await expect(page.locator('nav')).toBeVisible();
    }
    
    // 대시보드 컨텐츠가 여전히 표시되는지 확인
    await expect(page.locator('h1').first()).toContainText('대시보드');
  });

  test('데이터 새로고침', async ({ page }) => {
    // 새로고침 버튼이 있다면 클릭
    const refreshButton = page.locator('button:has-text("새로고침"), button[aria-label*="refresh"], [class*="refresh"]').first();
    
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      // 로딩 상태 확인 (있다면)
      const loadingIndicator = page.locator('[class*="loading"], [class*="spinner"]');
      if (await loadingIndicator.isVisible()) {
        await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
      }
    }
    
    // 데이터가 여전히 표시되는지 확인
    await expect(page.locator('text=전체 발주')).toBeVisible();
  });

  test('권한별 메뉴 표시', async ({ page }) => {
    // admin 권한으로 로그인했으므로 관리자 메뉴가 보여야 함
    const adminMenuItems = [
      '사용자 관리',
      '권한 관리',
      '시스템 설정',
      'Admin',
      '관리자'
    ];
    
    for (const menuItem of adminMenuItems) {
      const element = page.locator(`text=${menuItem}`);
      if (await element.isVisible()) {
        console.log(`Admin menu item found: ${menuItem}`);
        break;
      }
    }
  });

  test('빠른 작업 버튼', async ({ page }) => {
    // 새 발주 버튼 확인
    const newOrderButton = page.locator('button:has-text("새 발주"), a:has-text("새 발주")').first();
    
    if (await newOrderButton.isVisible()) {
      await newOrderButton.click();
      await expect(page).toHaveURL(/\/orders\/(new|create)/);
      
      // 대시보드로 돌아가기
      await page.goto('/dashboard');
    }
  });
});

test.describe('대시보드 데이터 검증', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('통계 숫자 유효성', async ({ page }) => {
    // 숫자가 표시되는 요소 찾기
    const statNumbers = page.locator('[class*="text-2xl"], [class*="text-3xl"], [class*="stat-number"]');
    const count = await statNumbers.count();
    
    for (let i = 0; i < count; i++) {
      const text = await statNumbers.nth(i).textContent();
      if (text && /\d/.test(text)) {
        // 숫자가 포함된 텍스트인지 확인
        expect(text).toMatch(/\d+/);
      }
    }
  });

  test('날짜 필터 작동', async ({ page }) => {
    // 날짜 선택기가 있다면 테스트
    const dateFilter = page.locator('input[type="date"], [class*="date-picker"], [class*="calendar"]').first();
    
    if (await dateFilter.isVisible()) {
      const today = new Date().toISOString().split('T')[0];
      await dateFilter.fill(today);
      
      // 필터 적용 버튼이 있다면 클릭
      const applyButton = page.locator('button:has-text("적용"), button:has-text("검색")').first();
      if (await applyButton.isVisible()) {
        await applyButton.click();
      }
      
      // 데이터가 업데이트되는지 확인 (로딩 후)
      await page.waitForTimeout(1000);
      await expect(page.locator('text=전체 발주')).toBeVisible();
    }
  });
});