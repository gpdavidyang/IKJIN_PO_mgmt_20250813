-- 누락된 테스트 사용자 추가 SQL
-- Supabase SQL Editor에서 직접 실행

-- 테스트 관리자 추가 (admin) - test@ikjin.co.kr / Admin123!
INSERT INTO users (
  id, 
  email, 
  name, 
  hashed_password, 
  phone_number, 
  role, 
  is_active, 
  two_factor_enabled,
  login_attempts,
  created_at,
  updated_at
) VALUES (
  'test_admin_001',
  'test@ikjin.co.kr',
  '테스트관리자',
  '$2b$10$U1.OOZkmgDuQq6nBQ4VMoO0v8jnY5gRIGcIyequY/Yd1Ve0oM6am.',
  '010-1111-1111',
  'admin',
  true,
  false,
  0,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 홍테스트 추가 (field_worker) - testuser@company.co.kr / TempPassword123!
INSERT INTO users (
  id,
  email,
  name,
  hashed_password,
  phone_number,
  role,
  is_active,
  two_factor_enabled,
  login_attempts,
  created_at,
  updated_at
) VALUES (
  'field_worker_001',
  'testuser@company.co.kr',
  '홍테스트',
  '$2b$10$15bQGHcUNCVEVxopWX1bVeYCdYqFQ5kv35S2tAITU6PoXf24dllI6',
  '010-5555-7777',
  'field_worker',
  true,
  false,
  0,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 확인 쿼리
SELECT 
  name as "이름",
  email as "이메일",
  role as "역할",
  phone_number as "전화번호",
  is_active as "활성상태",
  created_at as "생성일시"
FROM users 
WHERE email IN ('test@ikjin.co.kr', 'testuser@company.co.kr')
ORDER BY created_at DESC;