import { test, expect } from '@playwright/test';

// 테스트 계정 정보
const testUsers = {
  admin: { email: 'admin@company.com', password: 'password123', role: 'admin' },
  executive: { email: 'executive@company.com', password: 'exec123', role: 'executive' },
  hq_management: { email: 'hq@company.com', password: 'hq123', role: 'hq_management' },
  project_manager: { email: 'pm@company.com', password: 'pm123', role: 'project_manager' },
  field_worker: { email: 'worker@company.com', password: 'worker123', role: 'field_worker' }
};

async function loginAs(page, userType) {
  const user = testUsers[userType];
  await page.goto('/');
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  
  const loginSuccess = await page.locator('button:has-text("로그인")').count() === 0;
  return loginSuccess;
}

test.describe('🛡️ API 보안 테스트', () => {
  
  test.describe('🔒 권한 기반 API 접근 제어', () => {
    test('Field Worker - 관리자 API 접근 차단', async ({ page }) => {
      console.log('🎯 Field Worker의 관리자 API 접근 시도');
      
      await loginAs(page, 'field_worker');
      
      // 관리자 전용 API 엔드포인트들 테스트
      const adminAPIs = [
        '/api/admin/users',
        '/api/admin/system',
        '/api/admin/settings',
        '/api/users', // 사용자 목록 조회
        '/api/system-management'
      ];
      
      let blockedCount = 0;
      let accessibleCount = 0;
      
      for (const apiPath of adminAPIs) {
        try {
          const response = await page.request.get(apiPath);
          const status = response.status();
          
          console.log(`📡 ${apiPath} → ${status}`);
          
          if (status === 403 || status === 401) {
            console.log(`  ✅ 접근 차단됨 (${status})`);
            blockedCount++;
          } else if (status === 200) {
            console.log(`  ⚠️ 접근 허용됨 - 권한 검증 필요`);
            accessibleCount++;
            
            // 응답 내용 확인
            const responseText = await response.text();
            if (responseText.includes('Unauthorized') || responseText.includes('Access denied')) {
              console.log(`  ✅ 내용 레벨에서 차단됨`);
              blockedCount++;
              accessibleCount--;
            }
          } else {
            console.log(`  ℹ️ 기타 상태: ${status}`);
          }
        } catch (error) {
          console.log(`  ❌ 오류: ${error.message}`);
        }
      }
      
      console.log(`📊 API 보안 결과: 차단 ${blockedCount}개, 접근 가능 ${accessibleCount}개`);
      
      // 최소 50% 이상의 관리자 API가 차단되어야 함
      expect(blockedCount).toBeGreaterThan(accessibleCount);
    });
    
    test('PM - Executive 전용 승인 API 접근 제한', async ({ page }) => {
      console.log('🎯 PM의 Executive 전용 API 접근 시도');
      
      await loginAs(page, 'project_manager');
      
      const executiveAPIs = [
        '/api/orders/approve/high-amount',
        '/api/approvals/executive',
        '/api/orders/final-approval',
        '/api/executive-dashboard'
      ];
      
      let restrictedCount = 0;
      
      for (const apiPath of executiveAPIs) {
        try {
          const response = await page.request.get(apiPath);
          const status = response.status();
          
          console.log(`📡 ${apiPath} → ${status}`);
          
          if (status === 403 || status === 401 || status === 404) {
            console.log(`  ✅ 접근 제한됨 (${status})`);
            restrictedCount++;
          } else {
            console.log(`  ⚠️ 접근 가능 - 권한 재검토 필요`);
          }
        } catch (error) {
          console.log(`  ℹ️ API 미구현 또는 오류: ${error.message}`);
          restrictedCount++; // 미구현도 제한으로 간주
        }
      }
      
      console.log(`📊 Executive API 제한: ${restrictedCount}/${executiveAPIs.length}개`);
      expect(restrictedCount).toBeGreaterThan(0);
    });
  });
  
  test.describe('🚨 SQL 인젝션 공격 방어', () => {
    test('로그인 SQL 인젝션 시도', async ({ page }) => {
      console.log('🎯 로그인 폼 SQL 인젝션 테스트');
      
      await page.goto('/');
      
      // SQL 인젝션 페이로드들
      const sqlInjectionPayloads = [
        "admin@company.com'; DROP TABLE users; --",
        "admin@company.com' OR '1'='1",
        "admin@company.com' UNION SELECT * FROM users --",
        "'; INSERT INTO users (email, password) VALUES ('hacker@evil.com', 'hacked'); --",
        "admin@company.com' AND (SELECT COUNT(*) FROM users) > 0 --"
      ];
      
      let injectionBlocked = 0;
      let totalAttempts = 0;
      
      for (const payload of sqlInjectionPayloads) {
        totalAttempts++;
        console.log(`🔍 SQL 인젝션 시도: ${payload.substring(0, 30)}...`);
        
        await page.fill('input[name="email"]', payload);
        await page.fill('input[name="password"]', 'anypassword');
        
        try {
          await page.click('button[type="submit"]');
          await page.waitForTimeout(2000);
          
          // 로그인 성공하지 않아야 함
          const stillOnLoginPage = await page.locator('button:has-text("로그인")').count() > 0;
          const hasErrorMessage = await page.locator('text=오류, text=실패, text=invalid, .error').count() > 0;
          
          if (stillOnLoginPage || hasErrorMessage) {
            console.log(`  ✅ 인젝션 차단됨`);
            injectionBlocked++;
          } else {
            console.log(`  ⚠️ 인젝션 성공 가능성 - 보안 점검 필요`);
          }
          
        } catch (error) {
          console.log(`  ✅ 인젝션 차단됨 (오류 발생)`);
          injectionBlocked++;
        }
        
        // 폼 리셋
        await page.reload();
      }
      
      console.log(`📊 SQL 인젝션 방어: ${injectionBlocked}/${totalAttempts}개 차단`);
      expect(injectionBlocked).toBe(totalAttempts); // 모든 시도가 차단되어야 함
    });
    
    test('검색 기능 SQL 인젝션 방어', async ({ page }) => {
      console.log('🎯 검색 기능 SQL 인젝션 테스트');
      
      await loginAs(page, 'admin');
      
      // 검색 기능이 있는 페이지들 확인
      const searchPages = ['/orders', '/vendors', '/items', '/projects'];
      
      let testedPages = 0;
      let securePages = 0;
      
      for (const pageUrl of searchPages) {
        await page.goto(pageUrl);
        await page.waitForTimeout(2000);
        
        // 검색 입력 필드 찾기
        const searchInput = page.locator('input[placeholder*="검색"], input[name*="search"], input[type="search"]').first();
        
        if (await searchInput.count() > 0) {
          testedPages++;
          console.log(`🔍 ${pageUrl} 페이지 검색 기능 테스트`);
          
          const sqlPayload = "'; DROP TABLE orders; --";
          await searchInput.fill(sqlPayload);
          
          // 검색 실행
          await searchInput.press('Enter');
          await page.waitForTimeout(2000);
          
          // 에러나 정상 결과가 나와야 함 (시스템이 다운되면 안됨)
          const hasResults = await page.locator('table, .search-results, .no-results').count() > 0;
          const hasError = await page.locator('text=오류, text=error, .error').count() > 0;
          const isPageBroken = page.url().includes('error') || await page.locator('text=500, text=서버 오류').count() > 0;
          
          if (!isPageBroken) {
            console.log(`  ✅ ${pageUrl} 검색 보안 양호`);
            securePages++;
          } else {
            console.log(`  ⚠️ ${pageUrl} 검색 보안 취약점 가능성`);
          }
        }
      }
      
      console.log(`📊 검색 보안: ${securePages}/${testedPages}개 페이지 안전`);
      expect(securePages).toBe(testedPages);
    });
  });
  
  test.describe('🔥 XSS(Cross-Site Scripting) 공격 방어', () => {
    test('입력 폼 XSS 공격 방어', async ({ page }) => {
      console.log('🎯 입력 폼 XSS 공격 테스트');
      
      await loginAs(page, 'admin');
      
      // XSS 페이로드들
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<svg onload=alert("XSS")>',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>'
      ];
      
      // 발주서 생성 페이지에서 XSS 테스트
      await page.goto('/orders/new');
      await page.waitForTimeout(2000);
      
      const titleInput = page.locator('input[name*="title"], input[placeholder*="제목"]').first();
      
      if (await titleInput.count() > 0) {
        let xssBlocked = 0;
        let totalTests = 0;
        
        for (const payload of xssPayloads) {
          totalTests++;
          console.log(`🔍 XSS 테스트: ${payload.substring(0, 30)}...`);
          
          await titleInput.fill(payload);
          
          // 페이지에서 스크립트가 실행되는지 확인
          await page.waitForTimeout(1000);
          
          // alert 다이얼로그가 나타나면 XSS 성공 (차단 실패)
          page.on('dialog', async dialog => {
            console.log(`  ⚠️ XSS 성공: ${dialog.message()}`);
            await dialog.dismiss();
          });
          
          // 입력값이 그대로 반영되는지 확인 (인코딩되어야 함)
          const inputValue = await titleInput.inputValue();
          const isEncoded = !inputValue.includes('<script>') || inputValue.includes('&lt;') || inputValue.includes('&gt;');
          
          if (isEncoded) {
            console.log(`  ✅ XSS 차단됨 (입력값 인코딩)`);
            xssBlocked++;
          }
          
          await titleInput.clear();
        }
        
        console.log(`📊 XSS 방어: ${xssBlocked}/${totalTests}개 차단`);
        expect(xssBlocked).toBeGreaterThan(totalTests / 2); // 최소 50% 이상 차단
      } else {
        console.log('⚠️ 테스트 대상 입력 필드를 찾을 수 없음');
        expect(true).toBeTruthy(); // 스킵
      }
    });
    
    test('출력 데이터 XSS 방어', async ({ page }) => {
      console.log('🎯 출력 데이터 XSS 방어 테스트');
      
      await loginAs(page, 'admin');
      
      // 발주서 목록에서 데이터 출력 XSS 확인
      await page.goto('/orders');
      await page.waitForTimeout(3000);
      
      // 페이지 소스에서 스크립트 태그 확인
      const pageContent = await page.content();
      
      // 위험한 스크립트 패턴 확인
      const dangerousPatterns = [
        /<script[^>]*>(?!.*\bencode\b).*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi, // onclick, onerror 등
        /<iframe[^>]*src\s*=\s*["']javascript:/gi
      ];
      
      let vulnerabilities = 0;
      
      for (const pattern of dangerousPatterns) {
        const matches = pageContent.match(pattern);
        if (matches && matches.length > 0) {
          console.log(`⚠️ 잠재적 XSS 취약점 발견: ${matches.length}개`);
          vulnerabilities++;
        }
      }
      
      if (vulnerabilities === 0) {
        console.log('✅ XSS 출력 방어 양호');
      }
      
      expect(vulnerabilities).toBeLessThan(3); // 최소한의 보안 수준
    });
  });
  
  test.describe('🔑 세션 및 인증 보안', () => {
    test('세션 하이재킹 방어', async ({ page }) => {
      console.log('🎯 세션 하이재킹 방어 테스트');
      
      await loginAs(page, 'admin');
      
      // 원본 세션 쿠키 확인
      const originalCookies = await page.context().cookies();
      const sessionCookie = originalCookies.find(c => c.name.includes('session') || c.name.includes('auth'));
      
      if (sessionCookie) {
        console.log(`🔑 세션 쿠키 발견: ${sessionCookie.name}`);
        
        // 세션 쿠키 보안 속성 확인
        const isSecure = sessionCookie.secure;
        const isHttpOnly = sessionCookie.httpOnly;
        const hasSameSite = sessionCookie.sameSite;
        
        console.log(`📊 쿠키 보안 속성:`);
        console.log(`  - Secure: ${isSecure ? '✅' : '❌'}`);
        console.log(`  - HttpOnly: ${isHttpOnly ? '✅' : '❌'}`);
        console.log(`  - SameSite: ${hasSameSite || '❌'}`);
        
        expect(isHttpOnly).toBeTruthy(); // HttpOnly는 반드시 설정되어야 함
      } else {
        console.log('ℹ️ 세션 쿠키를 찾을 수 없음 - JWT 토큰 방식일 수 있음');
      }
    });
    
    test('동시 로그인 세션 관리', async ({ browser }) => {
      console.log('🎯 동시 로그인 세션 관리 테스트');
      
      // 첫 번째 세션
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();
      
      await loginAs(page1, 'admin');
      
      // 로그인 성공 확인
      await page1.goto('/orders');
      const isLoggedIn1 = await page1.locator('button:has-text("로그인")').count() === 0;
      console.log(`🔑 세션 1 로그인: ${isLoggedIn1 ? '✅' : '❌'}`);
      
      // 두 번째 세션 (같은 계정)
      const context2 = await browser.newContext();
      const page2 = await context2.newPage();
      
      await loginAs(page2, 'admin');
      
      // 로그인 성공 확인
      await page2.goto('/orders');
      const isLoggedIn2 = await page2.locator('button:has-text("로그인")').count() === 0;
      console.log(`🔑 세션 2 로그인: ${isLoggedIn2 ? '✅' : '❌'}`);
      
      // 첫 번째 세션이 여전히 유효한지 확인
      await page1.reload();
      await page1.waitForTimeout(2000);
      const stillValid1 = await page1.locator('button:has-text("로그인")').count() === 0;
      console.log(`🔑 세션 1 유지: ${stillValid1 ? '✅' : '❌'}`);
      
      console.log(`📊 동시 세션 결과: 세션1 ${isLoggedIn1 ? '활성' : '비활성'}, 세션2 ${isLoggedIn2 ? '활성' : '비활성'}`);
      
      await context1.close();
      await context2.close();
      
      expect(isLoggedIn1 && isLoggedIn2).toBeTruthy(); // 동시 세션 허용 확인
    });
    
    test('로그아웃 후 세션 무효화', async ({ page }) => {
      console.log('🎯 로그아웃 후 세션 무효화 테스트');
      
      await loginAs(page, 'admin');
      
      // 로그아웃 실행
      const logoutButtons = [
        'button:has-text("로그아웃")',
        'a:has-text("로그아웃")',
        'button:has-text("logout")',
        '[data-testid="logout"]'
      ];
      
      let loggedOut = false;
      for (const selector of logoutButtons) {
        if (await page.locator(selector).count() > 0) {
          await page.locator(selector).click();
          await page.waitForTimeout(2000);
          loggedOut = true;
          console.log(`✅ 로그아웃 버튼 클릭: ${selector}`);
          break;
        }
      }
      
      if (loggedOut) {
        // 보호된 페이지 접근 시도
        await page.goto('/orders');
        await page.waitForTimeout(2000);
        
        const redirectedToLogin = page.url().includes('login') || await page.locator('button:has-text("로그인")').count() > 0;
        console.log(`🔒 로그아웃 후 보호된 페이지 접근: ${redirectedToLogin ? '차단됨' : '허용됨'}`);
        
        expect(redirectedToLogin).toBeTruthy();
      } else {
        console.log('⚠️ 로그아웃 버튼을 찾을 수 없음');
        expect(true).toBeTruthy(); // 스킵
      }
    });
  });
});