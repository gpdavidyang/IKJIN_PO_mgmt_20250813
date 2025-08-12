-- Add approval workflow settings table
CREATE TABLE IF NOT EXISTS approval_workflow_settings (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id),
  approval_mode VARCHAR(20) NOT NULL DEFAULT 'staged', -- 'direct' or 'staged'
  direct_approval_roles JSONB DEFAULT '[]', -- roles that can approve directly
  staged_approval_thresholds JSONB DEFAULT '{}', -- max amount each role can approve
  require_all_stages BOOLEAN DEFAULT true, -- whether all stages must approve
  skip_lower_stages BOOLEAN DEFAULT false, -- whether higher roles can skip lower stages
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255) REFERENCES users(id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_approval_workflow_company ON approval_workflow_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflow_active ON approval_workflow_settings(is_active);

-- Insert default settings
INSERT INTO approval_workflow_settings (company_id, approval_mode, direct_approval_roles, staged_approval_thresholds)
VALUES 
  (1, 'staged', '[]', '{"field_worker": 0, "project_manager": 5000000, "hq_management": 30000000, "executive": 100000000, "admin": 999999999}')
ON CONFLICT DO NOTHING;

-- Add comments
COMMENT ON TABLE approval_workflow_settings IS '승인 워크플로우 설정 테이블';
COMMENT ON COLUMN approval_workflow_settings.approval_mode IS '승인 모드: direct(직접 승인) 또는 staged(단계별 승인)';
COMMENT ON COLUMN approval_workflow_settings.direct_approval_roles IS '직접 승인 가능한 역할 목록';
COMMENT ON COLUMN approval_workflow_settings.staged_approval_thresholds IS '단계별 승인 금액 한도';
COMMENT ON COLUMN approval_workflow_settings.require_all_stages IS '모든 단계 승인 필요 여부';
COMMENT ON COLUMN approval_workflow_settings.skip_lower_stages IS '상위 역할이 하위 단계 건너뛸 수 있는지 여부';