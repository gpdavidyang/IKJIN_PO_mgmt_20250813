import { test, expect, Page } from '@playwright/test';

// Helper functions
async function selectWorkflowMethod(page: Page, method: 'excel' | 'standard') {
  await page.waitForSelector('[data-testid="method-selection"]');
  
  if (method === 'excel') {
    await page.click('button:has-text("엑셀 발주서 선택")');
  } else {
    await page.click('button:has-text("표준 발주서 선택")');
  }
  
  // Wait for navigation to complete
  await page.waitForTimeout(500);
}

async function checkProgressTracker(page: Page, expectedStep: string, expectedProgress: number) {
  // Check current step
  const currentStepText = await page.textContent('[data-testid="current-step-label"]');
  expect(currentStepText).toContain(expectedStep);
  
  // Check progress percentage
  const progressText = await page.textContent('[data-testid="progress-percentage"]');
  expect(progressText).toContain(`${expectedProgress}%`);
}

test.describe('Unified Order Workflow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the order creation page
    await page.goto('/orders/create');
    await page.waitForLoadState('networkidle');
  });

  test('should display horizontal progress tracker at the top', async ({ page }) => {
    // Check that progress tracker is visible and at the top
    const progressTracker = await page.locator('[data-testid="horizontal-progress-tracker"]');
    await expect(progressTracker).toBeVisible();
    
    // Verify it appears before main content
    const mainContent = await page.locator('[data-testid="workflow-main-content"]');
    const trackerBox = await progressTracker.boundingBox();
    const contentBox = await mainContent.boundingBox();
    
    expect(trackerBox?.y).toBeLessThan(contentBox?.y || 0);
  });

  test('should complete Excel workflow from start to finish', async ({ page }) => {
    // Step 1: Select Excel method
    await selectWorkflowMethod(page, 'excel');
    await checkProgressTracker(page, '발주서 작성', 20);
    
    // Step 2: Upload Excel file
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/test-order.xlsx');
    
    // Wait for file processing
    await page.waitForSelector('[data-testid="file-upload-success"]');
    
    // Click next
    await page.click('button:has-text("다음")');
    await checkProgressTracker(page, '승인 처리', 40);
    
    // Step 3: Approve
    await page.click('button:has-text("승인")');
    await page.click('button:has-text("다음")');
    await checkProgressTracker(page, '후처리', 60);
    
    // Step 4: Process
    await page.click('button:has-text("처리 시작")');
    
    // Wait for processing to complete
    await page.waitForSelector('[data-testid="processing-complete"]', { timeout: 30000 });
    
    // Step 5: Complete
    await checkProgressTracker(page, '완료', 100);
    await expect(page.locator('text=발주서가 성공적으로 처리되었습니다')).toBeVisible();
  });

  test('should complete Standard workflow from start to finish', async ({ page }) => {
    // Step 1: Select Standard method
    await selectWorkflowMethod(page, 'standard');
    
    // Step 2: Fill out form
    await page.fill('[name="orderNumber"]', 'PO-2024-001');
    await page.fill('[name="projectName"]', '테스트 프로젝트');
    await page.selectOption('[name="vendorId"]', { label: '테스트 거래처' });
    
    // Add items
    await page.click('button:has-text("품목 추가")');
    await page.fill('[name="items[0].name"]', '테스트 품목');
    await page.fill('[name="items[0].quantity"]', '10');
    await page.fill('[name="items[0].unitPrice"]', '10000');
    
    // Submit form
    await page.click('button:has-text("다음")');
    
    // Continue through remaining steps...
    await page.click('button:has-text("승인")');
    await page.click('button:has-text("다음")');
    await page.click('button:has-text("처리 시작")');
    
    await page.waitForSelector('[data-testid="processing-complete"]', { timeout: 30000 });
    await expect(page.locator('text=발주서가 성공적으로 처리되었습니다')).toBeVisible();
  });

  test('should allow navigation between steps', async ({ page }) => {
    // Select method and go to create step
    await selectWorkflowMethod(page, 'excel');
    
    // Navigate back
    await page.click('button:has-text("이전")');
    await expect(page.locator('[data-testid="method-selection"]')).toBeVisible();
    
    // Navigate forward again
    await selectWorkflowMethod(page, 'standard');
    await expect(page.locator('[data-testid="standard-form"]')).toBeVisible();
  });

  test('should save and restore progress', async ({ page }) => {
    // Start workflow
    await selectWorkflowMethod(page, 'standard');
    
    // Fill some data
    await page.fill('[name="orderNumber"]', 'PO-SAVE-TEST');
    
    // Save progress
    await page.click('button:has-text("저장")');
    await expect(page.locator('text=진행 상황이 저장되었습니다')).toBeVisible();
    
    // Refresh page
    await page.reload();
    
    // Check that progress is restored
    await page.waitForSelector('[data-testid="standard-form"]');
    const orderNumber = await page.inputValue('[name="orderNumber"]');
    expect(orderNumber).toBe('PO-SAVE-TEST');
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Select Excel method
    await selectWorkflowMethod(page, 'excel');
    
    // Upload invalid file
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/invalid-file.txt');
    
    // Check error message
    await expect(page.locator('[data-testid="upload-error"]')).toBeVisible();
    await expect(page.locator('text=올바른 엑셀 파일을 선택해주세요')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check mobile-optimized elements
    await expect(page.locator('text=선택').first()).toBeVisible(); // Short label
    await expect(page.locator('text=방식 선택')).not.toBeVisible(); // Full label hidden
    
    // Check that buttons are full width
    const nextButton = await page.locator('button:has-text("다음")');
    const buttonBox = await nextButton.boundingBox();
    expect(buttonBox?.width).toBeGreaterThan(300);
  });

  test('should disable navigation during processing', async ({ page }) => {
    // Navigate to process step
    await selectWorkflowMethod(page, 'excel');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/test-order.xlsx');
    await page.waitForSelector('[data-testid="file-upload-success"]');
    await page.click('button:has-text("다음")');
    await page.click('button:has-text("승인")');
    await page.click('button:has-text("다음")');
    
    // Start processing
    await page.click('button:has-text("처리 시작")');
    
    // Check that navigation is disabled
    await expect(page.locator('button:has-text("이전")')).toBeDisabled();
    await expect(page.locator('button:has-text("저장")')).toBeDisabled();
  });

  test('should show processing animation', async ({ page }) => {
    // Navigate to process step
    await selectWorkflowMethod(page, 'excel');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/test-order.xlsx');
    await page.waitForSelector('[data-testid="file-upload-success"]');
    await page.click('button:has-text("다음")');
    await page.click('button:has-text("승인")');
    await page.click('button:has-text("다음")');
    
    // Start processing
    await page.click('button:has-text("처리 시작")');
    
    // Check for processing indicators
    await expect(page.locator('[data-testid="processing-spinner"]')).toBeVisible();
    await expect(page.locator('text=처리 중')).toBeVisible();
    await expect(page.locator('.animate-pulse')).toBeVisible();
  });

  test('should handle cancel action', async ({ page }) => {
    // Start workflow
    await selectWorkflowMethod(page, 'standard');
    
    // Click cancel
    await page.click('button:has-text("취소")');
    
    // Confirm cancellation in dialog
    await page.click('button:has-text("확인")');
    
    // Should redirect to orders list
    await expect(page).toHaveURL('/orders');
  });
});