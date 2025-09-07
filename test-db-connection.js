import pkg from 'pg';
const { Pool } = pkg;

const DATABASE_URL = "postgresql://postgres.tbvugytmskxxyqfvqmup:gps110601ysw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";

async function testConnection() {
  console.log("🔄 Testing database connection...");
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 5000,
  });
  
  try {
    const result = await pool.query('SELECT NOW()');
    console.log("✅ Database connection successful!");
    console.log("📅 Server time:", result.rows[0].now);
    
    // Test users table
    const usersResult = await pool.query('SELECT COUNT(*) FROM users');
    console.log("👥 Users count:", usersResult.rows[0].count);
    
    // Check if admin user exists
    const adminResult = await pool.query("SELECT id, email, name, role FROM users WHERE email = 'admin@company.com'");
    if (adminResult.rows.length > 0) {
      console.log("✅ Admin user found:", adminResult.rows[0]);
    } else {
      console.log("⚠️ Admin user not found in database");
    }
    
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    console.error("Error details:", error);
  } finally {
    await pool.end();
  }
}

testConnection();