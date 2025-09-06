import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from './shared/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

const DATABASE_URL = "postgresql://postgres.tbvugytmskxxyqfvqmup:gps110601ysw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
const client = postgres(DATABASE_URL);
const db = drizzle(client);
const JWT_SECRET = 'ikjin-po-mgmt-jwt-secret-2025-secure-key';

async function testJWT() {
  try {
    // 실제 admin 사용자 조회
    console.log('🔍 관리자 사용자 조회 중...');
    const adminUsers = await db
      .select()
      .from(users)
      .where(eq(users.role, 'admin'))
      .limit(1);
    
    if (adminUsers.length === 0) {
      console.log('❌ 관리자 사용자가 없습니다');
      return;
    }
    
    const adminUser = adminUsers[0];
    console.log('✅ 관리자 사용자 발견:', {
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role
    });
    
    // JWT 토큰 생성
    console.log('🔧 JWT 토큰 생성 중...');
    const payload = {
      userId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role
    };
    
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    console.log('✅ JWT 토큰 생성 완료, length:', token.length);
    console.log('📋 Payload:', payload);
    console.log('🔑 Token (first 50 chars):', token.substring(0, 50) + '...');
    
    // JWT 토큰 검증
    console.log('🔍 JWT 토큰 검증 중...');
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ JWT 토큰 검증 성공:', decoded);
    
  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    await client.end();
  }
}

testJWT();