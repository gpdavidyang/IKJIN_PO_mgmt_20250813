import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pg;

async function checkSession() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // 최근 세션 확인
    const sessions = await pool.query(`
      SELECT * FROM validation_sessions 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('📊 최근 검증 세션:');
    sessions.rows.forEach(session => {
      console.log(`\n세션 ID: ${session.id}`);
      console.log(`상태: ${session.status}`);
      console.log(`파일: ${session.file_name}`);
      console.log(`총 항목: ${session.total_items}`);
      console.log(`유효: ${session.valid_items}, 경고: ${session.warning_items}, 오류: ${session.error_items}`);
      console.log(`생성: ${session.created_at}`);
      if (session.metadata) {
        console.log(`메타데이터:`, session.metadata);
      }
    });
    
    // 에러가 있는 세션의 결과 확인
    const failedSession = sessions.rows.find(s => s.status === 'failed');
    if (failedSession) {
      console.log(`\n❌ 실패한 세션 ${failedSession.id}의 결과 확인:`);
      
      const results = await pool.query(`
        SELECT * FROM validation_results 
        WHERE session_id = $1 
        LIMIT 10
      `, [failedSession.id]);
      
      if (results.rows.length > 0) {
        console.log(`검증 결과 ${results.rows.length}개 발견:`);
        results.rows.forEach(r => {
          console.log(`  행 ${r.row_index}: ${r.validation_status} - ${r.error_message || r.suggestion || '정상'}`);
        });
      } else {
        console.log('검증 결과가 없습니다.');
      }
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  } finally {
    await pool.end();
  }
}

checkSession();