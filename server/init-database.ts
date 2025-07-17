import dotenv from "dotenv";
dotenv.config();

import { db } from "./db";
import { users, projects, companies, vendors, purchaseOrders, items } from "@shared/schema";
import bcrypt from "bcrypt";

async function initializeDatabase() {
  console.log("🔧 데이터베이스 초기화 시작...");
  
  try {
    // 간단한 테스트 쿼리 실행
    console.log("📡 데이터베이스 연결 테스트...");
    
    // 테스트 사용자 하나만 생성해보기
    console.log("👤 테스트 사용자 생성 중...");
    const hashedPassword = await bcrypt.hash("admin123", 10);
    
    const testUser = {
      id: "test_user_simple",
      email: "simple@test.co.kr",
      password: hashedPassword,
      name: "심플 테스트",
      role: "admin" as const,
      phoneNumber: "010-0000-0000",
      profileImageUrl: null,
      isActive: true
    };

    // upsert 시도
    try {
      await db.insert(users).values(testUser).onConflictDoUpdate({
        target: users.email,
        set: testUser
      });
      console.log("✅ 테스트 사용자 생성 성공");
    } catch (error) {
      console.log("⚠️ 사용자 테이블 생성 시도:", error);
    }

    // 간단한 회사 데이터
    console.log("🏢 회사 정보 생성 중...");
    try {
      const companyData = {
        id: 1,
        companyName: "테스트 회사",
        businessNumber: "123-45-67890",
        representative: "대표자",
        address: "서울시 테스트구 테스트동",
        phone: "02-1234-5678",
        email: "test@company.co.kr",
        website: "https://test.co.kr",
        isActive: true
      };

      await db.insert(companies).values(companyData).onConflictDoUpdate({
        target: companies.id,
        set: companyData
      });
      console.log("✅ 회사 정보 생성 성공");
    } catch (error) {
      console.log("⚠️ 회사 테이블 생성 시도:", error);
    }

    console.log("🎉 데이터베이스 초기화 완료!");
    
  } catch (error) {
    console.error("❌ 데이터베이스 초기화 실패:", error);
    throw error;
  }
}

// 스크립트 실행
initializeDatabase()
  .then(() => {
    console.log("✨ 초기화 스크립트 완료");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 초기화 스크립트 실행 중 오류:", error);
    process.exit(1);
  });