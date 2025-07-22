-- =============================================
-- 테스트 사용자 생성 SQL Script
-- Purchase Order Management System
-- =============================================
-- 
-- 이 스크립트는 각 역할별 테스트 사용자를 생성합니다.
-- Data Integrity를 위해 SQL Editor를 통해 직접 실행하세요.
--
-- 사용자 역할 및 권한:
-- 1. field_worker: 현장근무자 - 기본 발주서 작성
-- 2. project_manager: 프로젝트 관리자 - 프로젝트별 발주 관리 
-- 3. hq_management: 본사관리자 - 중간 승인 권한
-- 4. executive: 임원 - 고액 승인 권한  
-- 5. admin: 시스템 관리자 - 모든 권한
-- =============================================

-- 기존 테스트 사용자들 삭제 (충돌 방지)
DELETE FROM users WHERE id LIKE 'test_%' AND id NOT IN ('test_admin_001');

-- 1. 현장근무자 (Field Worker)
INSERT INTO users (
    id, name, email, hashed_password, phone_number, role, position, is_active, created_at, updated_at
) VALUES (
    'test_field_001',
    '김현장',
    'field@ikji.co.kr', 
    '$2b$10$bSiRQIg1wlr.H/aOTh2eUefm2jRtRbefYsW2NvqHn0snUOY0VXztK',
    '010-1111-0001',
    'field_worker',
    '현장대리',
    true,
    NOW(),
    NOW()
);

-- 2. 프로젝트 관리자 (Project Manager)  
INSERT INTO users (
    id, name, email, hashed_password, phone_number, role, position, is_active, created_at, updated_at
) VALUES (
    'test_pm_001',
    '박프로젝트',
    'pm@ikji.co.kr',
    '$2b$10$ii.ije6QTzbnvVLI/EW37OIYK4/EL.F/BoUrmMWBse80PGocPn5sO', 
    '010-2222-0001',
    'project_manager',
    '프로젝트팀장',
    true,
    NOW(),
    NOW()
);

-- 3. 본사관리자 (HQ Management)
INSERT INTO users (
    id, name, email, hashed_password, phone_number, role, position, is_active, created_at, updated_at  
) VALUES (
    'test_hq_001',
    '이본사',
    'hq@ikji.co.kr',
    '$2b$10$qOCvMH72NmOsWwqEUpqkK.C5rKyaCoQaREYBubWGlHAFJ7.MRE7w.',
    '010-3333-0001', 
    'hq_management',
    '관리부장',
    true,
    NOW(),
    NOW()
);

-- 4. 임원 (Executive)
INSERT INTO users (
    id, name, email, hashed_password, phone_number, role, position, is_active, created_at, updated_at
) VALUES (
    'test_exec_001', 
    '최임원',
    'executive@ikji.co.kr',
    '$2b$10$ue5nWtQ4OK9HNWSlxgRIEew8M1mxYtY.WOnuHZO8vcovv0Po8i986',
    '010-4444-0001',
    'executive', 
    '상무이사',
    true,
    NOW(),
    NOW()
);

-- 5. 시스템 관리자 (Admin) - 추가
INSERT INTO users (
    id, name, email, hashed_password, phone_number, role, position, is_active, created_at, updated_at
) VALUES (
    'test_admin_002',
    '정관리자',
    'admin@ikji.co.kr', 
    '$2b$10$JDRSJCnwZMnPKNsLhnQ2NOVvw2dNL4nJzu0t9K11YkVEqJc2bT2YS',
    '010-5555-0001',
    'admin',
    '시스템관리자',
    true,
    NOW(),
    NOW()
);

-- =============================================
-- 승인 권한 설정 (approval_authorities)
-- =============================================
-- 기존 승인 권한 삭제 후 재생성
DELETE FROM approval_authorities;

INSERT INTO approval_authorities (role, max_amount, description, is_active) VALUES 
('field_worker', 500000.00, '현장근무자 - 50만원 이하 발주 가능', true),
('project_manager', 3000000.00, '프로젝트관리자 - 300만원 이하 발주 승인', true), 
('hq_management', 10000000.00, '본사관리자 - 1000만원 이하 발주 승인', true),
('executive', 50000000.00, '임원 - 5000만원 이하 발주 승인', true),
('admin', 999999999.99, '시스템관리자 - 무제한 승인 권한', true);

-- =============================================
-- 테스트 데이터 확인 쿼리
-- =============================================
-- 생성된 사용자 확인
SELECT 
    id, name, email, role, position, phone_number, is_active
FROM users 
WHERE id LIKE 'test_%'
ORDER BY 
    CASE role 
        WHEN 'field_worker' THEN 1
        WHEN 'project_manager' THEN 2  
        WHEN 'hq_management' THEN 3
        WHEN 'executive' THEN 4
        WHEN 'admin' THEN 5
    END;

-- 승인 권한 확인  
SELECT role, max_amount, description 
FROM approval_authorities 
ORDER BY max_amount;

-- =============================================
-- 테스트 로그인 정보
-- =============================================
/*
테스트 계정 정보:

1. 현장근무자 (김현장)
   - Email: field@ikji.co.kr
   - Password: field123
   - 권한: 50만원 이하 발주

2. 프로젝트관리자 (박프로젝트)  
   - Email: pm@ikji.co.kr
   - Password: project123
   - 권한: 300만원 이하 승인

3. 본사관리자 (이본사)
   - Email: hq@ikji.co.kr
   - Password: hq123
   - 권한: 1000만원 이하 승인

4. 임원 (최임원)
   - Email: executive@ikji.co.kr  
   - Password: exec123
   - 권한: 5000만원 이하 승인

5. 시스템관리자 (정관리자)
   - Email: admin@ikji.co.kr
   - Password: admin123
   - 권한: 무제한 승인
*/