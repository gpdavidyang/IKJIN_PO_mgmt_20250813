import dotenv from "dotenv";
dotenv.config();

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
// Alternative: Use standard postgres driver for better compatibility
import pkg from 'pg';
const { Pool } = pkg;
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

let db: any = null;

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL not set, using mock connection");
  db = null;
} else {
  try {
    // Try multiple connection methods for better reliability
    
    // Method 1: Try Neon serverless (current)
    try {
      const sql = neon(process.env.DATABASE_URL);
      db = drizzle(sql, { schema });
      console.log("✅ Database connected successfully (Neon serverless)");
    } catch (neonError) {
      console.warn("⚠️ Neon connection failed, trying standard PostgreSQL...", neonError.message);
      
      // Method 2: Try standard PostgreSQL connection
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 1, // Limit connections for development
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 5000,
      });
      
      db = pgDrizzle(pool, { schema });
      
      // Test the connection
      await pool.query('SELECT 1');
      console.log("✅ Database connected successfully (PostgreSQL)");
    }
  } catch (error) {
    console.error("❌ All database connection methods failed:", error.message);
    console.warn("🔄 Falling back to mock data mode");
    db = null;
  }
}

export { db };