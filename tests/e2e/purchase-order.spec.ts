import { test, expect } from '@playwright/test';

test.describe('구매 발주 시스템 테스트', () => {
  test.beforeEach(async ({ page }) => {
    // 각 테스트 전 로그인
    await page.goto('/');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('발주서 목록 조회', async ({ page }) => {
    await page.goto('/orders');
    await expect(page.locator('h1:has-text("구매 발주 목록")')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('새 발주서 생성', async ({ page }) => {
    await page.goto('/orders/new');
    
    // 기본 정보 입력
    await page.selectOption('select[name="projectId"]', { index: 1 });
    await page.selectOption('select[name="vendorId"]', { index: 1 });
    await page.fill('input[name="requestDate"]', '2025-08-29');
    
    // 품목 추가
    await page.click('button:has-text("품목 추가")');
    await page.selectOption('select[name="items.0.itemId"]', { index: 1 });
    await page.fill('input[name="items.0.quantity"]', '10');
    await page.fill('input[name="items.0.unitPrice"]', '50000');
    
    // 저장
    await page.click('button:has-text("저장")');
    await expect(page.locator('text=발주서가 생성되었습니다')).toBeVisible();
  });

  test('발주서 상세 조회', async ({ page }) => {
    await page.goto('/orders');
    await page.click('table tbody tr:first-child');
    
    await expect(page.locator('h1:has-text("발주서 상세")')).toBeVisible();
    await expect(page.locator('text=프로젝트')).toBeVisible();
    await expect(page.locator('text=거래처')).toBeVisible();
  });

  test('발주서 승인 워크플로우', async ({ page }) => {
    await page.goto('/orders');
    await page.click('table tbody tr:first-child');
    
    // 승인 버튼 클릭
    await page.click('button:has-text("승인")');
    await page.fill('textarea[name="comment"]', '승인합니다');
    await page.click('button:has-text("확인")');
    
    await expect(page.locator('text=승인되었습니다')).toBeVisible();
  });

  test('엑셀 업로드 기능', async ({ page }) => {
    await page.goto('/orders/excel');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/sample-order.xlsx');
    
    await page.click('button:has-text("업로드")');
    await expect(page.locator('text=파일이 처리되었습니다')).toBeVisible();
  });
});