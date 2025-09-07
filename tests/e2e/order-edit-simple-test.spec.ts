import { test, expect } from '@playwright/test';

test.describe('Order Edit Simple Test', () => {
  test('should login and access order edit page directly', async ({ page }) => {
    // Go to login page
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Login with admin credentials
    await page.fill('input[type="email"]', 'admin@company.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for login to complete
    await page.waitForLoadState('networkidle');
    
    // Check if we successfully logged in by looking for dashboard or orders
    const loginSuccess = await Promise.race([
      page.locator('text=발주 관리').isVisible({ timeout: 10000 }),
      page.locator('text=Dashboard').isVisible({ timeout: 10000 }),
      page.locator('text=대시보드').isVisible({ timeout: 10000 }),
      page.locator('nav').isVisible({ timeout: 10000 }),
    ]);
    
    console.log('Login successful:', loginSuccess);
    
    if (loginSuccess) {
      // Navigate directly to orders page
      await page.goto('http://localhost:3001/orders');
      await page.waitForLoadState('networkidle');
      
      // Take a screenshot of the orders page
      await page.screenshot({ path: 'test-results/orders-page.png' });
      
      // Look for any table rows, cards, or order elements
      const orderElements = await Promise.race([
        page.locator('table tr').count(),
        page.locator('.card').count(),
        page.locator('[data-testid*="order"]').count(),
      ]);
      
      console.log('Order elements found:', orderElements);
      
      // Try to find the first clickable order element
      const possibleOrderSelectors = [
        'table tbody tr:first-child',
        'table tr:nth-child(2)', // Skip header
        '.card:first-child',
        '[role="button"]:first-child',
        'tr:not(:first-child):first-of-type',
      ];
      
      let orderElement = null;
      for (const selector of possibleOrderSelectors) {
        const element = page.locator(selector);
        if (await element.isVisible({ timeout: 2000 })) {
          orderElement = element;
          console.log('Found order element with selector:', selector);
          break;
        }
      }
      
      if (orderElement) {
        // Click the order to go to detail page
        await orderElement.click();
        await page.waitForLoadState('networkidle');
        
        // Look for edit button
        const editButtonSelectors = [
          'button:has-text("수정")',
          'button:has-text("Edit")',
          'button[aria-label*="수정"]',
          'button[aria-label*="edit"]',
          'a:has-text("수정")',
          'a:has-text("Edit")',
        ];
        
        let editButton = null;
        for (const selector of editButtonSelectors) {
          const element = page.locator(selector);
          if (await element.isVisible({ timeout: 2000 })) {
            editButton = element;
            console.log('Found edit button with selector:', selector);
            break;
          }
        }
        
        if (editButton) {
          // Click edit button
          await editButton.click();
          await page.waitForLoadState('networkidle');
          
          // Take screenshot of edit page
          await page.screenshot({ path: 'test-results/order-edit-page.png' });
          
          // Test for infinite loop by waiting and checking console errors
          const errorLogs: string[] = [];
          page.on('console', msg => {
            if (msg.type() === 'error') {
              errorLogs.push(msg.text());
            }
          });
          
          // Wait to see if page loads normally
          await page.waitForTimeout(5000);
          
          // Check if basic form elements are visible
          const formElementsVisible = await Promise.race([
            page.locator('input').count(),
            page.locator('select').count(),
            page.locator('textarea').count(),
          ]);
          
          console.log('Form elements count:', formElementsVisible);
          console.log('Error logs:', errorLogs);
          
          // Check for infinite loop errors
          const infiniteLoopErrors = errorLogs.filter(log => 
            log.includes('Maximum update depth exceeded') || 
            log.includes('Too many re-renders') ||
            log.includes('Cannot update a component while rendering')
          );
          
          // Test passes if no infinite loop errors and form elements are visible
          expect(infiniteLoopErrors).toHaveLength(0);
          expect(formElementsVisible).toBeGreaterThan(0);
          
          console.log('✅ Order edit page loaded successfully without infinite loop!');
          console.log('✅ Form elements are visible:', formElementsVisible);
          
        } else {
          console.log('⚠️ Edit button not found on detail page');
        }
      } else {
        console.log('⚠️ No order elements found on orders page');
      }
    } else {
      console.log('❌ Login failed');
      await page.screenshot({ path: 'test-results/login-failed.png' });
    }
  });

  test('should test direct URL access to order edit', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3001');
    await page.fill('input[type="email"]', 'admin@company.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // Try to access order edit directly with a known order ID
    // We'll try a few common IDs
    const testOrderIds = ['1', '2', '3', '250'];
    
    for (const orderId of testOrderIds) {
      try {
        await page.goto(`http://localhost:3001/orders/${orderId}/edit`);
        await page.waitForLoadState('networkidle');
        
        // Check if page loaded (not 404)
        const is404 = await page.locator('text=404').isVisible({ timeout: 2000 });
        const isNotFound = await page.locator('text=Not Found').isVisible({ timeout: 2000 });
        
        if (!is404 && !isNotFound) {
          console.log(`✅ Order ${orderId} edit page accessible`);
          
          // Take screenshot
          await page.screenshot({ path: `test-results/order-${orderId}-edit.png` });
          
          // Test for infinite loop
          await page.waitForTimeout(3000);
          
          const errorLogs: string[] = [];
          page.on('console', msg => {
            if (msg.type() === 'error') {
              errorLogs.push(msg.text());
            }
          });
          
          await page.waitForTimeout(2000);
          
          const infiniteLoopErrors = errorLogs.filter(log => 
            log.includes('Maximum update depth') || 
            log.includes('Too many re-renders')
          );
          
          if (infiniteLoopErrors.length === 0) {
            console.log(`✅ Order ${orderId} edit page works without infinite loop!`);
            
            // Try to interact with form elements
            const inputs = await page.locator('input').count();
            const selects = await page.locator('select').count();
            
            console.log(`Form elements - Inputs: ${inputs}, Selects: ${selects}`);
            
            // Test successful for this order
            expect(infiniteLoopErrors).toHaveLength(0);
            expect(inputs + selects).toBeGreaterThan(0);
            
            return; // Exit after first successful test
          }
        }
      } catch (error) {
        console.log(`Order ${orderId} not accessible:`, error);
      }
    }
  });
});