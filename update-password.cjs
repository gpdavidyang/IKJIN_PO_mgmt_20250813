const bcrypt = require('bcrypt');
const { Pool } = require('pg');

async function updatePassword() {
  try {
    const pool = new Pool({
      connectionString: "postgresql://postgres.tbvugytmskxxyqfvqmup:gps110601ysw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
    });
    
    const plainPassword = 'password123';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    console.log('New password hash:', hashedPassword);
    
    // Update the user's password
    const result = await pool.query(`
      UPDATE users 
      SET hashed_password = $1, updated_at = NOW()
      WHERE email = 'test@ikjin.co.kr'
      RETURNING id, email;
    `, [hashedPassword]);
    
    console.log('Updated user:', result.rows[0]);
    
    // Test the new password
    const testMatch = await bcrypt.compare(plainPassword, hashedPassword);
    console.log('Password verification test:', testMatch);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

updatePassword();