// Simple standalone login handler for Vercel
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// Database schema definition
import { pgTable, text, boolean, timestamp, varchar } from 'drizzle-orm/pg-core';

const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  fullName: text('full_name').notNull(),
  role: text('role').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Database connection
const connectionString = process.env.DATABASE_URL || "postgresql://postgres.tbvugytmskxxyqfvqmup:gps110601ysw@db.tbvugytmskxxyqfvqmup.supabase.co:5432/postgres?sslmode=require&connect_timeout=60";

let client;
let db;

function getDatabase() {
  if (!client) {
    client = postgres(connectionString, { 
      max: 1,
      idle_timeout: 20,
      connect_timeout: 60
    });
    db = drizzle(client);
  }
  return db;
}

export default async function handler(req, res) {
  console.log('Simple login handler called:', req.method, req.url);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    console.log('Login attempt for email:', email);
    
    // Get database connection
    const database = getDatabase();
    
    // Find user by email
    const userList = await database
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    if (userList.length === 0) {
      console.log('User not found for email:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const user = userList[0];
    
    if (!user.isActive) {
      console.log('User account deactivated:', email);
      return res.status(401).json({ message: 'Account is deactivated' });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    console.log('Login successful for user:', email);
    
    // Return user data (exclude password)
    const { password: _, ...userWithoutPassword } = user;
    
    res.status(200).json({
      message: 'Login successful',
      user: userWithoutPassword
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Login failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    // Close connection if needed
    if (client) {
      try {
        await client.end();
        client = null;
        db = null;
      } catch (e) {
        console.error('Error closing database connection:', e);
      }
    }
  }
}