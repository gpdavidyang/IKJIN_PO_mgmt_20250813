import { test, expect } from '@playwright/test';

test.describe('인증 시스템 테스트', () => {
  test('로그인 페이지 접근 가능', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/구매 발주 관리 시스템/);
    await expect(page.locator('text=로그인')).toBeVisible();
  });

  test('유효한 자격증명으로 로그인', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=대시보드')).toBeVisible();
  });

  test('잘못된 자격증명으로 로그인 실패', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[name="username"]', 'wrong');
    await page.fill('input[name="password"]', 'wrong');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=로그인 실패')).toBeVisible();
  });

  test('로그아웃 기능', async ({ page }) => {
    // 먼저 로그인
    await page.goto('/');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // 로그아웃
    await page.click('button:has-text("로그아웃")');
    await expect(page).toHaveURL('/');
  });
});