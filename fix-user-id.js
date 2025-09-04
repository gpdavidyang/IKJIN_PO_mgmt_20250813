import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pg;

async function fixUserId() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 user_id 타입 수정 중...');
    
    // Alter column type
    await pool.query(`
      ALTER TABLE validation_sessions 
      ALTER COLUMN user_id TYPE VARCHAR(50) USING user_id::VARCHAR
    `);
    
    console.log('✅ user_id 타입 수정 완료!');
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  } finally {
    await pool.end();
    console.log('🔌 데이터베이스 연결 종료');
  }
}

fixUserId();