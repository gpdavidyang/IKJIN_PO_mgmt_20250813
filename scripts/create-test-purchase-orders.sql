-- =============================================
-- 테스트 발주서(Purchase Orders) 생성 SQL Script
-- Purchase Order Management System
-- =============================================
-- 
-- 이 스크립트는 기존 users, projects, vendors 데이터와 연계된 
-- 실제적인 발주서 데이터를 생성합니다.
-- Data Integrity를 위해 SQL Editor를 통해 직접 실행하세요.
--
-- 발주서 상태 (status):
-- - draft: 임시저장
-- - pending: 승인대기  
-- - approved: 승인완료
-- - sent: 발송완료
-- - completed: 완료
--
-- 승인 워크플로우:
-- field_worker → project_manager → hq_management → executive → admin
-- =============================================

-- 기존 테스트 발주서 및 관련 데이터 삭제 (충돌 방지)
DELETE FROM purchase_order_items WHERE order_id IN (
    SELECT id FROM purchase_orders WHERE order_number LIKE 'PO-TEST-%'
);
DELETE FROM order_history WHERE order_id IN (
    SELECT id FROM purchase_orders WHERE order_number LIKE 'PO-TEST-%'
);
DELETE FROM purchase_orders WHERE order_number LIKE 'PO-TEST-%';

-- =============================================
-- 1. 강남 스마트타워 - 알루미늄 창호 발주서 (승인완료)
-- =============================================

-- 발주서 헤더
INSERT INTO purchase_orders (
    order_number,
    project_id,
    vendor_id, 
    user_id,
    template_id,
    order_date,
    delivery_date,
    status,
    total_amount,
    notes,
    is_approved,
    approved_by,
    approved_at,
    current_approver_role,
    approval_level,
    created_at,
    updated_at
) VALUES (
    'PO-TEST-001',
    (SELECT id FROM projects WHERE project_code = 'TEST-COM-001'), -- 강남 스마트타워
    (SELECT id FROM vendors WHERE business_number = 'TEST-123-45-67890'), -- 대한알루미늄압출
    'test_field_001', -- 현장근무자 (김현장)
    NULL,
    '2024-11-01',
    '2024-12-15', 
    'approved',
    85000000.00, -- 8천5백만원
    '20층 오피스 빌딩 외벽 시스템창호 일괄. LEED 인증용 고단열 사양',
    true,
    'test_hq_001', -- 본사관리자가 승인
    '2024-11-05 14:30:00',
    'hq_management',
    3,
    NOW(),
    NOW()
);

-- 발주서 아이템들
INSERT INTO purchase_order_items (
    order_id,
    item_name,
    specification,
    unit,
    quantity,
    unit_price,
    total_amount,
    notes,
    created_at
) VALUES 
-- 창호 프레임
((SELECT id FROM purchase_orders WHERE order_number = 'PO-TEST-001'),
'알루미늄 창호 프레임', 
'6063-T5 합금, 열관류율 1.4W/㎡K 이하, 두께 2.0mm 이상',
'㎡', 850.00, 65000.00, 55250000.00,
'외벽 커튼월용 시스템창호 프레임', NOW()),

-- 유리
((SELECT id FROM purchase_orders WHERE order_number = 'PO-TEST-001'),
'Low-E 복층유리',
'24mm 복층유리(6mm+12mm Air+6mm), Low-E 코팅, 아르곤가스 충전',  
'㎡', 800.00, 35000.00, 28000000.00,
'외벽용 고단열 복층유리', NOW()),

-- 부속철물
((SELECT id FROM purchase_orders WHERE order_number = 'PO-TEST-001'),
'창호용 철물세트',
'STS304 스테인레스 철물, 개폐형 틸트&턴 방식',
'세트', 120.00, 14500.00, 1740000.00,  
'창호 개폐용 고급 철물', NOW());

-- =============================================
-- 2. 수원 아파트 - 단열재 발주서 (발송완료)
-- =============================================

INSERT INTO purchase_orders (
    order_number,
    project_id,
    vendor_id,
    user_id, 
    template_id,
    order_date,
    delivery_date,
    status,
    total_amount,
    notes,
    is_approved,
    approved_by,
    approved_at,
    current_approver_role,
    approval_level,
    created_at,
    updated_at
) VALUES (
    'PO-TEST-002',
    (SELECT id FROM projects WHERE project_code = 'TEST-RES-001'), -- 수원 행복마을 아파트
    (SELECT id FROM vendors WHERE business_number = 'TEST-345-67-89012'), -- 한국단열시스템
    'test_pm_001', -- 프로젝트관리자 (박프로젝트) 
    NULL,
    '2024-10-15',
    '2024-11-30',
    'sent',
    32000000.00, -- 3천2백만원
    '아파트 단지 5개동 외벽 단열재 일괄 공급. 친환경 인증 필요',
    true,
    'test_pm_001', -- 프로젝트관리자가 직접 승인 (권한 내)
    '2024-10-18 09:15:00', 
    'project_manager',
    2,
    NOW(),
    NOW()
);

INSERT INTO purchase_order_items (
    order_id,
    item_name,
    specification,
    unit,
    quantity, 
    unit_price,
    total_amount,
    notes,
    created_at
) VALUES
-- 단열재
((SELECT id FROM purchase_orders WHERE order_number = 'PO-TEST-002'),
'압출법단열재 XPS',
'두께 100mm, 열전도율 0.028W/mK, 압축강도 300kPa 이상',
'㎡', 15000.00, 1800.00, 27000000.00,
'외벽 단열용 압출법단열재', NOW()),

-- 접착제
((SELECT id FROM purchase_orders WHERE order_number = 'PO-TEST-002'),
'단열재 전용 접착제',
'우레탄계 접착제, 내후성 20년 이상, 친환경 무독성',
'포', 200.00, 25000.00, 5000000.00,
'단열재 시공용 전용 접착제', NOW());

-- ============================================= 
-- 3. 평택 물류센터 - 도료 발주서 (승인대기)
-- =============================================

INSERT INTO purchase_orders (
    order_number,
    project_id,
    vendor_id,
    user_id,
    template_id,
    order_date,
    delivery_date,
    status,
    total_amount,
    notes,
    is_approved,
    approved_by,
    approved_at,
    current_approver_role,
    approval_level,
    created_at,
    updated_at  
) VALUES (
    'PO-TEST-003',
    (SELECT id FROM projects WHERE project_code = 'TEST-IND-001'), -- 평택 스마트 물류센터
    (SELECT id FROM vendors WHERE business_number = 'TEST-567-89-01234'), -- 삼화페인트공업
    'test_field_001', -- 현장근무자 (김현장)
    NULL,
    '2024-12-01',
    '2025-01-15',
    'pending',
    18500000.00, -- 1천8백5십만원
    '물류센터 외벽 및 내벽 도장공사용 도료. 산업용 고내구성 사양',
    false,
    NULL,
    NULL,
    'project_manager', -- 프로젝트관리자 승인 대기
    1,
    NOW(),
    NOW()
);

INSERT INTO purchase_order_items (
    order_id,
    item_name,
    specification, 
    unit,
    quantity,
    unit_price,
    total_amount,
    notes,
    created_at
) VALUES
-- 외벽도료 
((SELECT id FROM purchase_orders WHERE order_number = 'PO-TEST-003'),
'산업용 외벽 도료',
'실리콘 변성 아크릴 수지, 내후성 15년, 방오성능 우수',
'L', 2000.00, 6500.00, 13000000.00,
'물류센터 외벽용 고내구성 도료', NOW()),

-- 내벽도료
((SELECT id FROM purchase_orders WHERE order_number = 'PO-TEST-003'),
'내벽 수성 페인트',
'친환경 수성도료, VOC 무검출, 항균기능',
'L', 1500.00, 3500.00, 5250000.00,
'내부 사무실 및 휴게공간용', NOW()),

-- 프라이머
((SELECT id FROM purchase_orders WHERE order_number = 'PO-TEST-003'),
'방청 프라이머',
'에폭시계 프라이머, 부착력 우수, 방청효과',
'L', 100.00, 12500.00, 1250000.00,
'철부 방청처리용', NOW());

-- =============================================
-- 4. 한강 신대교 - 철강재 발주서 (대금액, 임원승인)
-- =============================================

INSERT INTO purchase_orders (
    order_number,
    project_id,
    vendor_id,
    user_id,
    template_id, 
    order_date,
    delivery_date,
    status,
    total_amount,
    notes,
    is_approved,
    approved_by,
    approved_at,
    current_approver_role,
    approval_level,
    created_at,
    updated_at
) VALUES (
    'PO-TEST-004', 
    (SELECT id FROM projects WHERE project_code = 'TEST-INF-001'), -- 한강 신대교
    (SELECT id FROM vendors WHERE business_number = 'TEST-012-34-56789'), -- 동국제강
    'test_pm_001', -- 프로젝트관리자 (박프로젝트)
    NULL,
    '2024-09-10',
    '2024-11-30',
    'approved',
    450000000.00, -- 4억5천만원 (대금액)
    '한강 횡단교량 주구조체용 H-Beam 및 강판. KS D 3503 규격',
    true,
    'test_exec_001', -- 임원이 승인 (고액)
    '2024-09-15 16:20:00',
    'executive',
    4,
    NOW(),
    NOW()
);

INSERT INTO purchase_order_items (
    order_id,
    item_name,
    specification,
    unit,
    quantity,
    unit_price, 
    total_amount,
    notes,
    created_at
) VALUES
-- H-빔
((SELECT id FROM purchase_orders WHERE order_number = 'PO-TEST-004'),
'H-Beam 강재',
'H-400×200×8×13, SM490A, KS D 3503, 용접구조용',
'톤', 850.00, 420000.00, 357000000.00,
'교량 주구조체용 H형강', NOW()),

-- 강판
((SELECT id FROM purchase_orders WHERE order_number = 'PO-TEST-004'),
'후판 강재',
't=25mm, SM490A, KS D 3503, 용접구조용 압연강재',
'톤', 250.00, 380000.00, 95000000.00,
'교량 접합부 및 보강재용', NOW());

-- =============================================
-- 5. 충주 반도체공장 - 완료된 발주서 (이미 납품완료)
-- =============================================

INSERT INTO purchase_orders (
    order_number,
    project_id,
    vendor_id,
    user_id,
    template_id,
    order_date,
    delivery_date,
    status,
    total_amount,
    notes,
    is_approved,
    approved_by,
    approved_at,
    current_approver_role,
    approval_level,
    created_at,
    updated_at
) VALUES (
    'PO-TEST-005',
    (SELECT id FROM projects WHERE project_code = 'TEST-IND-002'), -- 충주 반도체 제조공장
    (SELECT id FROM vendors WHERE business_number = 'TEST-456-78-90123'), -- 그린텍단열재
    'test_hq_001', -- 본사관리자 (이본사)
    NULL,
    '2023-06-01',
    '2023-07-31',
    'completed',
    75000000.00, -- 7천5백만원
    '클린룸 특수 단열재. Class 1000 규격 적합, 정전기 방지 처리',
    true,
    'test_hq_001', -- 본사관리자가 승인
    '2023-06-05 11:00:00',
    'hq_management', 
    3,
    '2023-06-01 08:30:00', -- 과거 생성일
    '2023-08-15 14:20:00'  -- 완료 시점 업데이트
);

INSERT INTO purchase_order_items (
    order_id,
    item_name,
    specification,
    unit,
    quantity,
    unit_price,
    total_amount,
    notes,
    created_at
) VALUES
-- 클린룸 단열재
((SELECT id FROM purchase_orders WHERE order_number = 'PO-TEST-005'),
'클린룸용 특수 단열재',
'PIR 폼 단열재, 두께 150mm, 정전기 방지 처리, Class 1000 대응',
'㎡', 5000.00, 15000.00, 75000000.00,
'반도체 클린룸 전용 단열재', '2023-06-01 08:35:00');

-- =============================================
-- 6. 임시저장 발주서 (Draft)
-- =============================================

INSERT INTO purchase_orders (
    order_number,
    project_id,
    vendor_id,
    user_id,
    template_id,
    order_date, 
    delivery_date,
    status,
    total_amount,
    notes,
    is_approved,
    approved_by,
    approved_at,
    current_approver_role,
    approval_level,
    created_at,
    updated_at
) VALUES (
    'PO-TEST-006',
    (SELECT id FROM projects WHERE project_code = 'TEST-COM-001'), -- 강남 스마트타워
    (SELECT id FROM vendors WHERE business_number = 'TEST-789-01-23456'), -- 대우건설창호
    'test_field_001', -- 현장근무자 (김현장)
    NULL,
    '2024-12-20',
    '2025-02-28',
    'draft',
    0.00, -- 아직 금액 미확정
    '내부 인테리어용 시스템 도어. 사양 검토 중',
    false,
    NULL,
    NULL,
    'field_worker',
    1,
    NOW(),
    NOW()
);

INSERT INTO purchase_order_items (
    order_id,
    item_name,
    specification,
    unit,
    quantity,
    unit_price,
    total_amount,
    notes,
    created_at
) VALUES
-- 임시 아이템 (금액 미정)
((SELECT id FROM purchase_orders WHERE order_number = 'PO-TEST-006'),
'시스템 도어',
'사양 미확정 - 검토중',
'EA', 0.00, 0.00, 0.00,
'임시저장 상태 - 사양 및 수량 확인 필요', NOW());

-- =============================================
-- 발주서 이력 기록 (Order History)
-- =============================================

-- PO-TEST-001 이력
INSERT INTO order_history (order_id, user_id, action, notes, created_at) VALUES
((SELECT id FROM purchase_orders WHERE order_number = 'PO-TEST-001'), 'test_field_001', '발주서 작성', '알루미늄 창호 발주서 최초 작성', '2024-11-01 09:00:00'),
((SELECT id FROM purchase_orders WHERE order_number = 'PO-TEST-001'), 'test_pm_001', '1차 승인', '프로젝트관리자 승인 완료', '2024-11-03 14:20:00'),
((SELECT id FROM purchase_orders WHERE order_number = 'PO-TEST-001'), 'test_hq_001', '최종 승인', '본사관리자 최종 승인 완료', '2024-11-05 14:30:00');

-- PO-TEST-002 이력  
INSERT INTO order_history (order_id, user_id, action, notes, created_at) VALUES
((SELECT id FROM purchase_orders WHERE order_number = 'PO-TEST-002'), 'test_pm_001', '발주서 작성', '단열재 발주서 작성 및 승인', '2024-10-15 10:30:00'),
((SELECT id FROM purchase_orders WHERE order_number = 'PO-TEST-002'), 'test_pm_001', '발주서 발송', '거래처 발송 완료', '2024-10-18 16:45:00');

-- PO-TEST-003 이력
INSERT INTO order_history (order_id, user_id, action, notes, created_at) VALUES  
((SELECT id FROM purchase_orders WHERE order_number = 'PO-TEST-003'), 'test_field_001', '발주서 작성', '물류센터 도료 발주서 작성', '2024-12-01 08:15:00');

-- PO-TEST-004 이력
INSERT INTO order_history (order_id, user_id, action, notes, created_at) VALUES
((SELECT id FROM purchase_orders WHERE order_number = 'PO-TEST-004'), 'test_pm_001', '발주서 작성', '교량용 철강재 발주서 작성 (대금액)', '2024-09-10 11:00:00'),
((SELECT id FROM purchase_orders WHERE order_number = 'PO-TEST-004'), 'test_hq_001', '1차 승인', '본사관리자 1차 승인 (대금액으로 임원 승인 필요)', '2024-09-12 15:30:00'),
((SELECT id FROM purchase_orders WHERE order_number = 'PO-TEST-004'), 'test_exec_001', '최종 승인', '임원 최종 승인 완료 (4억5천만원)', '2024-09-15 16:20:00');

-- PO-TEST-005 이력 (완료 프로젝트)
INSERT INTO order_history (order_id, user_id, action, notes, created_at) VALUES
((SELECT id FROM purchase_orders WHERE order_number = 'PO-TEST-005'), 'test_hq_001', '발주서 작성', '클린룸 단열재 발주서 작성', '2023-06-01 08:30:00'),
((SELECT id FROM purchase_orders WHERE order_number = 'PO-TEST-005'), 'test_hq_001', '승인 및 발송', '본사관리자 승인 후 즉시 발송', '2023-06-05 11:00:00'),
((SELECT id FROM purchase_orders WHERE order_number = 'PO-TEST-005'), 'test_hq_001', '납품 완료', '전량 납품 완료 및 검수 완료', '2023-08-15 14:20:00');

-- =============================================
-- 테스트 데이터 확인 쿼리
-- =============================================

-- 생성된 발주서 확인
SELECT 
    po.id,
    po.order_number,
    p.project_name,
    v.name as vendor_name,
    u.name as user_name,
    po.order_date,
    po.delivery_date,
    po.status,
    ROUND(po.total_amount::numeric / 1000000, 1) || '백만원' as amount_display,
    po.is_approved,
    approver.name as approved_by_name
FROM purchase_orders po
JOIN projects p ON po.project_id = p.id  
JOIN vendors v ON po.vendor_id = v.id
JOIN users u ON po.user_id = u.id
LEFT JOIN users approver ON po.approved_by = approver.id
WHERE po.order_number LIKE 'PO-TEST-%'
ORDER BY po.order_date DESC;

-- 발주서 상태별 현황
SELECT 
    status,
    COUNT(*) as order_count,
    ROUND(SUM(total_amount::numeric) / 1000000, 1) || '백만원' as total_amount_sum
FROM purchase_orders 
WHERE order_number LIKE 'PO-TEST-%'
GROUP BY status
ORDER BY 
    CASE status
        WHEN 'draft' THEN 1
        WHEN 'pending' THEN 2  
        WHEN 'approved' THEN 3
        WHEN 'sent' THEN 4
        WHEN 'completed' THEN 5
    END;

-- 프로젝트별 발주 현황
SELECT 
    p.project_name,
    p.project_type,
    COUNT(po.id) as order_count,
    ROUND(SUM(po.total_amount::numeric) / 1000000, 1) || '백만원' as total_orders_amount
FROM projects p
LEFT JOIN purchase_orders po ON p.id = po.project_id AND po.order_number LIKE 'PO-TEST-%'
WHERE p.project_code LIKE 'TEST-%'
GROUP BY p.id, p.project_name, p.project_type
ORDER BY COUNT(po.id) DESC;

-- 거래처별 발주 현황
SELECT 
    v.name,
    v.business_type,
    COUNT(po.id) as order_count,
    ROUND(SUM(po.total_amount::numeric) / 1000000, 1) || '백만원' as total_orders_amount
FROM vendors v
LEFT JOIN purchase_orders po ON v.id = po.vendor_id AND po.order_number LIKE 'PO-TEST-%' 
WHERE v.business_number LIKE 'TEST-%'
GROUP BY v.id, v.name, v.business_type
HAVING COUNT(po.id) > 0
ORDER BY SUM(po.total_amount::numeric) DESC;

-- 사용자별 발주 현황 
SELECT 
    u.name,
    u.role,
    COUNT(po.id) as created_orders,
    COUNT(CASE WHEN po.approved_by = u.id THEN 1 END) as approved_orders,
    ROUND(SUM(po.total_amount::numeric) / 1000000, 1) || '백만원' as total_created_amount
FROM users u
LEFT JOIN purchase_orders po ON u.id = po.user_id AND po.order_number LIKE 'PO-TEST-%'
WHERE u.id LIKE 'test_%'
GROUP BY u.id, u.name, u.role
HAVING COUNT(po.id) > 0
ORDER BY COUNT(po.id) DESC;

-- =============================================
-- 테스트 발주서 정보 요약  
-- =============================================
/*
생성된 테스트 발주서 (총 6개):

📋 발주서 현황:
1. PO-TEST-001: 강남 스마트타워 - 알루미늄 창호 (8.5천만원) ✅ 승인완료
2. PO-TEST-002: 수원 아파트 - 단열재 (3.2천만원) 📤 발송완료  
3. PO-TEST-003: 평택 물류센터 - 도료 (1.85천만원) ⏳ 승인대기
4. PO-TEST-004: 한강 신대교 - 철강재 (4.5억원) ✅ 임원승인 (대금액)
5. PO-TEST-005: 충주 반도체공장 - 클린룸 단열재 (7.5천만원) ✅ 완료
6. PO-TEST-006: 강남 스마트타워 - 시스템 도어 (미정) 💾 임시저장

💰 총 발주금액: 약 6.4억원

🔄 승인 워크플로우 테스트:
- 현장근무자 → 프로젝트관리자 → 본사관리자 → 임원 → 관리자
- 금액별 승인권한 적용 (대금액은 임원승인)
- 완전한 이력추적 (order_history)

📊 다양한 시나리오:
- 각 상태별 발주서 (draft → pending → approved → sent → completed)
- 다양한 업종별 발주 (압출, 단열, 도장, 창호, 철강)
- 소액부터 대액까지 금액대별 발주
- 실제 건설현장과 연계된 발주내용
*/