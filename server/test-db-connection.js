// Test database connection and session table
import pg from 'pg';
const { Client } = pg;

async function testConnection() {
  const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres.tbvugytmskxxyqfvqmup:gps110601ysw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
  
  console.log('Testing connection to:', databaseUrl.split('@')[0] + '@[HIDDEN]');
  
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database successfully');

    // Check if app_sessions table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'app_sessions'
      );
    `);
    
    console.log('app_sessions table exists:', tableCheck.rows[0].exists);

    if (!tableCheck.rows[0].exists) {
      console.log('Creating app_sessions table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS app_sessions (
          sid VARCHAR NOT NULL PRIMARY KEY,
          sess JSON NOT NULL,
          expire TIMESTAMP(6) NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_app_session_expire ON app_sessions (expire);
      `);
      console.log('✅ app_sessions table created');
    }

    // Check session count
    const sessionCount = await client.query('SELECT COUNT(*) FROM app_sessions');
    console.log('Current sessions in table:', sessionCount.rows[0].count);

    // Check for recent sessions
    const recentSessions = await client.query(`
      SELECT sid, expire, (sess::json->>'userId') as user_id 
      FROM app_sessions 
      WHERE expire > NOW() 
      ORDER BY expire DESC 
      LIMIT 5
    `);
    
    if (recentSessions.rows.length > 0) {
      console.log('Recent active sessions:');
      recentSessions.rows.forEach(session => {
        console.log(`  - SID: ${session.sid.substring(0, 20)}..., User: ${session.user_id}, Expires: ${session.expire}`);
      });
    } else {
      console.log('No active sessions found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await client.end();
    console.log('Connection closed');
  }
}

testConnection();