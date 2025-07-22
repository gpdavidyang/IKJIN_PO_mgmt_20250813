-- =============================================
-- 테스트 현장(Projects) 생성 SQL Script
-- Purchase Order Management System
-- =============================================
-- 
-- 이 스크립트는 다양한 건설현장 유형별 테스트 프로젝트를 생성합니다.
-- Data Integrity를 위해 SQL Editor를 통해 직접 실행하세요.
--
-- 현장 유형 (project_type):
-- 1. commercial: 상업시설 (오피스, 상가 등)
-- 2. residential: 주거시설 (아파트, 주택 등)
-- 3. industrial: 산업시설 (공장, 물류센터 등)
-- 4. infrastructure: 인프라 (도로, 교량, 상하수도 등)
--
-- 현장 상태 (status):
-- planning, active, on_hold, completed, cancelled
-- =============================================

-- 기존 테스트 프로젝트 삭제 (충돌 방지)
DELETE FROM projects WHERE project_code LIKE 'TEST-%';

-- =============================================
-- 1. 상업시설 (Commercial) - 오피스 빌딩
-- =============================================
INSERT INTO projects (
    project_name, 
    project_code, 
    client_name, 
    project_type, 
    location, 
    start_date, 
    end_date, 
    status, 
    total_budget, 
    project_manager_id, 
    order_manager_id, 
    description, 
    is_active, 
    created_at, 
    updated_at
) VALUES (
    '강남 스마트타워 신축공사',
    'TEST-COM-001',
    '(주)강남개발',
    'commercial',
    '서울특별시 강남구 역삼동 123-45',
    '2024-03-01',
    '2025-12-31',
    'active',
    15000000000.00,
    'test_pm_001', -- 프로젝트관리자 (박프로젝트)
    'test_hq_001', -- 본사관리자 (이본사)
    '지상 20층, 지하 3층 규모의 프리미엄 오피스 빌딩. 친환경 인증(LEED Gold) 획득 목표',
    true,
    NOW(),
    NOW()
);

-- =============================================
-- 2. 주거시설 (Residential) - 아파트 단지
-- =============================================
INSERT INTO projects (
    project_name, 
    project_code, 
    client_name, 
    project_type, 
    location, 
    start_date, 
    end_date, 
    status, 
    total_budget, 
    project_manager_id, 
    order_manager_id, 
    description, 
    is_active, 
    created_at, 
    updated_at
) VALUES (
    '수원 행복마을 아파트 건설',
    'TEST-RES-001',
    '수원도시공사',
    'residential',
    '경기도 수원시 영통구 원천동 567-89',
    '2024-01-15',
    '2026-06-30',
    'active',
    25000000000.00,
    'test_pm_001', -- 프로젝트관리자 (박프로젝트)
    'test_hq_001', -- 본사관리자 (이본사)
    '총 5개 동, 999세대 규모의 공동주택. 단지 내 근린생활시설 포함',
    true,
    NOW(),
    NOW()
);

-- =============================================
-- 3. 산업시설 (Industrial) - 물류센터
-- =============================================
INSERT INTO projects (
    project_name, 
    project_code, 
    client_name, 
    project_type, 
    location, 
    start_date, 
    end_date, 
    status, 
    total_budget, 
    project_manager_id, 
    order_manager_id, 
    description, 
    is_active, 
    created_at, 
    updated_at
) VALUES (
    '평택 스마트 물류센터',
    'TEST-IND-001',
    '(주)로지스틱스코리아',
    'industrial',
    '경기도 평택시 포승읍 신영리 산업단지',
    '2024-05-01',
    '2025-10-31',
    'active',
    8500000000.00,
    'test_pm_001', -- 프로젝트관리자 (박프로젝트)
    'test_hq_001', -- 본사관리자 (이본사)
    '총 면적 50,000㎡ 규모의 자동화 물류센터. 로봇 피킹 시스템 및 AI 재고관리 시스템 구축',
    true,
    NOW(),
    NOW()
);

-- =============================================
-- 4. 인프라 (Infrastructure) - 교량 건설
-- =============================================
INSERT INTO projects (
    project_name, 
    project_code, 
    client_name, 
    project_type, 
    location, 
    start_date, 
    end_date, 
    status, 
    total_budget, 
    project_manager_id, 
    order_manager_id, 
    description, 
    is_active, 
    created_at, 
    updated_at
) VALUES (
    '한강 신대교 건설사업',
    'TEST-INF-001',
    '서울특별시 도시기반시설본부',
    'infrastructure',
    '서울시 용산구~영등포구 한강 횡단',
    '2023-08-01',
    '2025-07-31',
    'active',
    12000000000.00,
    'test_pm_001', -- 프로젝트관리자 (박프로젝트)  
    'test_hq_001', -- 본사관리자 (이본사)
    '연장 1.2km, 왕복 6차로 규모의 한강 횡단 교량. 경관조명 및 보행자 전용도로 포함',
    true,
    NOW(),
    NOW()
);

-- =============================================
-- 5. 산업시설 (Industrial) - 제조공장 (완료된 프로젝트)
-- =============================================
INSERT INTO projects (
    project_name, 
    project_code, 
    client_name, 
    project_type, 
    location, 
    start_date, 
    end_date, 
    status, 
    total_budget, 
    project_manager_id, 
    order_manager_id, 
    description, 
    is_active, 
    created_at, 
    updated_at
) VALUES (
    '충주 반도체 제조공장',
    'TEST-IND-002',
    '(주)테크솔루션',
    'industrial',
    '충청북도 충주시 가금면 산업단지',
    '2023-01-01',
    '2024-02-29',
    'completed',
    18000000000.00,
    'test_pm_001', -- 프로젝트관리자 (박프로젝트)
    'test_hq_001', -- 본사관리자 (이본사)
    '클린룸 등급 Class 1000 규모의 반도체 제조시설. 무진동 특수 기초공사 및 항온항습 시스템 구축',
    true,
    NOW(),
    NOW()
);

-- =============================================
-- 보너스: 계획 단계 프로젝트 (Planning)
-- =============================================
INSERT INTO projects (
    project_name, 
    project_code, 
    client_name, 
    project_type, 
    location, 
    start_date, 
    end_date, 
    status, 
    total_budget, 
    project_manager_id, 
    order_manager_id, 
    description, 
    is_active, 
    created_at, 
    updated_at
) VALUES (
    '부산 해안도로 건설사업',
    'TEST-INF-002',
    '부산광역시청',
    'infrastructure',
    '부산광역시 해운대구~기장군',
    '2025-03-01',
    '2027-12-31',
    'planning',
    35000000000.00,
    'test_pm_001', -- 프로젝트관리자 (박프로젝트)
    'test_hq_001', -- 본사관리자 (이본사)
    '총 연장 15km 해안순환도로 건설. 해상교량 3개소, 터널 2개소 포함',
    true,
    NOW(),
    NOW()
);

-- =============================================
-- 테스트 데이터 확인 쿼리
-- =============================================
-- 생성된 프로젝트 확인
SELECT 
    id,
    project_name,
    project_code,
    client_name,
    project_type,
    location,
    status,
    ROUND(total_budget::numeric / 1000000000, 2) || '억원' AS budget_display,
    start_date,
    end_date,
    is_active
FROM projects 
WHERE project_code LIKE 'TEST-%'
ORDER BY 
    CASE project_type 
        WHEN 'commercial' THEN 1
        WHEN 'residential' THEN 2  
        WHEN 'industrial' THEN 3
        WHEN 'infrastructure' THEN 4
    END, project_code;

-- 프로젝트 타입별 현황
SELECT 
    project_type,
    COUNT(*) as project_count,
    SUM(total_budget::numeric / 1000000000) || '억원' as total_budget_sum
FROM projects 
WHERE project_code LIKE 'TEST-%'
GROUP BY project_type
ORDER BY project_count DESC;

-- 프로젝트 상태별 현황  
SELECT 
    status,
    COUNT(*) as project_count,
    ROUND(AVG(total_budget::numeric / 1000000000), 2) || '억원' as avg_budget
FROM projects 
WHERE project_code LIKE 'TEST-%'
GROUP BY status
ORDER BY project_count DESC;

-- =============================================
-- 테스트 프로젝트 정보 요약
-- =============================================
/*
생성된 테스트 프로젝트:

🏢 상업시설 (Commercial):
   - 강남 스마트타워 신축공사 (150억원) - 진행중

🏠 주거시설 (Residential):  
   - 수원 행복마을 아파트 건설 (250억원) - 진행중

🏭 산업시설 (Industrial):
   - 평택 스마트 물류센터 (85억원) - 진행중
   - 충주 반도체 제조공장 (180억원) - 완료

🌉 인프라 (Infrastructure):
   - 한강 신대교 건설사업 (120억원) - 진행중  
   - 부산 해안도로 건설사업 (350억원) - 계획중

총 6개 프로젝트, 총예산 1,135억원
*/