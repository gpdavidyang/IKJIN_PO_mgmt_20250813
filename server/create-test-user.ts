import dotenv from "dotenv";
dotenv.config();

import { db } from "./db";
import { users, companies } from "@shared/schema";
import bcrypt from "bcrypt";

async function createTestUser() {
  console.log("테스트 사용자 생성 시작...");

  try {
    // 비밀번호 해시 생성
    const hashedPassword = await bcrypt.hash("admin123", 10);
    
    // 테스트 사용자 생성
    const testUser = {
      id: "test_admin_001",
      email: "test@ikjin.co.kr",
      password: hashedPassword,
      name: "테스트 관리자",
      role: "admin",
      phoneNumber: "010-1234-5678",
      profileImageUrl: null,
      isActive: true
    };

    console.log("사용자 데이터 삽입 중...");
    await db.insert(users).values(testUser).onConflictDoUpdate({
      target: users.email,
      set: {
        password: hashedPassword,
        name: "테스트 관리자",
        role: "admin",
        isActive: true
      }
    });

    // 회사 정보도 생성 (필요한 경우)
    const companyData = {
      id: 1,
      companyName: "(주)익진엔지니어링",
      businessNumber: "123-45-67890",
      representative: "홍길동",
      address: "서울특별시 강남구 테헤란로 123",
      phone: "02-1234-5678",
      email: "info@ikjin.co.kr",
      isActive: true
    };

    await db.insert(companies).values(companyData).onConflictDoNothing();

    console.log("✅ 테스트 사용자 생성 완료!");
    console.log("로그인 정보:");
    console.log("이메일: test@ikjin.co.kr");
    console.log("비밀번호: admin123");
    
  } catch (error) {
    console.error("❌ 테스트 사용자 생성 실패:", error);
    throw error;
  }
}

// 스크립트 실행
createTestUser()
  .then(() => {
    console.log("스크립트 완료");
    process.exit(0);
  })
  .catch((error) => {
    console.error("스크립트 실행 중 오류:", error);
    process.exit(1);
  });