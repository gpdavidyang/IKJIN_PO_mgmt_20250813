// View audit logs directly from database
import pg from 'pg';
const { Client } = pg;

async function viewAuditLogs() {
  const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres.tbvugytmskxxyqfvqmup:gps110601ysw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
  
  console.log('Fetching audit logs from database...\n');
  
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Get recent audit logs
    const result = await client.query(`
      SELECT 
        id,
        user_id,
        user_name,
        event_type,
        event_category,
        action,
        response_status,
        response_time,
        created_at
      FROM system_audit_logs
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    if (result.rows.length > 0) {
      console.log('📋 Recent Audit Logs:');
      console.log('====================');
      result.rows.forEach(log => {
        console.log(`\n🔍 Log ID: ${log.id}`);
        console.log(`   Time: ${log.created_at}`);
        console.log(`   User: ${log.user_name || log.user_id || 'Anonymous'}`);
        console.log(`   Event: ${log.event_type} (${log.event_category})`);
        console.log(`   Action: ${log.action}`);
        console.log(`   Status: ${log.response_status}`);
        console.log(`   Response Time: ${log.response_time}ms`);
      });
    } else {
      console.log('No audit logs found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
    console.log('\nConnection closed');
  }
}

viewAuditLogs();