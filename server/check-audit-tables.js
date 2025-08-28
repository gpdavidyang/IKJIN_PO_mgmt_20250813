// Check audit tables structure
import pg from 'pg';
const { Client } = pg;

async function checkAuditTables() {
  const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres.tbvugytmskxxyqfvqmup:gps110601ysw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
  
  console.log('Checking audit tables structure...');
  
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database successfully\n');

    // Check system_audit_logs table structure
    const columnsQuery = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'system_audit_logs'
      ORDER BY ordinal_position;
    `);
    
    if (columnsQuery.rows.length > 0) {
      console.log('📋 system_audit_logs table columns:');
      columnsQuery.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    } else {
      console.log('❌ system_audit_logs table not found');
    }

    // Check audit_settings table structure
    const settingsColumnsQuery = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'audit_settings'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 audit_settings table columns:');
    if (settingsColumnsQuery.rows.length > 0) {
      settingsColumnsQuery.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    } else {
      console.log('❌ audit_settings table not found');
    }

    // Check if there are any audit logs
    const logsCount = await client.query('SELECT COUNT(*) FROM system_audit_logs');
    console.log(`\n📊 Total audit logs: ${logsCount.rows[0].count}`);

    // Check if there are any audit settings
    const settingsCount = await client.query('SELECT COUNT(*) FROM audit_settings');
    console.log(`📊 Audit settings entries: ${settingsCount.rows[0].count}`);

    // If no settings, insert default
    if (settingsCount.rows[0].count === '0') {
      console.log('\n🔧 Inserting default audit settings...');
      await client.query(`
        INSERT INTO audit_settings (
          log_level, enable_auth, enable_data, enable_system, enable_security,
          excluded_paths, excluded_users, sensitive_data_masking,
          performance_tracking, api_access_logging, created_at, updated_at
        ) VALUES (
          'INFO', true, true, true, true,
          '[]'::jsonb, '[]'::jsonb, true,
          false, false, NOW(), NOW()
        )
      `);
      console.log('✅ Default audit settings inserted');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
    console.log('\nConnection closed');
  }
}

checkAuditTables();