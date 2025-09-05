/**
 * 발주서 생성 워크플로우 E2E 테스트
 */

import { test, expect } from '@playwright/test';

test.describe('발주서 상태 관리 워크플로우', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('Draft 발주서 생성 → PDF 생성 → 이메일 전송 전체 워크플로우', async ({ page }) => {
    // 1. 새 발주서 작성 (Draft 상태)
    await page.goto('/orders/new');
    
    // 발주서 정보 입력
    await page.selectOption('select[name="projectId"]', { index: 1 });
    await page.selectOption('select[name="vendorId"]', { index: 1 });
    await page.fill('input[name="orderDate"]', '2025-01-15');
    await page.fill('input[name="deliveryDate"]', '2025-01-30');
    
    // 품목 추가
    await page.fill('input[name="itemName"]', 'LED 조명 100W');
    await page.fill('input[name="specification"]', '100W, 6500K');
    await page.fill('input[name="quantity"]', '10');
    await page.fill('input[name="unitPrice"]', '50000');
    
    // 임시저장 버튼 클릭
    await page.click('button:has-text("임시저장")');
    await expect(page.locator('.toast')).toContainText('임시저장되었습니다');
    
    // URL에서 발주서 ID 추출
    await page.waitForURL(/\/orders\/\d+/);
    const url = page.url();
    const orderId = url.match(/\/orders\/(\d+)/)?.[1];
    expect(orderId).toBeTruthy();

    // 2. 발주서 상세 페이지에서 상태 확인
    await page.goto(`/orders/${orderId}`);
    
    // Draft 상태 확인
    await expect(page.locator('[data-testid="order-status"]')).toContainText('임시저장');
    await expect(page.locator('[data-testid="draft-warning"]')).toContainText('발주서 생성 필요');
    
    // Draft 상태에서 가능한 버튼들 확인
    await expect(page.locator('button:has-text("수정")')).toBeVisible();
    await expect(page.locator('button:has-text("발주서 생성")')).toBeVisible();
    await expect(page.locator('button:has-text("PDF 미리보기")')).not.toBeVisible();
    await expect(page.locator('button:has-text("이메일 발송")')).not.toBeVisible();

    // 3. 발주서 생성 (Draft → Created)
    await page.click('button:has-text("발주서 생성")');
    
    // 확인 대화상자
    await page.click('button:has-text("확인")');
    
    // PDF 생성 완료 대기
    await expect(page.locator('.toast')).toContainText('발주서가 성공적으로 생성되었습니다');
    
    // 상태 변경 확인
    await expect(page.locator('[data-testid="order-status"]')).toContainText('발주서생성');
    await expect(page.locator('[data-testid="draft-warning"]')).not.toBeVisible();

    // 4. Created 상태에서 가능한 버튼들 확인
    await expect(page.locator('button:has-text("수정")')).toBeVisible();
    await expect(page.locator('button:has-text("발주서 생성")')).not.toBeVisible();
    await expect(page.locator('button:has-text("PDF 미리보기")')).toBeVisible();
    await expect(page.locator('button:has-text("이메일 발송")')).toBeVisible();

    // 5. PDF 미리보기 테스트
    await page.click('button:has-text("PDF 미리보기")');
    await expect(page.locator('[data-testid="pdf-preview-modal"]')).toBeVisible();
    await page.click('button[data-testid="close-modal"]');

    // 6. 이메일 발송 (Created → Sent)
    await page.click('button:has-text("이메일 발송")');
    await expect(page.locator('[data-testid="email-dialog"]')).toBeVisible();
    
    // 이메일 정보 입력
    await page.fill('input[name="recipientEmail"]', 'vendor@test.com');
    await page.fill('textarea[name="message"]', '발주서를 전송드립니다.');
    await page.click('button:has-text("전송")');
    
    // 전송 완료 확인
    await expect(page.locator('.toast')).toContainText('이메일이 전송되었습니다');
    
    // 상태 변경 확인
    await expect(page.locator('[data-testid="order-status"]')).toContainText('발송완료');

    // 7. Sent 상태에서 가능한 버튼들 확인
    await expect(page.locator('button:has-text("수정")')).not.toBeVisible();
    await expect(page.locator('button:has-text("PDF 미리보기")')).toBeVisible();
    await expect(page.locator('button:has-text("이메일 발송")')).not.toBeVisible();
  });

  test('발주서 목록 페이지에서 상태별 아이콘 표시', async ({ page }) => {
    await page.goto('/orders');
    
    // 테스트 데이터가 있다고 가정하고 첫 번째 행 확인
    const firstRow = page.locator('table tbody tr').first();
    
    // Draft 상태 발주서의 아이콘들 확인
    const draftOrder = page.locator('tr:has([data-testid="status-badge"]:has-text("임시저장"))').first();
    if (await draftOrder.count() > 0) {
      // Draft 상태: 수정 아이콘만 표시, PDF/이메일 아이콘은 숨김
      await expect(draftOrder.locator('[data-testid="edit-icon"]')).toBeVisible();
      await expect(draftOrder.locator('[data-testid="pdf-icon"]')).not.toBeVisible();
      await expect(draftOrder.locator('[data-testid="email-icon"]')).not.toBeVisible();
      await expect(draftOrder.locator('[data-testid="draft-indicator"]')).toBeVisible();
    }

    // Created 상태 발주서의 아이콘들 확인
    const createdOrder = page.locator('tr:has([data-testid="status-badge"]:has-text("발주서생성"))').first();
    if (await createdOrder.count() > 0) {
      // Created 상태: 수정, PDF, 이메일 아이콘 모두 표시
      await expect(createdOrder.locator('[data-testid="edit-icon"]')).toBeVisible();
      await expect(createdOrder.locator('[data-testid="pdf-icon"]')).toBeVisible();
      await expect(createdOrder.locator('[data-testid="email-icon"]')).toBeVisible();
    }

    // Sent 상태 발주서의 아이콘들 확인
    const sentOrder = page.locator('tr:has([data-testid="status-badge"]:has-text("발송완료"))').first();
    if (await sentOrder.count() > 0) {
      // Sent 상태: PDF 아이콘만 표시, 수정/이메일 아이콘은 숨김
      await expect(sentOrder.locator('[data-testid="edit-icon"]')).not.toBeVisible();
      await expect(sentOrder.locator('[data-testid="pdf-icon"]')).toBeVisible();
      await expect(sentOrder.locator('[data-testid="email-icon"]')).not.toBeVisible();
    }
  });

  test('권한별 버튼 표시 테스트', async ({ page }) => {
    // Admin 사용자로 로그인
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // 다른 사용자의 발주서 조회
    await page.goto('/orders/1'); // 다른 사용자가 작성한 발주서
    
    // Admin은 모든 버튼을 볼 수 있어야 함
    await expect(page.locator('button:has-text("수정")')).toBeVisible();
    await expect(page.locator('button:has-text("발주서 생성")')).toBeVisible();
  });

  test('발주서 상태별 필터링', async ({ page }) => {
    await page.goto('/orders');
    
    // 발주 상태 필터 선택
    await page.selectOption('select[name="orderStatus"]', 'draft');
    await page.waitForTimeout(1000); // 필터 적용 대기
    
    // 모든 결과가 draft 상태인지 확인
    const statusBadges = page.locator('[data-testid="status-badge"]');
    const count = await statusBadges.count();
    
    for (let i = 0; i < count; i++) {
      await expect(statusBadges.nth(i)).toContainText('임시저장');
    }
    
    // Created 상태 필터 테스트
    await page.selectOption('select[name="orderStatus"]', 'created');
    await page.waitForTimeout(1000);
    
    const createdStatusBadges = page.locator('[data-testid="status-badge"]');
    const createdCount = await createdStatusBadges.count();
    
    for (let i = 0; i < createdCount; i++) {
      await expect(createdStatusBadges.nth(i)).toContainText('발주서생성');
    }
  });

  test('에러 처리 테스트', async ({ page }) => {
    // 존재하지 않는 발주서 접근
    await page.goto('/orders/999999');
    await expect(page.locator('.error-message')).toContainText('발주서를 찾을 수 없습니다');
    
    // 뒤로가기 버튼 확인
    await expect(page.locator('button:has-text("발주서 목록으로 돌아가기")')).toBeVisible();
  });

  test('API 오류 상황 처리', async ({ page }) => {
    // 네트워크 오류 시뮬레이션
    await page.route('**/api/orders/*/create-order', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    await page.goto('/orders/1');
    await page.click('button:has-text("발주서 생성")');
    await page.click('button:has-text("확인")');
    
    // 에러 토스트 확인
    await expect(page.locator('.toast.error')).toContainText('발주서 생성 중 오류가 발생했습니다');
  });
});

// 테스트 유틸리티 함수들
export async function createTestOrder(page: any, options: {
  projectName?: string;
  vendorName?: string;
  itemName?: string;
  isDraft?: boolean;
} = {}) {
  const {
    projectName = 'Test Project',
    vendorName = 'Test Vendor',
    itemName = 'Test Item',
    isDraft = true
  } = options;

  await page.goto('/orders/new');
  await page.selectOption('select[name="projectId"]', { label: projectName });
  await page.selectOption('select[name="vendorId"]', { label: vendorName });
  await page.fill('input[name="orderDate"]', '2025-01-15');
  await page.fill('input[name="itemName"]', itemName);
  await page.fill('input[name="quantity"]', '1');
  await page.fill('input[name="unitPrice"]', '100000');

  if (isDraft) {
    await page.click('button:has-text("임시저장")');
  } else {
    await page.click('button:has-text("저장")');
  }
}