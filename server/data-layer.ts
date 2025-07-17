/**
 * Data Layer Abstraction
 * 데이터베이스 연결 상태에 따라 실제 DB 또는 Mock 데이터 사용
 */

import { db } from "./db";
import { users, companies, vendors, projects, items, purchaseOrders } from "@shared/schema";

// Mock 데이터 (현재 구현된 것과 동일)
const mockData = {
  users: [
    {
      id: "test_admin_001",
      email: "test@ikjin.co.kr",
      name: "테스트 관리자",
      role: "admin" as const,
      phoneNumber: "010-1234-5678",
      profileImageUrl: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    // ... 나머지 사용자들
  ],
  
  companies: [
    {
      id: 1,
      companyName: "(주)익진엔지니어링",
      businessNumber: "123-45-67890",
      representative: "홍길동",
      address: "서울특별시 강남구 테헤란로 123",
      phone: "02-1234-5678",
      fax: "02-1234-5679",
      email: "info@ikjin.co.kr",
      website: "https://ikjin.co.kr",
      logoUrl: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  
  // ... 기타 mock 데이터
};

/**
 * 데이터베이스 상태 확인
 */
export async function isDatabaseConnected(): Promise<boolean> {
  if (!db) return false;
  
  try {
    await db.execute("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

/**
 * 사용자 데이터 조회 (DB 우선, 실패 시 Mock)
 */
export async function getUsers() {
  const dbConnected = await isDatabaseConnected();
  
  if (dbConnected) {
    try {
      console.log("🔄 사용자 데이터를 데이터베이스에서 조회 중...");
      return await db.select().from(users).orderBy(users.createdAt);
    } catch (error) {
      console.warn("⚠️ DB 조회 실패, Mock 데이터 사용:", error.message);
    }
  }
  
  console.log("📄 Mock 사용자 데이터 반환");
  return mockData.users;
}

/**
 * 사용자 생성 (DB 우선, 실패 시 Mock에 추가)
 */
export async function createUser(userData: any) {
  const dbConnected = await isDatabaseConnected();
  
  if (dbConnected) {
    try {
      console.log("🔄 사용자를 데이터베이스에 생성 중...");
      const [newUser] = await db.insert(users).values(userData).returning();
      return newUser;
    } catch (error) {
      console.warn("⚠️ DB 생성 실패, Mock 데이터에 추가:", error.message);
    }
  }
  
  console.log("📄 Mock 데이터에 사용자 추가");
  const newUser = { ...userData, id: `mock_${Date.now()}`, createdAt: new Date(), updatedAt: new Date() };
  mockData.users.push(newUser);
  return newUser;
}

/**
 * 회사 데이터 조회
 */
export async function getCompanies() {
  const dbConnected = await isDatabaseConnected();
  
  if (dbConnected) {
    try {
      console.log("🔄 회사 데이터를 데이터베이스에서 조회 중...");
      return await db.select().from(companies);
    } catch (error) {
      console.warn("⚠️ DB 조회 실패, Mock 데이터 사용:", error.message);
    }
  }
  
  console.log("📄 Mock 회사 데이터 반환");
  return mockData.companies;
}

// 기타 데이터 조회 함수들도 동일한 패턴으로 구현...

export const dataLayer = {
  getUsers,
  createUser,
  getCompanies,
  isDatabaseConnected,
};