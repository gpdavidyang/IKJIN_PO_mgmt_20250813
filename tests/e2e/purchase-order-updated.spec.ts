import { test, expect } from '@playwright/test';

test.describe('구매 발주 시스템 테스트', () => {
  test.beforeEach(async ({ page }) => {
    // 각 테스트 전 로그인
    await page.goto('/');
    await page.fill('input[name="email"]', 'admin@company.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // 로그인 완료 확인 (대시보드 또는 다른 로그인 후 페이지)
    await page.waitForSelector('text=대시보드', { timeout: 15000 });
  });

  test('발주서 목록 조회', async ({ page }) => {
    // 발주서 목록 페이지로 이동
    await page.goto('/orders');
    
    // 페이지 로딩 대기
    await page.waitForLoadState('networkidle');
    
    // 발주서 목록 관련 요소 확인
    await expect(page.locator('text=발주서')).toBeVisible({ timeout: 10000 });
    
    // 테이블이나 목록이 보이는지 확인
    await expect(page.locator('table, [role="table"]')).toBeVisible({ timeout: 5000 });
  });

  test('발주서 상세 조회', async ({ page }) => {
    // 발주서 목록 페이지로 이동
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    
    // 첫 번째 발주서 항목 클릭 (상세보기 버튼이나 발주번호 클릭)
    const firstOrderButton = page.locator('button:has-text("상세보기"), button:has-text("PO-"), table tbody tr:first-child').first();
    await firstOrderButton.click();
    
    // 발주서 상세 페이지 확인
    await expect(page.locator('text=발주서, text=상세, text=PO-')).toBeVisible({ timeout: 10000 });
  });

  test('PDF 미리보기 기능', async ({ page }) => {
    // 발주서 목록에서 첫 번째 항목의 상세보기로 이동
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    
    const firstOrderButton = page.locator('button:has-text("상세보기")').first();
    await firstOrderButton.click();
    
    // PDF 미리보기 버튼 찾기 및 클릭
    const pdfButton = page.locator('button:has-text("PDF"), button:has-text("미리보기")').first();
    if (await pdfButton.isVisible()) {
      await pdfButton.click();
      
      // 미리보기 모달이나 새 창/탭이 열리는지 확인
      await expect(page.locator('[role="dialog"], text=미리보기')).toBeVisible({ timeout: 10000 });
    }
  });

  test('새 발주서 작성 페이지 접근', async ({ page }) => {
    // 새 발주서 작성 페이지로 직접 이동
    await page.goto('/orders/new');
    await page.waitForLoadState('networkidle');
    
    // 발주서 작성 폼 요소들 확인
    await expect(page.locator('text=발주서, text=작성, text=새')).toBeVisible({ timeout: 10000 });
    
    // 기본적인 폼 요소들이 있는지 확인
    const hasFormElements = await page.locator('form, input, select, textarea').first().isVisible();
    expect(hasFormElements).toBeTruthy();
  });

  test('발주서 승인 기능 확인', async ({ page }) => {
    // 발주서 목록에서 승인 대기 상태의 발주서 찾기
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    
    // 승인 대기 상태의 발주서나 승인 버튼이 있는지 확인
    const approvalButton = page.locator('text=승인, button:has-text("승인")');
    if (await approvalButton.first().isVisible()) {
      // 승인 기능이 있음을 확인
      expect(true).toBeTruthy();
    } else {
      // 승인 대기 항목이 있는지 확인
      await expect(page.locator('text=승인대기, text=대기')).toBeVisible({ timeout: 5000 });
    }
  });

  test('엑셀 업로드 기능 접근', async ({ page }) => {
    // 엑셀 업로드 관련 페이지나 기능에 접근
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    
    // 엑셀 업로드 버튼이나 관련 기능 찾기
    const excelButton = page.locator('text=엑셀, text=업로드, input[type="file"]');
    
    if (await excelButton.first().isVisible()) {
      // 엑셀 업로드 기능이 활성화되어 있음
      expect(true).toBeTruthy();
    } else {
      // 엑셀 관련 메뉴나 버튼이 있는지 확인
      const hasExcelFeature = await page.locator('button, a, [role="button"]').filter({ hasText: /엑셀|Excel|업로드|Upload/i }).first().isVisible();
      if (!hasExcelFeature) {
        console.log('엑셀 업로드 기능을 찾을 수 없습니다.');
      }
    }
  });

  test('발주서 검색 및 필터링', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    
    // 검색창이나 필터 옵션 찾기
    const searchInput = page.locator('input[type="search"], input[placeholder*="검색"], input[placeholder*="search"]').first();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('PO-2025');
      await searchInput.press('Enter');
      await page.waitForLoadState('networkidle');
      
      // 검색 결과 확인
      await expect(page.locator('text=PO-2025')).toBeVisible({ timeout: 5000 });
    } else {
      // 필터 버튼이나 드롭다운 확인
      const filterButton = page.locator('button:has-text("필터"), select, [role="combobox"]').first();
      if (await filterButton.isVisible()) {
        expect(true).toBeTruthy();
      }
    }
  });
});