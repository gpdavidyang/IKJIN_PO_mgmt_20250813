import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { users } from '../shared/schema.ts';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

async function checkAndCreateUser() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  console.log('🔍 Checking existing users...');
  const existingUsers = await db.select().from(users).limit(10);
  console.log('📊 Found', existingUsers.length, 'users');
  
  if (existingUsers.length > 0) {
    console.log('👥 Existing users:');
    existingUsers.forEach(user => {
      console.log('-', user.email, '(', user.role, ')');
    });
  }
  
  // Check if admin user exists
  const adminUser = existingUsers.find(u => u.role === 'admin');
  if (!adminUser) {
    console.log('🔧 Creating admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await db.insert(users).values({
      email: 'admin@test.com',
      name: 'Admin User', 
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('✅ Admin user created: admin@test.com / admin123');
  } else {
    console.log('✅ Admin user already exists:', adminUser.email);
  }
  
  await pool.end();
}

checkAndCreateUser().catch(console.error);