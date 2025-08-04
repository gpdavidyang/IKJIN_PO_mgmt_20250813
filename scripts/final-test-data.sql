-- 매뉴얼 테스트용 기초 데이터 삽입 SQL
-- 실행 순서: 회사 → 직급 → 사용자 → 프로젝트 → 거래처 → 승인권한

-- 1. 회사 데이터
INSERT INTO companies (id, name, business_number, representative, address, phone, email, is_active, created_at, updated_at) 
VALUES (1, '익진엔지니어링(주)', '123-86-00001', '대표이사', '서울특별시 강남구 테헤란로 123', '02-1234-5678', 'info@ikjin.co.kr', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. 직급 데이터  
INSERT INTO positions (id, name, level, is_active, created_at, updated_at) VALUES
(1, '이사', 1, true, NOW(), NOW()),
(2, '부장', 2, true, NOW(), NOW()),
(3, '과장', 3, true, NOW(), NOW()),
(4, '대리', 4, true, NOW(), NOW()),
(5, '사원', 5, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. 사용자 데이터 (매뉴얼 테스트 시나리오 기준)
-- 테스트관리자 (admin) - test@ikjin.co.kr / admin123
INSERT INTO users (id, email, name, hashed_password, phone, role, is_active, company_id, position_id, created_at, updated_at) 
VALUES ('test_admin_001', 'test@ikjin.co.kr', '테스트관리자', '$2b$10$6zEzm86RTPP9wRI9thcP7eDNSjFWuZH2kIsFXz2yE70S6sZefRKb6', '010-1111-1111', 'admin', true, 1, 1, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 박본사 (hq_management)
INSERT INTO users (id, email, name, hashed_password, phone, role, is_active, company_id, position_id, created_at, updated_at) 
VALUES ('hq_manager_001', 'park@test.com', '박본사', '$2b$10$6gcSznBIh6qs7NDhRl.7/ul/vd8aw9m0lKakI2a1xH6456k1BP99G', '010-2222-2222', 'hq_management', true, 1, 2, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 이민수 (project_manager) 
INSERT INTO users (id, email, name, hashed_password, phone, role, is_active, company_id, position_id, created_at, updated_at) 
VALUES ('project_manager_001', 'lee@test.com', '이민수', '$2b$10$6gcSznBIh6qs7NDhRl.7/ul/vd8aw9m0lKakI2a1xH6456k1BP99G', '010-3333-3333', 'project_manager', true, 1, 3, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 김발주 (project_manager)
INSERT INTO users (id, email, name, hashed_password, phone, role, is_active, company_id, position_id, created_at, updated_at) 
VALUES ('order_manager_001', 'kim@test.com', '김발주', '$2b$10$6gcSznBIh6qs7NDhRl.7/ul/vd8aw9m0lKakI2a1xH6456k1BP99G', '010-4444-4444', 'project_manager', true, 1, 3, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 홍테스트 (field_worker)
INSERT INTO users (id, email, name, hashed_password, phone, role, is_active, company_id, position_id, created_at, updated_at) 
VALUES ('field_worker_001', 'testuser@company.co.kr', '홍테스트', '$2b$10$15bQGHcUNCVEVxopWX1bVeYCdYqFQ5kv35S2tAITU6PoXf24dllI6', '010-5555-7777', 'field_worker', true, 1, 4, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 유재석 (executive)
INSERT INTO users (id, email, name, hashed_password, phone, role, is_active, company_id, position_id, created_at, updated_at) 
VALUES ('executive_001', 'you@test.com', '유재석', '$2b$10$6gcSznBIh6qs7NDhRl.7/ul/vd8aw9m0lKakI2a1xH6456k1BP99G', '010-6666-6666', 'executive', true, 1, 1, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 4. 프로젝트 데이터 (매뉴얼 테스트 시나리오 기준)
-- 힐스테이트 판교 (HSP-2024) - active
INSERT INTO projects (id, project_name, project_code, client_name, project_type, location, status, total_budget, project_manager_id, order_manager_id, description, start_date, end_date, is_active, created_at, updated_at)
VALUES (1, '힐스테이트 판교', 'HSP-2024', '현대건설(주)', 'residential', '경기도 성남시 분당구 판교동', 'active', '50000000000', 'project_manager_001', 'order_manager_001', '판교 택지지구 힐스테이트 아파트 신축공사', '2024-01-15', '2025-12-31', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 아이파크 분당 (IPD-2024) - active
INSERT INTO projects (id, project_name, project_code, client_name, project_type, location, status, total_budget, project_manager_id, order_manager_id, description, start_date, end_date, is_active, created_at, updated_at)
VALUES (2, '아이파크 분당', 'IPD-2024', '아이파크개발(주)', 'residential', '경기도 성남시 분당구 정자동', 'active', '35000000000', 'project_manager_001', 'order_manager_001', '분당신도시 아이파크 아파트 신축공사', '2024-03-01', '2024-11-30', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 힐스테이트 ㅇㅇㅇ (HSO-2025) - planning
INSERT INTO projects (id, project_name, project_code, client_name, project_type, location, status, total_budget, project_manager_id, order_manager_id, description, start_date, end_date, is_active, created_at, updated_at)
VALUES (3, '힐스테이트 ㅇㅇㅇ', 'HSO-2025', '현대건설(주)', 'residential', '서울특별시 강남구 역삼동', 'planning', '80000000000', 'project_manager_001', 'order_manager_001', '강남 힐스테이트 프리미엄 아파트 신축공사', '2025-01-01', '2026-12-31', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 테스트 아파트 건설 현장 (TEST-2025-001) - active
INSERT INTO projects (id, project_name, project_code, client_name, project_type, location, status, total_budget, project_manager_id, order_manager_id, description, start_date, end_date, is_active, created_at, updated_at)
VALUES (4, '테스트 아파트 건설 현장', 'TEST-2025-001', '테스트건설(주)', 'residential', '서울특별시 강남구 테스트로 123', 'active', '50000000000', 'project_manager_001', 'order_manager_001', '매뉴얼 테스트용 아파트 건설 현장', '2025-07-22', '2026-07-22', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 5. 거래처 데이터 (매뉴얼 테스트 시나리오용 추가)
INSERT INTO vendors (id, name, business_number, industry, representative, main_contact, contact_person, email, phone, address, memo, is_active, created_at, updated_at)
VALUES (5, '테스트건설(주)', '123-45-67890', '건설업', '김테스트', '이영업', '이영업', 'test@testconstruction.co.kr', '010-1234-5678', '서울특별시 강남구 테스트로 123', '매뉴얼 테스트용 신규 등록 거래처', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 6. 승인 권한 데이터 (역할별 승인 한도)
INSERT INTO approval_authorities (role, max_amount, description, created_at, updated_at) VALUES
('field_worker', '500000', '현장직 승인 권한 (50만원)', NOW(), NOW()),
('project_manager', '5000000', '현장관리자 승인 권한 (500만원)', NOW(), NOW()),  
('hq_management', '50000000', '본사관리자 승인 권한 (5천만원)', NOW(), NOW()),
('executive', '100000000', '임원 승인 권한 (1억원)', NOW(), NOW()),
('admin', '999999999999', '관리자 무제한 승인 권한', NOW(), NOW())
ON CONFLICT (role) DO NOTHING;

-- 확인용 쿼리들
SELECT '=== 삽입된 데이터 확인 ===' as status;
SELECT 'Companies:' as table_name, COUNT(*) as count FROM companies;
SELECT 'Positions:' as table_name, COUNT(*) as count FROM positions;
SELECT 'Users:' as table_name, COUNT(*) as count FROM users;
SELECT 'Projects:' as table_name, COUNT(*) as count FROM projects;
SELECT 'Vendors:' as table_name, COUNT(*) as count FROM vendors;
SELECT 'Approval Authorities:' as table_name, COUNT(*) as count FROM approval_authorities;

-- 사용자 목록 확인
SELECT name, email, role, phone FROM users ORDER BY role, name;

-- 프로젝트 목록 확인  
SELECT project_name, project_code, status, client_name FROM projects ORDER BY id;

-- 매뉴얼 테스트용 로그인 계정 정보
SELECT '=== 매뉴얼 테스트용 로그인 계정 정보 ===' as info;
SELECT 
  name as "이름",
  email as "이메일", 
  CASE role
    WHEN 'admin' THEN '관리자'
    WHEN 'executive' THEN '임원' 
    WHEN 'hq_management' THEN '본사관리'
    WHEN 'project_manager' THEN '현장관리자'
    WHEN 'field_worker' THEN '현장직'
  END as "역할",
  CASE 
    WHEN email = 'test@ikjin.co.kr' THEN 'admin123'
    WHEN email = 'testuser@company.co.kr' THEN 'TempPassword123!'
    ELSE 'password123'
  END as "비밀번호"
FROM users 
ORDER BY 
  CASE role
    WHEN 'admin' THEN 1
    WHEN 'executive' THEN 2
    WHEN 'hq_management' THEN 3 
    WHEN 'project_manager' THEN 4
    WHEN 'field_worker' THEN 5
  END;