import dotenv from "dotenv";
dotenv.config();

// 환경변수에서 DATABASE_URL 읽기 - .env 파일의 올바른 pooler 주소 사용
const DATABASE_URL = process.env.DATABASE_URL;
console.log("🔍 Using DATABASE_URL:", DATABASE_URL?.split('@')[0] + '@[HIDDEN]');

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