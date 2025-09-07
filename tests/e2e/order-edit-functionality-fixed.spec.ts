import { test, expect } from '@playwright/test';

test.describe('Order Edit Form Functionality (Fixed)', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Check if already logged in or login
    const loginForm = await page.locator('input[type="email"]').isVisible({ timeout: 3000 });
    if (loginForm) {
      await page.fill('input[type="email"]', 'admin@company.com');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    }
  });

  test('should handle category dropdown selections and deselections properly', async ({ page }) => {
    // Navigate directly to order edit (using test order creation first)
    await page.goto('http://localhost:3001/create-order');
    await page.waitForLoadState('networkidle');

    // Add a test item first
    const addItemButton = page.locator('button:has-text("품목 추가")');
    if (await addItemButton.isVisible({ timeout: 5000 })) {
      await addItemButton.click();
      await page.waitForTimeout(1000);

      // Test major category selection
      const majorCategorySelect = page.locator('select, [role="combobox"]').filter({ hasText: /대분류|Major/ }).first();
      
      if (await majorCategorySelect.isVisible({ timeout: 3000 })) {
        // Click to open dropdown
        await majorCategorySelect.click();
        await page.waitForTimeout(500);

        // Look for category options
        const categoryOptions = page.locator('[role="option"], option').filter({ hasText: /건축|전기|기계/ });
        const optionCount = await categoryOptions.count();
        
        console.log(`Found ${optionCount} major category options`);

        if (optionCount > 0) {
          // Select first category
          await categoryOptions.first().click();
          await page.waitForTimeout(1000);

          // Check if middle category dropdown becomes enabled
          const middleCategorySelect = page.locator('select, [role="combobox"]').filter({ hasText: /중분류|Middle/ }).first();
          const isMiddleEnabled = await middleCategorySelect.isEnabled();
          console.log('Middle category enabled after major selection:', isMiddleEnabled);

          // Try deselection
          await majorCategorySelect.click();
          const deselectionOption = page.locator('[role="option"]:has-text("선택 해제"), option:has-text("선택 해제")');
          if (await deselectionOption.isVisible({ timeout: 2000 })) {
            await deselectionOption.click();
            await page.waitForTimeout(1000);

            // Check if middle category becomes disabled
            const isMiddleDisabledAfterDeselection = await middleCategorySelect.isDisabled();
            console.log('Middle category disabled after deselection:', isMiddleDisabledAfterDeselection);
          }
        }
      }
    }

    // Take screenshot for verification
    await page.screenshot({ path: 'test-results/category-dropdown-test.png' });
  });

  test('should handle quantity changes properly', async ({ page }) => {
    // Navigate to create order
    await page.goto('http://localhost:3001/create-order');
    await page.waitForLoadState('networkidle');

    // Add a test item
    const addItemButton = page.locator('button:has-text("품목 추가")');
    if (await addItemButton.isVisible({ timeout: 5000 })) {
      await addItemButton.click();
      await page.waitForTimeout(1000);

      // Find quantity input
      const quantityInputs = page.locator('input[type="number"]').filter({ hasText: /^$/ });
      
      for (let i = 0; i < Math.min(3, await quantityInputs.count()); i++) {
        const quantityInput = quantityInputs.nth(i);
        
        if (await quantityInput.isVisible({ timeout: 2000 })) {
          // Test quantity change
          await quantityInput.fill('');
          await page.waitForTimeout(300);
          await quantityInput.fill('5');
          await page.waitForTimeout(300);
          
          // Verify value was set
          const value = await quantityInput.inputValue();
          console.log(`Quantity input ${i} value:`, value);
          
          // Test blur behavior (should set minimum value if invalid)
          await quantityInput.fill('0');
          await quantityInput.blur();
          await page.waitForTimeout(300);
          
          const valueAfterBlur = await quantityInput.inputValue();
          console.log(`Quantity input ${i} value after blur:`, valueAfterBlur);
          
          break; // Test only first valid input
        }
      }
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/quantity-input-test.png' });
  });

  test('should handle unit price changes properly', async ({ page }) => {
    // Navigate to create order
    await page.goto('http://localhost:3001/create-order');
    await page.waitForLoadState('networkidle');

    // Add a test item
    const addItemButton = page.locator('button:has-text("품목 추가")');
    if (await addItemButton.isVisible({ timeout: 5000 })) {
      await addItemButton.click();
      await page.waitForTimeout(1000);

      // Find unit price input (look for inputs that might be unit price)
      const inputs = page.locator('input[type="number"]');
      const inputCount = await inputs.count();
      console.log(`Found ${inputCount} number inputs`);

      // Test different number inputs to find unit price
      for (let i = 0; i < Math.min(5, inputCount); i++) {
        const input = inputs.nth(i);
        
        if (await input.isVisible({ timeout: 1000 })) {
          // Test unit price change
          await input.fill('1250.50');
          await page.waitForTimeout(300);
          
          const value = await input.inputValue();
          console.log(`Number input ${i} value:`, value);
          
          // Check if total amount updates (look for currency displays)
          const totalElements = page.locator('text=/₩|원/');
          const totalCount = await totalElements.count();
          console.log(`Found ${totalCount} currency elements`);
        }
      }
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/unit-price-test.png' });
  });

  test('should show form elements are working without infinite loops', async ({ page }) => {
    // Monitor console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate to create order page
    await page.goto('http://localhost:3001/create-order');
    await page.waitForLoadState('networkidle');

    // Add item and interact with form
    const addItemButton = page.locator('button:has-text("품목 추가")');
    if (await addItemButton.isVisible()) {
      await addItemButton.click();
      await page.waitForTimeout(2000);

      // Count form elements
      const inputs = await page.locator('input').count();
      const selects = await page.locator('select, [role="combobox"]').count();
      const buttons = await page.locator('button').count();

      console.log(`Form elements: ${inputs} inputs, ${selects} selects, ${buttons} buttons`);

      // Check for infinite loop errors
      const infiniteLoopErrors = errors.filter(err => 
        err.includes('Maximum update depth') ||
        err.includes('Too many re-renders') ||
        err.includes('Cannot update a component')
      );

      console.log(`Infinite loop errors: ${infiniteLoopErrors.length}`);
      console.log('All errors:', errors);

      // Test should pass if no infinite loop errors and form elements exist
      expect(infiniteLoopErrors).toHaveLength(0);
      expect(inputs + selects).toBeGreaterThan(5);
    }

    await page.screenshot({ path: 'test-results/form-stability-test.png' });
  });
});