import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const { Pool } = pg;

async function createTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 데이터베이스 연결 중...');
    
    // Read SQL file
    const sqlContent = fs.readFileSync(path.join(__dirname, 'create-validation-tables.sql'), 'utf8');
    
    // Execute SQL
    console.log('📝 테이블 생성 중...');
    await pool.query(sqlContent);
    
    console.log('✅ 테이블 생성 완료!');
    
    // Verify tables were created
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('validation_sessions', 'validation_results', 'ai_suggestions', 'vendor_mappings', 'category_mappings')
    `);
    
    console.log('\n📊 생성된 테이블:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await pool.end();
    console.log('\n🔌 데이터베이스 연결 종료');
  }
}

createTables();