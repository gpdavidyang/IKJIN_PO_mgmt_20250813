// Update enum values in database
import pg from 'pg';
const { Client } = pg;

async function updateEnumValues() {
  const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres.tbvugytmskxxyqfvqmup:gps110601ysw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
  
  console.log('Adding missing enum values to database...\n');
  
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Add missing enum values
    const newValues = [
      'session_expired',
      'approval_request', 
      'approval_grant',
      'approval_reject',
      'email_send',
      'file_upload',
      'file_download',
      'settings_change',
      'api_access'
    ];

    for (const value of newValues) {
      try {
        await client.query(`
          ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS '${value}';
        `);
        console.log(`✅ Added enum value: ${value}`);
      } catch (error) {
        console.log(`⚠️  Could not add ${value}: ${error.message}`);
      }
    }

    // Verify all values
    const enumQuery = await client.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'audit_event_type'
      )
      ORDER BY enumsortorder;
    `);
    
    console.log('\n📋 Updated audit_event_type enum values:');
    enumQuery.rows.forEach(row => {
      console.log(`  - ${row.enumlabel}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
    console.log('\nConnection closed');
  }
}

updateEnumValues();