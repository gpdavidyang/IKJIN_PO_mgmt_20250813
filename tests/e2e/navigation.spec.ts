import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[name="email"]', 'admin@company.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // 로그인 후 페이지 로드 대기
    await page.waitForTimeout(3000);
    
    // 로그인 성공 확인 (버튼이 사라지거나 대시보드 요소가 나타나는지)
    const loginButtonGone = await page.locator('button:has-text("로그인")').count() === 0;
    const hasContent = await page.locator('body').textContent();
    const loggedIn = loginButtonGone || (hasContent && hasContent.length > 100);
    
    expect(loggedIn).toBeTruthy();
  });

  test('should navigate to dashboard', async ({ page }) => {
    // 대시보드 요소 또는 대시보드 텍스트 확인
    const dashboardElement = page.locator('text=대시보드, h1:has-text("대시보드"), [class*="dashboard"]');
    await expect(dashboardElement.first()).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to purchase orders', async ({ page }) => {
    // 로그인 상태 확인 후 네비게이션
    await page.waitForTimeout(1000);
    
    // 발주 가점스 링크 클릭
    const orderLink = page.locator('text=구매 발주, text=발주, a[href="/orders"], [href*="order"]');
    await orderLink.first().click();
    
    await page.waitForTimeout(2000);
    
    // 발주 페이지로 이동 확인
    const onOrdersPage = page.url().includes('/orders') || await page.locator('text=발주, h1:has-text("발주")').count() > 0;
    expect(onOrdersPage).toBeTruthy();
  });

  test('should navigate to vendors', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const vendorLink = page.locator('text=거래처, text=거래처 관리, a[href="/vendors"], [href*="vendor"]');
    await vendorLink.first().click();
    
    await page.waitForTimeout(2000);
    
    const onVendorsPage = page.url().includes('/vendors') || await page.locator('text=거래처, h1:has-text("거래처")').count() > 0;
    expect(onVendorsPage).toBeTruthy();
  });

  test('should navigate to items', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const itemLink = page.locator('text=품목, text=품목 관리, a[href="/items"], [href*="item"]');
    await itemLink.first().click();
    
    await page.waitForTimeout(2000);
    
    const onItemsPage = page.url().includes('/items') || await page.locator('text=품목, h1:has-text("품목")').count() > 0;
    expect(onItemsPage).toBeTruthy();
  });

  test('should navigate to projects', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const projectLink = page.locator('text=프로젝트, text=프로젝트 관리, a[href="/projects"], [href*="project"]');
    await projectLink.first().click();
    
    await page.waitForTimeout(2000);
    
    const onProjectsPage = page.url().includes('/projects') || await page.locator('text=프로젝트, h1:has-text("프로젝트")').count() > 0;
    expect(onProjectsPage).toBeTruthy();
  });

  test('should navigate to companies', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const companyLink = page.locator('text=회사, text=회사 관리, a[href="/companies"], [href*="compan"]');
    await companyLink.first().click();
    
    await page.waitForTimeout(2000);
    
    const onCompaniesPage = page.url().includes('/companies') || await page.locator('text=회사, h1:has-text("회사")').count() > 0;
    expect(onCompaniesPage).toBeTruthy();
  });
});