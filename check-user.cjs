const { Client } = require('pg');
require('dotenv').config();

async function checkUser() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check test user
    const result = await client.query(`
      SELECT id, email, hashed_password, name, role
      FROM users 
      WHERE email = 'test@ikjin.co.kr'
    `);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('\n👤 Test user found:');
      console.log(`  - ID: ${user.id}`);
      console.log(`  - Email: ${user.email}`);
      console.log(`  - Name: ${user.name}`);
      console.log(`  - Role: ${user.role}`);
      console.log(`  - Password hash: ${user.hashed_password.substring(0, 20)}...`);
      console.log(`  - Hash length: ${user.hashed_password.length}`);
      console.log(`  - Hash starts with: ${user.hashed_password.substring(0, 10)}`);
    } else {
      console.log('\n❌ Test user not found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkUser();