import { chromium } from 'playwright';

async function testEmailModals() {
  console.log('🚀 Starting email modal tests...');
  
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Add detailed logging
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  try {
    // 1. 대시보드 접속
    console.log('📊 Testing Dashboard email modal...');
    await page.goto('http://localhost:3000');
    
    // Wait for page load and check if we're redirected to login
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Check page title and content
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);
    
    const pageContent = await page.textContent('body');
    console.log('Page contains "대시보드":', pageContent.includes('대시보드'));
    console.log('Page contains "로그인":', pageContent.includes('로그인'));
    console.log('Page contains "Login":', pageContent.includes('Login'));
    
    if (currentUrl.includes('/login')) {
      console.log('🔐 Need to login first...');
      
      // Check if login form exists
      const emailInput = await page.locator('input[type="email"]').count();
      const passwordInput = await page.locator('input[type="password"]').count();
      console.log('Email input found:', emailInput);
      console.log('Password input found:', passwordInput);
      
      if (emailInput > 0 && passwordInput > 0) {
        await page.fill('input[type="email"]', 'test@test.com');
        await page.fill('input[type="password"]', 'test123');
        await page.click('button[type="submit"]');
        
        // Wait for redirect to dashboard
        await page.waitForTimeout(3000);
        console.log('After login URL:', page.url());
      }
    }
    
    // Check if we're on dashboard
    const isDashboard = await page.locator('h1:has-text("대시보드")').count() > 0;
    console.log('Dashboard heading found:', isDashboard);
    
    if (isDashboard) {
      console.log('✅ Dashboard loaded successfully');
      
      // Look for email buttons in recent orders table
      const emailButtons = await page.locator('button[title="이메일 전송"]').count();
      console.log(`📧 Found ${emailButtons} email buttons in dashboard`);
      
      if (emailButtons > 0) {
        // Click first email button
        await page.locator('button[title="이메일 전송"]').first().click();
        await page.waitForTimeout(1000);
        
        // Check if email modal opened
        const emailModal = await page.locator('[role="dialog"]:has-text("이메일 발송")').count();
        if (emailModal > 0) {
          console.log('✅ Email modal opened from dashboard');
          
          // Check for attachment selection UI
          const attachmentSection = await page.locator('text="첨부파일"').count();
          if (attachmentSection > 0) {
            console.log('✅ Attachment selection UI found');
          } else {
            console.log('❓ No attachment section visible (may be empty)');
          }
          
          // Close modal
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        } else {
          console.log('❌ Email modal did not open from dashboard');
        }
      }
    } else {
      console.log('❌ Could not access dashboard');
    }
    
    // 2. 발주서 관리 페이지 테스트
    console.log('📋 Testing Orders page email modal...');
    await page.goto('http://localhost:3000/orders');
    await page.waitForTimeout(2000);
    
    const isOrdersPage = await page.locator('h1:has-text("발주서 관리")').count() > 0;
    
    if (isOrdersPage) {
      console.log('✅ Orders page loaded successfully');
      
      // Look for email icons in orders table
      const emailIcons = await page.locator('button[title*="이메일"]').count();
      console.log(`📧 Found ${emailIcons} email buttons in orders page`);
      
      if (emailIcons > 0) {
        // Try to click first email button
        await page.locator('button[title*="이메일"]').first().click();
        await page.waitForTimeout(1000);
        
        // Check if email modal opened
        const emailModal = await page.locator('[role="dialog"]:has-text("이메일")').count();
        if (emailModal > 0) {
          console.log('✅ Email modal opened from orders page');
          
          // Check unified interface
          const unifiedInterface = await page.locator('text="첨부파일 선택"').count();
          if (unifiedInterface > 0) {
            console.log('✅ Unified attachment interface confirmed');
          }
          
          // Close modal
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        }
      }
    }
    
    // 3. 발주서 상세 페이지 테스트 (if we can find an order)
    console.log('📄 Testing Order detail email modal...');
    
    // Try to click on first order number to go to detail
    const firstOrderLink = await page.locator('button:has-text("PO-")').first();
    if (await firstOrderLink.count() > 0) {
      await firstOrderLink.click();
      await page.waitForTimeout(2000);
      
      // Look for email send button in detail page
      const detailEmailButton = await page.locator('button:has-text("이메일 발송")').count();
      if (detailEmailButton > 0) {
        console.log('✅ Found email button in order detail');
        
        await page.locator('button:has-text("이메일 발송")').first().click();
        await page.waitForTimeout(1000);
        
        const emailModal = await page.locator('[role="dialog"]:has-text("이메일")').count();
        if (emailModal > 0) {
          console.log('✅ Email modal opened from order detail');
          
          // Check for consistent UI
          const attachmentUI = await page.locator('text="첨부파일"').count();
          console.log(`📎 Attachment UI sections found: ${attachmentUI}`);
        }
      }
    }
    
    console.log('🎉 Email modal tests completed!');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
testEmailModals().catch(console.error);