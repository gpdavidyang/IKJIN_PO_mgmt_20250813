const { Pool } = require('pg');

async function checkTables() {
  try {
    const pool = new Pool({
      connectionString: "postgresql://postgres.tbvugytmskxxyqfvqmup:gps110601ysw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
    });
    
    // Check projects table columns
    console.log('=== Projects table columns ===');
    const projectColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'projects' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    console.log(projectColumns.rows);
    
    // Check project status enum values
    console.log('\n=== Project status enum values ===');
    const enumValues = await pool.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'project_status'
      );
    `);
    console.log(enumValues.rows);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTables();