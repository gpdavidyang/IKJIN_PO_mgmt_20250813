const { Pool } = require('pg');
require('dotenv').config();

async function createAuditTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Creating audit system tables...');
    
    // Create enums
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE audit_event_type AS ENUM ('login', 'logout', 'login_failed', 'password_change', 'permission_change', 'data_create', 'data_read', 'data_update', 'data_delete', 'data_export', 'system_start', 'system_stop', 'system_error', 'config_change', 'security_alert');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE audit_log_level AS ENUM ('OFF', 'ERROR', 'WARNING', 'INFO', 'DEBUG');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    console.log('✓ Enums created');

    // Create system_audit_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_audit_logs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
        user_name VARCHAR(255),
        user_role VARCHAR(50),
        event_type audit_event_type NOT NULL,
        event_category VARCHAR(50) NOT NULL,
        action TEXT NOT NULL,
        entity_type VARCHAR(100),
        entity_id VARCHAR(255),
        table_name VARCHAR(100),
        old_data TEXT,
        new_data TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        session_id VARCHAR(255),
        request_method VARCHAR(10),
        request_path TEXT,
        response_status INTEGER,
        response_time INTEGER,
        error_message TEXT,
        additional_details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✓ system_audit_logs table created');

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON system_audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON system_audit_logs(event_type);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON system_audit_logs(event_category);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON system_audit_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON system_audit_logs(entity_type, entity_id);
    `);
    
    console.log('✓ Indexes created');

    // Create audit_settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_settings (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        log_level audit_log_level DEFAULT 'INFO',
        enable_auth BOOLEAN DEFAULT true,
        enable_data BOOLEAN DEFAULT true,
        enable_system BOOLEAN DEFAULT true,
        enable_security BOOLEAN DEFAULT true,
        retention_days INTEGER DEFAULT 30,
        archive_enabled BOOLEAN DEFAULT true,
        max_log_size INTEGER DEFAULT 1000000,
        auto_cleanup BOOLEAN DEFAULT true,
        alerts_enabled BOOLEAN DEFAULT true,
        email_notifications BOOLEAN DEFAULT false,
        real_time_monitoring BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      );
    `);
    
    console.log('✓ audit_settings table created');

    // Create archived_audit_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS archived_audit_logs (
        id SERIAL PRIMARY KEY,
        original_id INTEGER,
        user_id VARCHAR(255),
        user_name VARCHAR(255),
        user_role VARCHAR(50),
        event_type VARCHAR(50),
        event_category VARCHAR(50),
        action TEXT,
        entity_type VARCHAR(100),
        entity_id VARCHAR(255),
        table_name VARCHAR(100),
        old_data TEXT,
        new_data TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        session_id VARCHAR(255),
        created_at TIMESTAMP,
        archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✓ archived_audit_logs table created');

    // Create audit_alert_rules table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_alert_rules (
        id SERIAL PRIMARY KEY,
        rule_name VARCHAR(255) NOT NULL,
        description TEXT,
        event_type audit_event_type,
        event_category VARCHAR(50),
        pattern TEXT,
        threshold INTEGER,
        time_window INTEGER,
        severity VARCHAR(20),
        notification_emails TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✓ audit_alert_rules table created');

    // Insert default settings
    await pool.query(`
      INSERT INTO audit_settings (user_id, log_level, enable_auth, enable_data, enable_system, enable_security)
      VALUES (NULL, 'INFO', true, true, true, true)
      ON CONFLICT (user_id) DO NOTHING;
    `);
    
    console.log('✓ Default settings inserted');
    
    console.log('\n✅ All audit tables created successfully!');
  } catch (error) {
    console.error('Error creating audit tables:', error);
  } finally {
    await pool.end();
  }
}

createAuditTables();
