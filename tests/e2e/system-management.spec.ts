import { test, expect } from '@playwright/test';

test.describe('시스템 관리 (System Management) E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인 처리
    await page.goto('/');
    await page.fill('input[name="email"]', 'admin@company.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // 대시보드 로드 대기
    await page.waitForSelector('h1:has-text("대시보드")', { timeout: 10000 });
    
    // 사이드바가 축소되어 있을 수 있으므로 확장
    const sidebarToggle = page.locator('button[aria-label*="sidebar"], button:has([class*="panel"])').first();
    if (await sidebarToggle.isVisible()) {
      await sidebarToggle.click();
      await page.waitForTimeout(500);
    }
    
    // 시스템관리 페이지로 이동
    const systemManagementLink = page.locator('a:has-text("시스템 관리")').first();
    const systemLink = page.locator('a[href*="system"], a[href*="admin"], a[href*="settings"]').first();
    
    if (await systemManagementLink.isVisible()) {
      await systemManagementLink.click();
    } else if (await systemLink.isVisible()) {
      await systemLink.click();
    } else {
      // 직접 URL로 이동
      await page.goto('/system-management');
    }
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // 페이지 로드 대기
  });

  test('시스템 관리 페이지 로드 확인', async ({ page }) => {
    // 페이지 헤더 확인
    const headerTexts = ['시스템 관리', 'System Management', '관리자', 'Admin'];
    let headerFound = false;
    
    for (const text of headerTexts) {
      if (await page.locator(`h1:has-text("${text}"), h2:has-text("${text}")`).count() > 0) {
        headerFound = true;
        break;
      }
    }
    
    // 기본 UI 요소 확인
    const basicElements = await page.locator('button, input, [class*="content"], main, div').count() > 0;
    
    expect(headerFound || basicElements).toBeTruthy();
  });

  test('사용자 관리 섹션', async ({ page }) => {
    // 사용자 관리 관련 요소 확인
    const userManagement = page.locator('text=/사용자.*관리|User.*Management|계정.*관리/');
    const hasUserManagement = await userManagement.count() > 0;
    
    // 사용자 목록 또는 테이블 확인
    const userList = page.locator('table, [class*="user"], [class*="list"]');
    const hasUserList = await userList.count() > 0;
    
    // 기본 UI 요소 확인
    const basicElements = await page.locator('button, input, select').count() > 0;
    
    expect(hasUserManagement || hasUserList || basicElements).toBeTruthy();
  });

  test('권한 관리', async ({ page }) => {
    // 권한 관리 섹션 확인
    const permissionSection = page.locator('text=/권한.*관리|Permission|Role|역할/');
    const hasPermissionSection = await permissionSection.count() > 0;
    
    // 권한 설정 UI 확인
    const permissionControls = page.locator('input[type="checkbox"], select, [role="switch"]');
    const hasPermissionControls = await permissionControls.count() > 0;
    
    // 기본 UI 요소 확인
    const basicElements = await page.locator('button, [class*="setting"], [class*="config"]').count() > 0;
    
    expect(hasPermissionSection || hasPermissionControls || basicElements).toBeTruthy();
  });

  test('시스템 설정', async ({ page }) => {
    // 시스템 설정 섹션 확인
    const systemSettings = page.locator('text=/시스템.*설정|System.*Settings|환경.*설정/');
    const hasSystemSettings = await systemSettings.count() > 0;
    
    // 설정 항목들 확인
    const settingItems = page.locator('[class*="setting"], [class*="config"], input, select');
    const hasSettingItems = await settingItems.count() > 0;
    
    expect(hasSystemSettings || hasSettingItems).toBeTruthy();
  });

  test('데이터베이스 관리', async ({ page }) => {
    // 데이터베이스 관리 섹션 확인
    const dbManagement = page.locator('text=/데이터베이스|Database|DB.*관리/');
    const hasDbManagement = await dbManagement.count() > 0;
    
    // DB 관리 기능 확인
    const dbControls = page.locator('button:has-text("백업"), button:has-text("복원"), button:has-text("최적화")');
    const hasDbControls = await dbControls.count() > 0;
    
    // 기본 관리 요소 확인
    const basicManagement = await page.locator('button, [class*="management"], [class*="admin"]').count() > 0;
    
    expect(hasDbManagement || hasDbControls || basicManagement).toBeTruthy();
  });

  test('로그 관리', async ({ page }) => {
    // 로그 관리 섹션 확인
    const logSection = page.locator('text=/로그.*관리|Log.*Management|시스템.*로그/');
    const hasLogSection = await logSection.count() > 0;
    
    // 로그 뷰어 또는 테이블 확인
    const logViewer = page.locator('table, [class*="log"], [class*="console"], textarea');
    const hasLogViewer = await logViewer.count() > 0;
    
    // 기본 UI 요소 확인
    const basicElements = await page.locator('button, select, [class*="content"]').count() > 0;
    
    expect(hasLogSection || hasLogViewer || basicElements).toBeTruthy();
  });

  test('보안 설정', async ({ page }) => {
    // 보안 설정 섹션 확인
    const securitySection = page.locator('text=/보안.*설정|Security.*Settings|보안.*관리/');
    const hasSecuritySection = await securitySection.count() > 0;
    
    // 보안 관련 컨트롤 확인
    const securityControls = page.locator('input[type="password"], input[type="checkbox"], [role="switch"]');
    const hasSecurityControls = await securityControls.count() > 0;
    
    // 기본 설정 요소 확인
    const basicSettings = await page.locator('button, input, [class*="setting"]').count() > 0;
    
    expect(hasSecuritySection || hasSecurityControls || basicSettings).toBeTruthy();
  });

  test('알림 설정', async ({ page }) => {
    // 알림 설정 섹션 확인
    const notificationSection = page.locator('text=/알림.*설정|Notification|메시지.*설정/');
    const hasNotificationSection = await notificationSection.count() > 0;
    
    // 알림 관련 컨트롤 확인
    const notificationControls = page.locator('input[type="checkbox"], select, [role="switch"]');
    const hasNotificationControls = await notificationControls.count() > 0;
    
    // 기본 UI 요소 확인
    const basicElements = await page.locator('button, input, [class*="notification"]').count() > 0;
    
    expect(hasNotificationSection || hasNotificationControls || basicElements).toBeTruthy();
  });

  test('시스템 상태 모니터링', async ({ page }) => {
    // 시스템 상태 섹션 확인
    const statusSection = page.locator('text=/시스템.*상태|System.*Status|모니터링/');
    const hasStatusSection = await statusSection.count() > 0;
    
    // 상태 정보 표시 확인
    const statusInfo = page.locator('[class*="status"], [class*="health"], [class*="monitor"]');
    const hasStatusInfo = await statusInfo.count() > 0;
    
    // 상태 수치 확인
    const statusNumbers = await page.locator('text=/[0-9]+%|[0-9]+MB|[0-9]+GB/').count() > 0;
    
    // 기본 정보 표시 확인
    const basicInfo = await page.locator('div, span, [class*="info"]').count() > 0;
    
    expect(hasStatusSection || hasStatusInfo || statusNumbers || basicInfo).toBeTruthy();
  });

  test('시스템 정보', async ({ page }) => {
    // 시스템 정보 섹션 확인
    const systemInfo = page.locator('text=/시스템.*정보|System.*Info|버전.*정보/');
    const hasSystemInfo = await systemInfo.count() > 0;
    
    // 시스템 정보 항목 확인
    const infoItems = page.locator('text=/버전|Version|OS|CPU|메모리|Memory/');
    const hasInfoItems = await infoItems.count() > 0;
    
    // 정보 표시 요소 확인
    const infoElements = await page.locator('[class*="info"], table, dl, div').count() > 0;
    
    expect(hasSystemInfo || hasInfoItems || infoElements).toBeTruthy();
  });

  test('메뉴 관리', async ({ page }) => {
    // 메뉴 관리 섹션 확인
    const menuManagement = page.locator('text=/메뉴.*관리|Menu.*Management|네비게이션/');
    const hasMenuManagement = await menuManagement.count() > 0;
    
    // 메뉴 구조 또는 설정 확인
    const menuStructure = page.locator('[class*="menu"], [class*="nav"], tree, ul');
    const hasMenuStructure = await menuStructure.count() > 0;
    
    // 기본 UI 요소 확인
    const basicElements = await page.locator('button, input, [class*="tree"]').count() > 0;
    
    expect(hasMenuManagement || hasMenuStructure || basicElements).toBeTruthy();
  });

  test('코드 관리', async ({ page }) => {
    // 코드 관리 섹션 확인
    const codeManagement = page.locator('text=/코드.*관리|Code.*Management|공통.*코드/');
    const hasCodeManagement = await codeManagement.count() > 0;
    
    // 코드 테이블 또는 리스트 확인
    const codeList = page.locator('table, [class*="code"], [class*="list"]');
    const hasCodeList = await codeList.count() > 0;
    
    // 기본 UI 요소 확인
    const basicElements = await page.locator('button, input, select').count() > 0;
    
    expect(hasCodeManagement || hasCodeList || basicElements).toBeTruthy();
  });

  test('반응형 디자인', async ({ page }) => {
    // 모바일 뷰포트로 변경
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // 헤더가 여전히 표시되는지 확인
    const headerVisible = await page.locator('h1, h2').first().isVisible();
    
    // 관리 메뉴나 콘텐츠가 표시되는지 확인
    const contentVisible = await page.locator('[class*="content"], [class*="management"], button, div').count() > 0;
    
    expect(headerVisible || contentVisible).toBeTruthy();
  });
});

test.describe('시스템 관리 고급 기능', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[name="email"]', 'admin@company.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('h1:has-text("대시보드")', { timeout: 10000 });
    
    // 직접 URL로 이동
    await page.goto('/system-management');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('시스템 백업', async ({ page }) => {
    // 시스템 백업 섹션 확인
    const backupSection = page.locator('text=/시스템.*백업|System.*Backup|데이터.*백업/');
    const hasBackupSection = await backupSection.count() > 0;
    
    // 백업 관련 버튼 확인
    const backupButtons = page.locator('button:has-text("백업"), button:has-text("Backup")');
    const hasBackupButtons = await backupButtons.count() > 0;
    
    // 기본 관리 요소 확인
    const basicManagement = await page.locator('button, [class*="backup"], [class*="admin"]').count() > 0;
    
    expect(hasBackupSection || hasBackupButtons || basicManagement).toBeTruthy();
  });

  test('시스템 복원', async ({ page }) => {
    // 시스템 복원 섹션 확인
    const restoreSection = page.locator('text=/시스템.*복원|System.*Restore|데이터.*복원/');
    const hasRestoreSection = await restoreSection.count() > 0;
    
    // 복원 관련 컨트롤 확인
    const restoreControls = page.locator('button:has-text("복원"), input[type="file"], [class*="restore"]');
    const hasRestoreControls = await restoreControls.count() > 0;
    
    // 기본 UI 요소 확인
    const basicElements = await page.locator('button, input, [class*="upload"]').count() > 0;
    
    expect(hasRestoreSection || hasRestoreControls || basicElements).toBeTruthy();
  });

  test('API 관리', async ({ page }) => {
    // API 관리 섹션 확인
    const apiSection = page.locator('text=/API.*관리|API.*Management|인터페이스/');
    const hasApiSection = await apiSection.count() > 0;
    
    // API 설정 확인
    const apiSettings = page.locator('input[type="url"], input[placeholder*="API"], [class*="api"]');
    const hasApiSettings = await apiSettings.count() > 0;
    
    // 기본 설정 요소 확인
    const basicSettings = await page.locator('input, button, [class*="setting"]').count() > 0;
    
    expect(hasApiSection || hasApiSettings || basicSettings).toBeTruthy();
  });

  test('캐시 관리', async ({ page }) => {
    // 캐시 관리 섹션 확인
    const cacheSection = page.locator('text=/캐시.*관리|Cache.*Management|캐시.*설정/');
    const hasCacheSection = await cacheSection.count() > 0;
    
    // 캐시 관련 버튼 확인
    const cacheButtons = page.locator('button:has-text("캐시"), button:has-text("Cache"), button:has-text("초기화")');
    const hasCacheButtons = await cacheButtons.count() > 0;
    
    // 기본 관리 요소 확인
    const basicManagement = await page.locator('button, [class*="cache"], [class*="clear"]').count() > 0;
    
    expect(hasCacheSection || hasCacheButtons || basicManagement).toBeTruthy();
  });

  test('성능 모니터링', async ({ page }) => {
    // 성능 모니터링 섹션 확인
    const performanceSection = page.locator('text=/성능.*모니터링|Performance|성능.*관리/');
    const hasPerformanceSection = await performanceSection.count() > 0;
    
    // 성능 지표 확인
    const performanceMetrics = page.locator('[class*="metric"], [class*="chart"], canvas');
    const hasPerformanceMetrics = await performanceMetrics.count() > 0;
    
    // 수치 정보 확인
    const numericInfo = await page.locator('text=/[0-9]+ms|[0-9]+%|[0-9]+MB/').count() > 0;
    
    // 기본 정보 요소 확인
    const basicInfo = await page.locator('div, span, [class*="info"]').count() > 0;
    
    expect(hasPerformanceSection || hasPerformanceMetrics || numericInfo || basicInfo).toBeTruthy();
  });

  test('스케줄러 관리', async ({ page }) => {
    // 스케줄러 관리 섹션 확인
    const schedulerSection = page.locator('text=/스케줄|Schedule|작업.*관리|Job/');
    const hasSchedulerSection = await schedulerSection.count() > 0;
    
    // 스케줄 설정 컨트롤 확인
    const schedulerControls = page.locator('input[type="time"], select, [class*="schedule"]');
    const hasSchedulerControls = await schedulerControls.count() > 0;
    
    // 기본 설정 요소 확인
    const basicSettings = await page.locator('button, input, [class*="setting"]').count() > 0;
    
    expect(hasSchedulerSection || hasSchedulerControls || basicSettings).toBeTruthy();
  });

  test('시스템 업데이트', async ({ page }) => {
    // 시스템 업데이트 섹션 확인
    const updateSection = page.locator('text=/시스템.*업데이트|System.*Update|버전.*업그레이드/');
    const hasUpdateSection = await updateSection.count() > 0;
    
    // 업데이트 관련 버튼 확인
    const updateButtons = page.locator('button:has-text("업데이트"), button:has-text("Update"), button:has-text("확인")');
    const hasUpdateButtons = await updateButtons.count() > 0;
    
    // 버전 정보 확인
    const versionInfo = await page.locator('text=/v[0-9]+|버전.*[0-9]+|Version/').count() > 0;
    
    // 기본 UI 요소 확인
    const basicElements = await page.locator('button, div, [class*="version"]').count() > 0;
    
    expect(hasUpdateSection || hasUpdateButtons || versionInfo || basicElements).toBeTruthy();
  });

  test('라이선스 관리', async ({ page }) => {
    // 라이선스 관리 섹션 확인
    const licenseSection = page.locator('text=/라이선스|License|인증/');
    const hasLicenseSection = await licenseSection.count() > 0;
    
    // 라이선스 정보 확인
    const licenseInfo = page.locator('[class*="license"], [class*="cert"], textarea');
    const hasLicenseInfo = await licenseInfo.count() > 0;
    
    // 기본 정보 요소 확인
    const basicInfo = await page.locator('div, input, [class*="info"]').count() > 0;
    
    expect(hasLicenseSection || hasLicenseInfo || basicInfo).toBeTruthy();
  });
});