-- Create validation_sessions table
CREATE TABLE IF NOT EXISTS validation_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    total_items INTEGER DEFAULT 0,
    valid_items INTEGER DEFAULT 0,
    warning_items INTEGER DEFAULT 0,
    error_items INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    metadata JSONB
);

-- Create validation_results table
CREATE TABLE IF NOT EXISTS validation_results (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    row_index INTEGER NOT NULL,
    field_name VARCHAR(100),
    original_value TEXT,
    validated_value TEXT,
    validation_status VARCHAR(20),
    error_message TEXT,
    suggestion TEXT,
    confidence DECIMAL(5, 2),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create ai_suggestions table
CREATE TABLE IF NOT EXISTS ai_suggestions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    row_index INTEGER NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    original_value TEXT,
    suggested_value TEXT,
    suggestion_type VARCHAR(50),
    confidence DECIMAL(5, 2) NOT NULL,
    reason TEXT,
    applied BOOLEAN DEFAULT FALSE,
    applied_at TIMESTAMP,
    applied_by INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create vendor_mappings table
CREATE TABLE IF NOT EXISTS vendor_mappings (
    id SERIAL PRIMARY KEY,
    original_name VARCHAR(255) NOT NULL,
    mapped_vendor_id INTEGER NOT NULL,
    mapped_vendor_name VARCHAR(255) NOT NULL,
    confidence DECIMAL(5, 2) NOT NULL,
    usage_count INTEGER DEFAULT 1,
    last_used_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER
);

-- Create category_mappings table
CREATE TABLE IF NOT EXISTS category_mappings (
    id SERIAL PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    major_category VARCHAR(100),
    middle_category VARCHAR(100),
    minor_category VARCHAR(100),
    confidence DECIMAL(5, 2) NOT NULL,
    usage_count INTEGER DEFAULT 1,
    last_used_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_validation_sessions_user_id ON validation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_validation_results_session_id ON validation_results(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_session_id ON ai_suggestions(session_id);
CREATE INDEX IF NOT EXISTS idx_vendor_mappings_original_name ON vendor_mappings(original_name);
CREATE INDEX IF NOT EXISTS idx_category_mappings_item_name ON category_mappings(item_name);