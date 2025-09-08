import * as dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function checkUsers() {
  try {
    const users = await sql`
      SELECT 
        user_id,
        username,
        email,
        name,
        role,
        position,
        department,
        active,
        created_at
      FROM users 
      ORDER BY created_at DESC
      LIMIT 20
    `;
    
    console.log('\n=== USERS IN DATABASE ===\n');
    users.forEach(user => {
      console.log(`ID: ${user.user_id}`);
      console.log(`Username: ${user.username}`);
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${user.name}`);
      console.log(`Role: ${user.role}`);
      console.log(`Position: ${user.position || 'N/A'}`);
      console.log(`Department: ${user.department || 'N/A'}`);
      console.log(`Active: ${user.active}`);
      console.log(`Created: ${user.created_at}`);
      console.log('---');
    });
    
    // Check role distribution
    const roleCount = await sql`
      SELECT role, COUNT(*) as count 
      FROM users 
      WHERE active = true
      GROUP BY role
    `;
    
    console.log('\n=== ROLE DISTRIBUTION ===\n');
    roleCount.forEach(r => {
      console.log(`${r.role}: ${r.count} users`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkUsers();