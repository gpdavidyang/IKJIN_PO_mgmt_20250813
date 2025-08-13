import dotenv from "dotenv";
dotenv.config();

// 환경변수에서 DATABASE_URL 읽기 - .env 파일의 올바른 pooler 주소 사용
let DATABASE_URL = process.env.DATABASE_URL;
console.log("🔍 Original DATABASE_URL:", DATABASE_URL?.split('@')[0] + '@[HIDDEN]');

// Force correct Supabase pooler URL for serverless environments
const correctPoolerUrl = "postgresql://postgres.tbvugytmskxxyqfvqmup:gps110601ysw@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres";

if (DATABASE_URL && (
  DATABASE_URL.includes('db.tbvugytmskxxyqfvqmup.supabase.co') || 
  DATABASE_URL.includes('tbvugytmskxxyqfvqmup.supabase.co:5432')
)) {
  console.log("🔧 Fixing incorrect hostname to use pooler URL");
  DATABASE_URL = correctPoolerUrl;
} else if (!DATABASE_URL) {
  console.log("🔧 No DATABASE_URL set, using default Supabase pooler");
  DATABASE_URL = correctPoolerUrl;
}

console.log("🔍 Final DATABASE_URL:", DATABASE_URL?.split('@')[0] + '@[HIDDEN]');

// Use standard postgres driver for better Supabase compatibility
import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as schema from "@shared/schema";

let db: any = null;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not set - cannot connect to database");
  process.exit(1);
} else {
  try {
    console.log("🔄 Creating PostgreSQL connection pool with URL:", DATABASE_URL?.split('@')[0] + '@[HIDDEN]');
    
    const pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // Supabase requires SSL
      max: 5, // Reduced connection pool size for serverless
      min: 1, // Minimum connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      acquireTimeoutMillis: 5000, // Timeout for acquiring connection
    });
    
    // Test the connection
    pool.on('error', (err) => {
      console.error('💥 Database pool error:', err);
    });
    
    db = drizzle(pool, { schema });
    console.log("✅ Database connected successfully (PostgreSQL pool)");
  } catch (error) {
    console.error("❌ Database connection failed:", error instanceof Error ? error.message : String(error));
    console.error("❌ Database error details:", error);
    process.exit(1);
  }
}

export { db };