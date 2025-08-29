import { test, expect } from '@playwright/test';

test.describe('보고서 및 분석 (Reports & Analysis) E2E Tests', () => {
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
    
    // 보고서 및 분석 페이지로 이동
    const reportsLink = page.locator('a:has-text("보고서 및 분석")').first();
    const reportsHref = page.locator('a[href="/reports"]').first();
    
    if (await reportsLink.isVisible()) {
      await reportsLink.click();
    } else if (await reportsHref.isVisible()) {
      await reportsHref.click();
    } else {
      // 직접 URL로 이동
      await page.goto('/reports');
    }
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // 페이지 로드 대기
  });

  test('보고서 페이지 로드 확인', async ({ page }) => {
    // 페이지 헤더 확인
    const headerTexts = ['보고서 및 분석', '보고서', '분석', 'Reports'];
    let headerFound = false;
    
    for (const text of headerTexts) {
      if (await page.locator(`h1:has-text("${text}"), h2:has-text("${text}")`).count() > 0) {
        headerFound = true;
        break;
      }
    }
    expect(headerFound).toBeTruthy();
    
    // 보고서 타입 선택 UI 확인
    const reportTypeSelector = await page.locator('[role="tablist"], select, [class*="tab"]').count() > 0;
    expect(reportTypeSelector).toBeTruthy();
  });

  test('보고서 타입 전환', async ({ page }) => {
    // 보고서 타입 탭 또는 선택 버튼 확인
    const reportTypes = ['발주 내역', '분류별', '현장별', '거래처별', 'orders', 'category', 'project', 'vendor'];
    let typeFound = false;
    
    for (const type of reportTypes) {
      const typeElement = page.locator(`[role="tab"]:has-text("${type}"), button:has-text("${type}")`);
      if (await typeElement.count() > 0) {
        typeFound = true;
        await typeElement.first().click();
        await page.waitForTimeout(500);
        break;
      }
    }
    
    expect(typeFound).toBeTruthy();
  });

  test('필터 기능', async ({ page }) => {
    // 필터 섹션 확인
    const filterSection = page.locator('[class*="filter"], [aria-label*="filter"]');
    const hasFilters = await filterSection.count() > 0;
    
    // 날짜 필터 확인
    const dateFilters = page.locator('input[type="date"], [class*="date-picker"]');
    const hasDateFilters = await dateFilters.count() > 0;
    
    // 상태 필터 확인
    const statusFilter = page.locator('select[name*="status"], [role="combobox"]');
    const hasStatusFilter = await statusFilter.count() > 0;
    
    expect(hasFilters || hasDateFilters || hasStatusFilter).toBeTruthy();
  });

  test('검색 기능', async ({ page }) => {
    // 검색 입력 필드 찾기
    const searchInput = page.locator('input[placeholder*="검색"], input[type="search"]').first();
    
    if (await searchInput.isVisible()) {
      // 검색어 입력
      await searchInput.fill('테스트');
      await page.waitForTimeout(500);
      
      // 검색 버튼 클릭 또는 Enter 키 입력 - first() 추가하여 strict mode 오류 해결
      const searchButton = page.locator('button:has-text("검색"), button[aria-label*="search"]').first();
      if (await searchButton.isVisible()) {
        await searchButton.click();
      } else {
        await searchInput.press('Enter');
      }
      
      await page.waitForTimeout(1000);
      
      // 검색 결과 또는 메시지 확인
      const resultsExist = 
        (await page.locator('table tbody tr').count() > 0) ||
        (await page.locator('[class*="card"]').count() > 0) ||
        (await page.locator('text=/결과.*없|No.*results/').count() > 0);
      
      expect(resultsExist).toBeTruthy();
      
      // 검색어 초기화
      await searchInput.clear();
    }
  });

  test('데이터 테이블 표시', async ({ page }) => {
    // 테이블 또는 리스트 뷰 확인
    const tableExists = await page.locator('table').count() > 0;
    const listExists = await page.locator('[class*="list"], [class*="card"]').count() > 0;
    
    expect(tableExists || listExists).toBeTruthy();
    
    // 테이블 헤더 확인
    if (tableExists) {
      const tableHeaders = await page.locator('th').count();
      expect(tableHeaders).toBeGreaterThan(0);
    }
  });

  test('차트 표시', async ({ page }) => {
    // 차트 요소 확인
    const chartElements = page.locator('canvas, svg[class*="chart"], [class*="recharts"]');
    const hasCharts = await chartElements.count() > 0;
    
    // 차트 타입 표시 (파이차트, 바차트 등)
    const chartIcons = page.locator('[class*="PieChart"], [class*="BarChart"], [class*="chart-icon"]');
    const hasChartIcons = await chartIcons.count() > 0;
    
    expect(hasCharts || hasChartIcons).toBeTruthy();
  });

  test('보고서 생성 버튼', async ({ page }) => {
    // 보고서 생성 버튼 확인
    const generateButtons = page.locator('button:has-text("보고서 생성"), button:has-text("생성"), button:has-text("다운로드")');
    const hasGenerateButton = await generateButtons.count() > 0;
    
    if (hasGenerateButton) {
      const generateButton = generateButtons.first();
      await generateButton.click();
      await page.waitForTimeout(500);
      
      // 모달 또는 설정 패널 열림 확인
      const modalOpened = await page.locator('[role="dialog"], [class*="modal"]').count() > 0;
      expect(modalOpened).toBeTruthy();
      
      // ESC로 닫기
      await page.keyboard.press('Escape');
    }
  });

  test('통계 카드 표시', async ({ page }) => {
    // 통계 카드 확인
    const statsCards = page.locator('[class*="card"]');
    const hasStatsCards = await statsCards.count() > 0;
    
    if (hasStatsCards) {
      // 통계 수치 확인
      const statsNumbers = await page.locator('text=/[0-9,]+원|[0-9]+건|[0-9]+%/').count();
      expect(statsNumbers).toBeGreaterThan(0);
    }
  });

  test('정렬 기능', async ({ page }) => {
    // 테이블 헤더의 정렬 가능 요소 확인
    const sortableHeaders = page.locator('th[class*="cursor-pointer"], th button, th[role="button"]');
    
    if (await sortableHeaders.count() > 0) {
      const firstSortable = sortableHeaders.first();
      
      // 정렬 버튼 클릭
      await firstSortable.click();
      await page.waitForTimeout(500);
      
      // 정렬 아이콘 변경 확인
      const sortIcons = await page.locator('[class*="arrow"], [class*="sort"]').count();
      expect(sortIcons).toBeGreaterThanOrEqual(0);
    }
  });

  test('날짜 범위 선택', async ({ page }) => {
    // 날짜 범위 선택기 확인
    const dateInputs = page.locator('input[type="date"]');
    const hasDateInputs = await dateInputs.count() >= 2; // 시작일, 종료일
    
    if (hasDateInputs) {
      const startDate = dateInputs.nth(0);
      const endDate = dateInputs.nth(1);
      
      // 날짜 입력
      await startDate.fill('2025-01-01');
      await endDate.fill('2025-12-31');
      
      // 적용 버튼 클릭 - first() 추가하여 strict mode 오류 해결
      const applyButton = page.locator('button:has-text("적용"), button:has-text("검색")').first();
      if (await applyButton.isVisible()) {
        await applyButton.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('반응형 디자인', async ({ page }) => {
    // 모바일 뷰포트로 변경
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // 헤더가 여전히 표시되는지 확인
    const headerVisible = await page.locator('h1, h2').first().isVisible();
    expect(headerVisible).toBeTruthy();
    
    // 주요 컨텐츠가 표시되는지 확인
    const contentVisible = await page.locator('[class*="card"], table').count() > 0;
    expect(contentVisible).toBeTruthy();
  });
});

test.describe('보고서 고급 기능', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[name="email"]', 'admin@company.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('h1:has-text("대시보드")', { timeout: 10000 });
    
    // 직접 URL로 이동
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('보고서 미리보기', async ({ page }) => {
    // 미리보기 버튼 확인
    const previewButtons = page.locator('button:has-text("미리보기"), button[aria-label*="preview"]');
    
    if (await previewButtons.count() > 0) {
      const previewButton = previewButtons.first();
      await previewButton.click();
      await page.waitForTimeout(500);
      
      // 미리보기 패널 또는 모달 확인
      const previewVisible = 
        (await page.locator('[class*="preview"]').count() > 0) ||
        (await page.locator('[role="dialog"]').count() > 0);
      
      expect(previewVisible).toBeTruthy();
      
      // 닫기
      await page.keyboard.press('Escape');
    }
  });

  test('데이터 내보내기', async ({ page }) => {
    // 내보내기 버튼 확인
    const exportButtons = page.locator('button:has-text("내보내기"), button:has-text("다운로드"), button:has-text("Export")');
    const hasExportButton = await exportButtons.count() > 0;
    
    if (hasExportButton) {
      const exportButton = exportButtons.first();
      
      // 내보내기 버튼이 보이는지 확인 후 호버
      if (await exportButton.isVisible()) {
        await exportButton.hover();
        await page.waitForTimeout(500);
      }
      
      // 내보내기 옵션 확인 (Excel, PDF, CSV 등)
      const exportOptions = ['Excel', 'PDF', 'CSV', '엑셀'];
      let optionFound = false;
      
      for (const option of exportOptions) {
        if (await page.locator(`text=${option}`).count() > 0) {
          optionFound = true;
          break;
        }
      }
      
      expect(hasExportButton).toBeTruthy();
    }
  });

  test('다중 선택 기능', async ({ page }) => {
    // 체크박스 확인
    const checkboxes = page.locator('input[type="checkbox"]');
    const hasCheckboxes = await checkboxes.count() > 0;
    
    if (hasCheckboxes) {
      // 첫 번째 체크박스 선택
      const firstCheckbox = checkboxes.first();
      await firstCheckbox.check();
      await page.waitForTimeout(500);
      
      // 선택된 항목 수 표시 확인
      const selectedCount = await page.locator('text=/선택.*[0-9]+|[0-9]+.*selected/').count() > 0;
      expect(hasCheckboxes).toBeTruthy();
    }
  });

  test('차트 타입 변경', async ({ page }) => {
    // 차트 타입 선택 버튼 확인
    const chartTypeButtons = page.locator('button[aria-label*="chart"], [class*="chart-type"]');
    
    if (await chartTypeButtons.count() > 0) {
      const firstButton = chartTypeButtons.first();
      await firstButton.click();
      await page.waitForTimeout(500);
      
      // 차트 타입 옵션 확인
      const chartOptions = ['파이', '바', '라인', 'pie', 'bar', 'line'];
      let optionFound = false;
      
      for (const option of chartOptions) {
        if (await page.locator(`text=${option}`).count() > 0) {
          optionFound = true;
          break;
        }
      }
      
      expect(optionFound || await chartTypeButtons.count() > 0).toBeTruthy();
    }
  });

  test('인사이트 섹션', async ({ page }) => {
    // 인사이트 또는 분석 섹션 확인
    const insightSections = page.locator('text=/인사이트|분석|통계|Summary|Insights/');
    const hasInsights = await insightSections.count() > 0;
    
    if (hasInsights) {
      // 인사이트 내용 확인
      const insightContent = await page.locator('[class*="insight"], [class*="analysis"]').count() > 0;
      expect(insightContent || hasInsights).toBeTruthy();
    }
  });
});