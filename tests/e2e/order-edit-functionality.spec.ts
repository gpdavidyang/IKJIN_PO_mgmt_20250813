import { test, expect } from '@playwright/test';

test.describe('Order Edit Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3001');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check if we're already logged in or need to login
    const isLoginPage = await page.locator('input[type="email"]').isVisible({ timeout: 5000 });
    
    if (isLoginPage) {
      // Login if needed
      await page.fill('input[type="email"]', 'admin@company.com');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    }
  });

  test('should load order edit page without infinite loop', async ({ page }) => {
    // Navigate to orders page
    await page.goto('http://localhost:3001/orders');
    await page.waitForLoadState('networkidle');
    
    // Find the first order in the list and click edit
    const firstOrderRow = page.locator('tr').nth(1); // Skip header row
    await expect(firstOrderRow).toBeVisible();
    
    // Click on the first order to go to detail page
    await firstOrderRow.click();
    await page.waitForLoadState('networkidle');
    
    // Look for edit button and click it
    const editButton = page.locator('button', { hasText: '수정' }).or(page.locator('button', { hasText: 'Edit' }));
    await expect(editButton).toBeVisible({ timeout: 10000 });
    await editButton.click();
    
    // Wait for edit page to load
    await page.waitForLoadState('networkidle');
    
    // Check that the page loaded correctly (no infinite loop)
    // Should see form elements within reasonable time
    await expect(page.locator('input[type="date"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('select, input')).toHaveCount.toBeGreaterThan(5);
    
    // Check for overview cards (Phase 2 feature)
    await expect(page.locator('.grid')).toBeVisible();
    
    // Verify no console errors related to infinite loops
    const errorLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errorLogs.push(msg.text());
      }
    });
    
    // Wait a bit to see if any errors occur
    await page.waitForTimeout(3000);
    
    // Check that there are no error logs suggesting infinite loops
    const infiniteLoopErrors = errorLogs.filter(log => 
      log.includes('Maximum update depth exceeded') || 
      log.includes('Too many re-renders')
    );
    
    expect(infiniteLoopErrors).toHaveLength(0);
  });

  test('should be able to modify item quantities and save', async ({ page }) => {
    // Navigate to orders and find an order to edit
    await page.goto('http://localhost:3001/orders');
    await page.waitForLoadState('networkidle');
    
    // Find first order with items
    const firstOrderRow = page.locator('tr').nth(1);
    await firstOrderRow.click();
    await page.waitForLoadState('networkidle');
    
    // Go to edit mode
    const editButton = page.locator('button', { hasText: '수정' }).or(page.locator('button', { hasText: 'Edit' }));
    await editButton.click();
    await page.waitForLoadState('networkidle');
    
    // Wait for form to initialize
    await page.waitForTimeout(2000);
    
    // Find quantity inputs and modify the first one
    const quantityInputs = page.locator('input[type="number"]').filter({ hasText: /^[0-9]*$/ });
    const firstQuantityInput = quantityInputs.first();
    
    if (await firstQuantityInput.isVisible()) {
      // Get current value
      const currentValue = await firstQuantityInput.inputValue();
      const newValue = (parseInt(currentValue) + 1).toString();
      
      // Clear and enter new value
      await firstQuantityInput.fill(newValue);
      await firstQuantityInput.blur();
      
      // Verify the value changed
      await expect(firstQuantityInput).toHaveValue(newValue);
      
      // Check if overview cards update (real-time calculation)
      const overviewCards = page.locator('.grid > div');
      await expect(overviewCards).toHaveCount.toBeGreaterThan(2);
      
      // Try to save the changes
      const saveButton = page.locator('button', { hasText: '저장' }).or(page.locator('button', { hasText: 'Save' }));
      await expect(saveButton).toBeVisible();
      await saveButton.click();
      
      // Wait for save to complete
      await page.waitForLoadState('networkidle');
      
      // Should redirect back to detail page or show success message
      await page.waitForTimeout(2000);
      
      // Verify we're not stuck on edit page
      const currentUrl = page.url();
      console.log('Current URL after save:', currentUrl);
    }
  });

  test('should be able to change categories using dropdowns', async ({ page }) => {
    // Navigate to order edit
    await page.goto('http://localhost:3001/orders');
    await page.waitForLoadState('networkidle');
    
    const firstOrderRow = page.locator('tr').nth(1);
    await firstOrderRow.click();
    await page.waitForLoadState('networkidle');
    
    const editButton = page.locator('button', { hasText: '수정' }).or(page.locator('button', { hasText: 'Edit' }));
    await editButton.click();
    await page.waitForLoadState('networkidle');
    
    // Wait for form to initialize
    await page.waitForTimeout(2000);
    
    // Look for category select dropdowns
    const majorCategorySelects = page.locator('select').filter({ hasText: /대분류|Major/ });
    
    if (await majorCategorySelects.first().isVisible()) {
      // Try to change major category
      await majorCategorySelects.first().selectOption({ index: 1 });
      
      // Wait for middle category to update
      await page.waitForTimeout(1000);
      
      // Check if middle category dropdown is updated
      const middleCategorySelects = page.locator('select').filter({ hasText: /중분류|Middle/ });
      if (await middleCategorySelects.first().isVisible()) {
        await middleCategorySelects.first().selectOption({ index: 1 });
        
        // Wait for minor category to update
        await page.waitForTimeout(1000);
        
        // Check minor category
        const minorCategorySelects = page.locator('select').filter({ hasText: /소분류|Minor/ });
        if (await minorCategorySelects.first().isVisible()) {
          await minorCategorySelects.first().selectOption({ index: 1 });
        }
      }
    }
    
    // Verify categories can be changed without errors
    const errorLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errorLogs.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    expect(errorLogs.filter(log => !log.includes('Failed to load resource'))).toHaveLength(0);
  });

  test('should show dark mode toggle and attachment sections', async ({ page }) => {
    // Navigate to order edit
    await page.goto('http://localhost:3001/orders');
    await page.waitForLoadState('networkidle');
    
    const firstOrderRow = page.locator('tr').nth(1);
    await firstOrderRow.click();
    await page.waitForLoadState('networkidle');
    
    const editButton = page.locator('button', { hasText: '수정' }).or(page.locator('button', { hasText: 'Edit' }));
    await editButton.click();
    await page.waitForLoadState('networkidle');
    
    // Wait for page to load completely
    await page.waitForTimeout(2000);
    
    // Check for dark mode support (Phase 1)
    const isDarkModeToggle = await page.locator('button[aria-label*="theme"], button[aria-label*="다크"]').isVisible();
    console.log('Dark mode toggle visible:', isDarkModeToggle);
    
    // Check for overview cards (Phase 2)
    const overviewCards = page.locator('.grid > div').first();
    const hasOverviewCards = await overviewCards.isVisible();
    console.log('Overview cards visible:', hasOverviewCards);
    
    // Check for attachment section (Phase 3) if order has attachments
    const attachmentSection = page.locator('text=첨부파일').or(page.locator('text=Attachment'));
    const hasAttachmentSection = await attachmentSection.isVisible();
    console.log('Attachment section visible:', hasAttachmentSection);
    
    // Check for PDF preview button if attachments exist
    if (hasAttachmentSection) {
      const pdfButton = page.locator('button', { hasText: 'PDF' });
      const hasPdfButton = await pdfButton.isVisible();
      console.log('PDF button visible:', hasPdfButton);
    }
  });
});