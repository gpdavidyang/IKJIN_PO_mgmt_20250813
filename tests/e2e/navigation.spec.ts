import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should navigate to dashboard', async ({ page }) => {
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('대시보드');
  });

  test('should navigate to purchase orders', async ({ page }) => {
    await page.click('text=구매 발주');
    await expect(page).toHaveURL('/orders');
    await expect(page.locator('h1')).toContainText('구매 발주 목록');
  });

  test('should navigate to vendors', async ({ page }) => {
    await page.click('text=거래처 관리');
    await expect(page).toHaveURL('/vendors');
    await expect(page.locator('h1')).toContainText('거래처 관리');
  });

  test('should navigate to items', async ({ page }) => {
    await page.click('text=품목 관리');
    await expect(page).toHaveURL('/items');
    await expect(page.locator('h1')).toContainText('품목 관리');
  });

  test('should navigate to projects', async ({ page }) => {
    await page.click('text=프로젝트 관리');
    await expect(page).toHaveURL('/projects');
    await expect(page.locator('h1')).toContainText('프로젝트 관리');
  });

  test('should navigate to companies', async ({ page }) => {
    await page.click('text=회사 관리');
    await expect(page).toHaveURL('/companies');
    await expect(page.locator('h1')).toContainText('회사 관리');
  });
});