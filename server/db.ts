import dotenv from "dotenv";
dotenv.config();

// 환경변수에서 DATABASE_URL 읽기
let DATABASE_URL = process.env.DATABASE_URL;
console.log("🔍 DATABASE_URL status:", DATABASE_URL ? "Set" : "Not set");

// In Vercel serverless environment, if DATABASE_URL is not set, log error details
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set!");
  console.error("📍 Environment details:", {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_REGION: process.env.VERCEL_REGION
  });
  
  // In Vercel serverless, we should not call process.exit(1)
  // Instead, we'll handle this gracefully
  if (process.env.VERCEL) {
    console.error("🚨 Running in Vercel without DATABASE_URL - database operations will fail");
  }
} else {
  // Log sanitized URL for debugging
  const urlParts = DATABASE_URL.split('@');
  if (urlParts.length > 1) {
    console.log("🔍 Database host:", urlParts[1].split('/')[0]);
  }
}

// Use standard postgres driver for better Supabase compatibility
import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as schema from "@shared/schema";

let db: any = null;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not set - database connection not initialized");
  
  // In Vercel serverless, don't exit the process
  if (!process.env.VERCEL) {
    console.error("💀 Exiting process - DATABASE_URL is required");
    process.exit(1);
  } else {
    console.error("🚨 Vercel deployment without DATABASE_URL - API calls will fail");
    // Export null db for Vercel to handle errors at runtime
  }
} else {
  try {
    console.log("🔄 Creating PostgreSQL connection pool...");
    
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
    
    // In Vercel, log but don't exit
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
}

export { db };