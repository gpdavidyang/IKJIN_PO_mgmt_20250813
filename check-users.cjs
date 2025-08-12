const { Pool } = require('pg');

async function checkUsers() {
  try {
    const pool = new Pool({
      connectionString: "postgresql://postgres.tbvugytmskxxyqfvqmup:gps110601ysw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
    });
    
    // Check users table structure
    console.log('=== Users table columns ===');
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    console.log(columns.rows);
    
    // Check users data
    console.log('\n=== Users table data ===');
    const users = await pool.query(`
      SELECT *
      FROM users 
      ORDER BY id
      LIMIT 5;
    `);
    console.log(users.rows);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUsers();