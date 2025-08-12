-- Supabase Schema Creation Script
-- 구매발주관리시스템 데이터베이스 스키마

-- 사용자 역할 열거형
CREATE TYPE user_role AS ENUM('field_worker', 'project_manager', 'hq_management', 'executive', 'admin');

-- 발주서 상태 열거형
CREATE TYPE purchase_order_status AS ENUM('draft', 'pending', 'approved', 'sent', 'completed', 'cancelled');

-- 프로젝트 상태 열거형
CREATE TYPE project_status AS ENUM('active', 'completed', 'on_hold', 'cancelled');

-- 프로젝트 유형 열거형
CREATE TYPE project_type AS ENUM('commercial', 'residential', 'industrial', 'infrastructure');

-- 승인 역할 열거형
CREATE TYPE approval_role AS ENUM('field_worker', 'project_manager', 'hq_management', 'executive', 'admin');

-- 로그인 상태 열거형
CREATE TYPE login_status AS ENUM('success', 'failed', 'locked');

-- 사용자 테이블
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    role user_role NOT NULL DEFAULT 'field_worker',
    position VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    profile_image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 세션 테이블
CREATE TABLE sessions (
    id VARCHAR(128) PRIMARY KEY,
    expires BIGINT NOT NULL,
    data TEXT
);

-- 회사 테이블
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    business_number VARCHAR(20) UNIQUE,
    address TEXT,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 거래처 테이블
CREATE TABLE vendors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    business_number VARCHAR(20) UNIQUE,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    business_type VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 프로젝트 테이블
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    project_name VARCHAR(255) NOT NULL,
    project_code VARCHAR(50) UNIQUE NOT NULL,
    client_name VARCHAR(255),
    project_type project_type NOT NULL DEFAULT 'commercial',
    location TEXT,
    start_date DATE,
    end_date DATE,
    status project_status NOT NULL DEFAULT 'active',
    total_budget DECIMAL(15,2),
    project_manager_id VARCHAR(50),
    order_manager_id VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_manager_id) REFERENCES users(id),
    FOREIGN KEY (order_manager_id) REFERENCES users(id)
);

-- 프로젝트 멤버 테이블
CREATE TABLE project_members (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    role VARCHAR(50) NOT NULL,
    assigned_by VARCHAR(50),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- 프로젝트 이력 테이블
CREATE TABLE project_history (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    changed_by VARCHAR(50) NOT NULL,
    change_type VARCHAR(50) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- 품목 카테고리 테이블
CREATE TABLE item_categories (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    category_type VARCHAR(20) NOT NULL CHECK (category_type IN ('major', 'middle', 'minor')),
    parent_id INTEGER,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES item_categories(id)
);

-- 품목 테이블
CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specification TEXT,
    unit VARCHAR(20) NOT NULL,
    unit_price DECIMAL(12,2),
    category VARCHAR(100),
    major_category VARCHAR(100),
    middle_category VARCHAR(100),
    minor_category VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 발주 템플릿 테이블
CREATE TABLE order_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(255) NOT NULL,
    template_type VARCHAR(50) NOT NULL,
    description TEXT,
    form_fields JSONB,
    is_active BOOLEAN DEFAULT true,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 템플릿 필드 테이블
CREATE TABLE template_fields (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    field_type VARCHAR(50) NOT NULL,
    field_label VARCHAR(255),
    field_options JSONB,
    validation_rules JSONB,
    display_order INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES order_templates(id) ON DELETE CASCADE
);

-- 발주서 테이블
CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    vendor_id INTEGER,
    project_id INTEGER,
    template_id INTEGER,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    delivery_date DATE,
    total_amount DECIMAL(15,2) DEFAULT 0,
    status purchase_order_status NOT NULL DEFAULT 'draft',
    notes TEXT,
    payment_terms VARCHAR(255),
    delivery_address TEXT,
    is_approved BOOLEAN DEFAULT false,
    approved_by VARCHAR(50),
    approved_at TIMESTAMP,
    current_approver_role approval_role,
    approval_level INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (template_id) REFERENCES order_templates(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- 발주서 항목 테이블
CREATE TABLE purchase_order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    specification TEXT,
    unit VARCHAR(20) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
);

-- 첨부파일 테이블
CREATE TABLE attachments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    original_name VARCHAR(500) NOT NULL,
    stored_name VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_by VARCHAR(50),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- 발주서 이력 테이블
CREATE TABLE order_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    changes JSONB,
    notes TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 승인 권한 테이블
CREATE TABLE approval_authorities (
    id SERIAL PRIMARY KEY,
    role approval_role NOT NULL UNIQUE,
    max_amount DECIMAL(15,2) NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 송장 테이블
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL,
    invoice_amount DECIMAL(15,2) NOT NULL,
    due_date DATE,
    status VARCHAR(20) DEFAULT 'pending',
    uploaded_by VARCHAR(50),
    verified_by VARCHAR(50),
    verified_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    FOREIGN KEY (verified_by) REFERENCES users(id)
);

-- 품목 입고 테이블
CREATE TABLE item_receipts (
    id SERIAL PRIMARY KEY,
    order_item_id INTEGER NOT NULL,
    invoice_id INTEGER,
    received_quantity DECIMAL(10,3) NOT NULL,
    received_date DATE NOT NULL,
    quality_status VARCHAR(20) DEFAULT 'good',
    verified_by VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_item_id) REFERENCES purchase_order_items(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (verified_by) REFERENCES users(id)
);

-- 검증 로그 테이블
CREATE TABLE verification_logs (
    id SERIAL PRIMARY KEY,
    order_id INTEGER,
    invoice_id INTEGER,
    item_receipt_id INTEGER,
    action VARCHAR(50) NOT NULL,
    details TEXT,
    performed_by VARCHAR(50) NOT NULL,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (item_receipt_id) REFERENCES item_receipts(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES users(id)
);

-- UI 용어 테이블
CREATE TABLE ui_terms (
    term_key VARCHAR(100) PRIMARY KEY,
    term_value VARCHAR(500) NOT NULL,
    category VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 용어 사전 테이블
CREATE TABLE terminology (
    id SERIAL PRIMARY KEY,
    term_key VARCHAR(100) NOT NULL,
    term_value VARCHAR(500) NOT NULL,
    category VARCHAR(50),
    description TEXT,
    example_usage TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 로그인 감사 로그 테이블
CREATE TABLE login_audit_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50),
    email VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    login_status login_status NOT NULL,
    failure_reason VARCHAR(255),
    session_id VARCHAR(128),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 이메일 인증 토큰 테이블
CREATE TABLE email_verification_tokens (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    token_type VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 가입 대기 사용자 테이블
CREATE TABLE pending_registrations (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    role user_role NOT NULL DEFAULT 'field_worker',
    position VARCHAR(100),
    verification_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 이메일 발송 이력 테이블
CREATE TABLE email_sending_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER,
    order_number VARCHAR(50),
    sender_user_id VARCHAR(50),
    recipients JSONB NOT NULL,
    cc JSONB,
    bcc JSONB,
    subject TEXT NOT NULL,
    message_content TEXT,
    attachment_files JSONB,
    sending_status VARCHAR(20) DEFAULT 'pending',
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    error_message TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES purchase_orders(id),
    FOREIGN KEY (sender_user_id) REFERENCES users(id)
);

-- 이메일 발송 상세 테이블
CREATE TABLE email_sending_details (
    id SERIAL PRIMARY KEY,
    history_id INTEGER NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_type VARCHAR(10) NOT NULL CHECK (recipient_type IN ('to', 'cc', 'bcc')),
    sending_status VARCHAR(20) DEFAULT 'pending',
    message_id VARCHAR(255),
    error_message TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (history_id) REFERENCES email_sending_history(id) ON DELETE CASCADE
);

-- Handsontable 설정 테이블
CREATE TABLE handsontable_configs (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL,
    config_name VARCHAR(100) NOT NULL,
    table_config JSONB NOT NULL,
    headers JSONB,
    column_types JSONB,
    validation_rules JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES order_templates(id) ON DELETE CASCADE
);

-- 발주서 상태 표시 뷰
CREATE OR REPLACE VIEW purchase_order_status_display AS
SELECT 
    'draft' as status_code,
    '임시저장' as status_name,
    '#9CA3AF' as status_color,
    1 as sort_order
UNION ALL
SELECT 
    'pending' as status_code,
    '승인대기' as status_name,
    '#F59E0B' as status_color,
    2 as sort_order
UNION ALL
SELECT 
    'approved' as status_code,
    '승인완료' as status_name,
    '#10B981' as status_color,
    3 as sort_order
UNION ALL
SELECT 
    'sent' as status_code,
    '발송완료' as status_name,
    '#3B82F6' as status_color,
    4 as sort_order
UNION ALL
SELECT 
    'completed' as status_code,
    '완료' as status_name,
    '#6366F1' as status_color,
    5 as sort_order
UNION ALL
SELECT 
    'cancelled' as status_code,
    '취소' as status_name,
    '#EF4444' as status_color,
    6 as sort_order;

-- 기본 데이터 삽입
INSERT INTO approval_authorities (role, max_amount, description) VALUES
('field_worker', 0.00, '현장실무자 - 승인 권한 없음'),
('project_manager', 5000000.00, '현장관리자 - 500만원 이하 승인'),
('hq_management', 30000000.00, '본사관리부 - 3천만원 이하 승인'),
('executive', 100000000.00, '임원 - 1억원 이하 승인'),
('admin', 999999999.99, '시스템관리자 - 무제한 승인');

-- 인덱스 생성
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_user_id ON purchase_orders(user_id);
CREATE INDEX idx_purchase_orders_vendor_id ON purchase_orders(vendor_id);
CREATE INDEX idx_purchase_orders_project_id ON purchase_orders(project_id);
CREATE INDEX idx_purchase_orders_order_date ON purchase_orders(order_date);
CREATE INDEX idx_purchase_order_items_order_id ON purchase_order_items(order_id);
CREATE INDEX idx_attachments_order_id ON attachments(order_id);
CREATE INDEX idx_order_history_order_id ON order_history(order_id);
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_login_audit_logs_email ON login_audit_logs(email);
CREATE INDEX idx_login_audit_logs_created_at ON login_audit_logs(created_at);
CREATE INDEX idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX idx_email_sending_history_order_id ON email_sending_history(order_id);
CREATE INDEX idx_email_sending_details_history_id ON email_sending_details(history_id);

-- 완료 메시지
SELECT 'Supabase schema creation completed successfully!' as status;