const bcrypt = require('bcrypt');
const { Pool } = require('pg');

async function createTestAccounts() {
  try {
    const pool = new Pool({
      connectionString: "postgresql://postgres.tbvugytmskxxyqfvqmup:gps110601ysw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
    });
    
    console.log('🔐 Creating test accounts for RBAC testing...\n');
    
    // Test accounts to create (all except admin which already exists)
    const testUsers = [
      { 
        id: 'exec-001', 
        email: 'executive@company.com', 
        name: '경영진 테스트', 
        password: 'exec123', 
        role: 'executive',
        position: '경영진'
      },
      { 
        id: 'hq-001', 
        email: 'hq@company.com', 
        name: '본사관리 테스트', 
        password: 'hq123', 
        role: 'hq_management',
        position: '본사 관리팀'
      },
      { 
        id: 'pm-001', 
        email: 'pm@company.com', 
        name: 'PM 테스트', 
        password: 'pm123', 
        role: 'project_manager',
        position: '프로젝트 매니저'
      },
      { 
        id: 'worker-001', 
        email: 'worker@company.com', 
        name: '현장작업자 테스트', 
        password: 'worker123', 
        role: 'field_worker',
        position: '현장 작업자'
      }
    ];

    for (const user of testUsers) {
      console.log(`➤ Creating account: ${user.email} (${user.role})`);
      
      // Check if user already exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [user.email]
      );
      
      if (existingUser.rows.length > 0) {
        console.log(`  ⚠️ User ${user.email} already exists, skipping...`);
        continue;
      }
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      // Insert the new user
      const result = await pool.query(`
        INSERT INTO users (id, email, name, hashed_password, role, position, is_active, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
        RETURNING id, email, name, role
      `, [user.id, user.email, user.name, hashedPassword, user.role, user.position]);
      
      console.log(`  ✅ Created: ${result.rows[0].email} - ${result.rows[0].role}`);
      
      // Test password verification
      const testMatch = await bcrypt.compare(user.password, hashedPassword);
      console.log(`  🔒 Password verification: ${testMatch ? '✅' : '❌'}`);
    }
    
    // Verify all accounts are created
    console.log('\n📊 Verification - All test accounts:');
    const allUsers = await pool.query(`
      SELECT id, email, name, role, position, is_active 
      FROM users 
      WHERE email IN ($1, $2, $3, $4, $5)
      ORDER BY 
        CASE role 
          WHEN 'admin' THEN 1
          WHEN 'executive' THEN 2
          WHEN 'hq_management' THEN 3
          WHEN 'project_manager' THEN 4
          WHEN 'field_worker' THEN 5
          ELSE 6
        END
    `, [
      'admin@company.com',
      'executive@company.com', 
      'hq@company.com', 
      'pm@company.com', 
      'worker@company.com'
    ]);
    
    if (allUsers.rows.length === 5) {
      console.log('✅ All 5 role-based test accounts verified:');
      allUsers.rows.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} - ${user.role} (${user.name}) ${user.is_active ? '🟢' : '🔴'}`);
      });
    } else {
      console.log(`⚠️ Expected 5 accounts, found ${allUsers.rows.length}`);
    }
    
    await pool.end();
    console.log('\n🎯 Test account creation completed! RBAC tests can now be executed properly.');
    
  } catch (error) {
    console.error('❌ Error creating test accounts:', error);
  }
}

createTestAccounts();