-- Insert Korean UI terms for user roles with UPSERT logic
INSERT INTO ui_terms (term_key, term_value, category, description, is_active, created_at, updated_at) 
VALUES 
  ('field_worker', '현장 작업자', 'user_roles', '현장에서 직접 작업을 수행하는 작업자', true, NOW(), NOW()),
  ('project_manager', '현장 관리자', 'user_roles', '현장 프로젝트를 관리하는 관리자', true, NOW(), NOW()),
  ('hq_management', '본사 관리자', 'user_roles', '본사에서 전체적인 관리업무를 담당하는 관리자', true, NOW(), NOW()),
  ('executive', '임원', 'user_roles', '회사의 임원급 직책을 담당하는 사용자', true, NOW(), NOW()),
  ('admin', '시스템 관리자', 'user_roles', '시스템 전체를 관리할 수 있는 최고 권한 사용자', true, NOW(), NOW())
ON CONFLICT (term_key) DO UPDATE SET
  term_value = EXCLUDED.term_value,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  updated_at = NOW();