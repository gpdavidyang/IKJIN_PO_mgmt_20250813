// Check actual enum values in database
import pg from 'pg';
const { Client } = pg;

async function checkEnumValues() {
  const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres.tbvugytmskxxyqfvqmup:gps110601ysw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
  
  console.log('Checking enum values in database...\n');
  
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Check audit_event_type enum values
    const enumQuery = await client.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'audit_event_type'
      )
      ORDER BY enumsortorder;
    `);
    
    console.log('📋 audit_event_type enum values:');
    if (enumQuery.rows.length > 0) {
      enumQuery.rows.forEach(row => {
        console.log(`  - ${row.enumlabel}`);
      });
    } else {
      console.log('  No enum values found or enum does not exist');
    }

    // Check what event types are actually in the data
    const dataQuery = await client.query(`
      SELECT DISTINCT event_type 
      FROM system_audit_logs 
      ORDER BY event_type;
    `);
    
    console.log('\n📊 Event types in actual data:');
    if (dataQuery.rows.length > 0) {
      dataQuery.rows.forEach(row => {
        console.log(`  - ${row.event_type}`);
      });
    } else {
      console.log('  No data found');
    }

    // Check audit_log_level enum values
    const logLevelQuery = await client.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'audit_log_level'
      )
      ORDER BY enumsortorder;
    `);
    
    console.log('\n📋 audit_log_level enum values:');
    if (logLevelQuery.rows.length > 0) {
      logLevelQuery.rows.forEach(row => {
        console.log(`  - ${row.enumlabel}`);
      });
    } else {
      console.log('  No enum values found or enum does not exist');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
    console.log('\nConnection closed');
  }
}

checkEnumValues();