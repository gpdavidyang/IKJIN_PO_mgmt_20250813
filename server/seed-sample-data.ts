import dotenv from "dotenv";
dotenv.config();

import { db } from "./db";
import { users, projects, companies, vendors, purchaseOrders, items } from "@shared/schema";
import bcrypt from "bcrypt";

async function seedSampleData() {
  console.log("🌱 샘플 데이터 생성 시작...");

  try {
    // 1. 회사 정보 생성
    console.log("📊 회사 정보 생성 중...");
    const companyData = {
      id: 1,
      companyName: "(주)익진엔지니어링",
      businessNumber: "123-45-67890",
      representative: "홍길동",
      address: "서울특별시 강남구 테헤란로 123",
      phone: "02-1234-5678",
      email: "info@ikjin.co.kr",
      website: "https://ikjin.co.kr",
      isActive: true
    };

    await db.insert(companies).values(companyData).onConflictDoUpdate({
      target: companies.id,
      set: companyData
    });

    // 2. 직급 정보는 User 테이블의 role enum으로 관리됨 - 별도 테이블 불필요

    // 3. 사용자 데이터 생성
    console.log("👤 사용자 데이터 생성 중...");
    const hashedPassword = await bcrypt.hash("admin123", 10);
    
    const sampleUsers = [
      {
        id: "test_admin_001",
        email: "test@ikjin.co.kr",
        password: hashedPassword,
        name: "테스트 관리자",
        role: "admin" as const,
        phoneNumber: "010-1234-5678",
        profileImageUrl: null,
        isActive: true
      },
      {
        id: "user_001",
        email: "kim.manager@ikjin.co.kr",
        password: hashedPassword,
        name: "김발주",
        role: "project_manager" as const,
        phoneNumber: "010-1111-1111",
        profileImageUrl: null,
        isActive: true
      },
      {
        id: "user_002",
        email: "park.pm@ikjin.co.kr",
        password: hashedPassword,
        name: "박프로젝트",
        role: "project_manager" as const,
        phoneNumber: "010-2222-2222",
        profileImageUrl: null,
        isActive: true
      },
      {
        id: "user_003",
        email: "lee.engineer@ikjin.co.kr",
        password: hashedPassword,
        name: "이엔지니어",
        role: "field_worker" as const,
        phoneNumber: "010-3333-3333",
        profileImageUrl: null,
        isActive: true
      }
    ];

    for (const user of sampleUsers) {
      await db.insert(users).values(user).onConflictDoUpdate({
        target: users.email,
        set: user
      });
    }

    // 4. 거래처 정보 생성
    console.log("🏪 거래처 정보 생성 중...");
    const sampleVendors = [
      {
        name: "(주)건설자재유통",
        businessNumber: "211-86-12345",
        representative: "최건설",
        address: "경기도 성남시 분당구 판교로 123",
        phone: "031-1234-5678",
        email: "sales@construction.co.kr",
        mainContact: "김영업",
        contactPerson: "김영업",
        industry: "건설자재 유통",
        isActive: true
      },
      {
        name: "동양철강(주)",
        businessNumber: "123-81-67890",
        representative: "박철강",
        address: "부산광역시 해운대구 센텀로 456",
        phone: "051-2345-6789",
        email: "info@dongyang-steel.co.kr",
        mainContact: "정철강",
        contactPerson: "정철강",
        industry: "철강 제조",
        isActive: true
      },
      {
        name: "한국전기설비(주)",
        businessNumber: "456-87-23456",
        representative: "임전기",
        address: "서울특별시 금천구 디지털로 789",
        phone: "02-3456-7890",
        email: "contact@korea-electric.co.kr",
        mainContact: "송전기",
        contactPerson: "송전기",
        industry: "전기설비 시공",
        isActive: true
      },
      {
        name: "신한콘크리트(주)",
        businessNumber: "789-88-34567",
        representative: "조콘크리트",
        address: "인천광역시 남동구 논현로 321",
        phone: "032-4567-8901",
        email: "orders@shinhan-concrete.co.kr",
        mainContact: "한콘크리트",
        contactPerson: "한콘크리트",
        industry: "콘크리트 제조",
        isActive: true
      }
    ];

    for (const vendor of sampleVendors) {
      await db.insert(vendors).values(vendor).onConflictDoNothing();
    }

    // 5. 품목 정보 생성
    console.log("📦 품목 정보 생성 중...");
    const sampleItems = [
      {
        name: "H형강 200x100x5.5x8",
        category: "원자재",
        specification: "200x100x5.5x8, SS400",
        unit: "EA",
        standardPrice: "85000",
        description: "구조용 H형강",
        isActive: true
      },
      {
        name: "레미콘 25-21-150",
        category: "원자재",
        specification: "25MPa, 슬럼프 21±2.5cm, 굵은골재 최대치수 25mm",
        unit: "㎥",
        standardPrice: "120000",
        description: "일반구조용 레미콘",
        isActive: true
      },
      {
        name: "전선관 PVC 25mm",
        category: "부자재",
        specification: "PVC, 직경 25mm, KS C 8305",
        unit: "M",
        standardPrice: "2500",
        description: "전선 보호용 PVC관",
        isActive: true
      },
      {
        name: "단열재 압출법보온판 50T",
        category: "부자재",
        specification: "XPS, 두께 50mm, 밀도 35kg/㎥ 이상",
        unit: "㎡",
        standardPrice: "8500",
        description: "압출법 폴리스티렌 단열재",
        isActive: true
      },
      {
        name: "시멘트 보통포틀랜드시멘트",
        category: "원자재",
        specification: "1종, 42.5MPa, KS L 5201",
        unit: "포",
        standardPrice: "7200",
        description: "일반 구조용 시멘트",
        isActive: true
      }
    ];

    for (const item of sampleItems) {
      await db.insert(items).values(item).onConflictDoNothing();
    }

    // 6. 프로젝트 정보 생성
    console.log("🏗️ 프로젝트 정보 생성 중...");
    const sampleProjects = [
      {
        projectName: "강남 오피스빌딩 신축공사",
        projectCode: "PRJ-2024-001",
        clientName: "강남건설(주)",
        projectType: "commercial",
        location: "서울특별시 강남구 테헤란로 456",
        status: "active",
        totalBudget: "25000000000",
        projectManagerId: "user_002",
        orderManagerId: "user_001",
        description: "지상 20층 규모의 업무시설 신축",
        startDate: new Date("2024-01-15"),
        endDate: new Date("2025-12-31"),
        isActive: true,
      },
      {
        projectName: "분당 아파트 리모델링",
        projectCode: "PRJ-2024-002",
        clientName: "분당주택관리공단",
        projectType: "residential",
        location: "경기도 성남시 분당구 정자동",
        status: "active",
        totalBudget: "12000000000",
        projectManagerId: "user_002",
        orderManagerId: "user_001",
        description: "15년차 아파트 단지 전면 리모델링",
        startDate: new Date("2024-03-01"),
        endDate: new Date("2024-11-30"),
        isActive: true,
      },
      {
        projectName: "인천공항 제3터미널 확장",
        projectCode: "PRJ-2024-003",
        clientName: "인천국제공항공사",
        projectType: "infrastructure",
        location: "인천광역시 중구 공항로 424",
        status: "planning",
        totalBudget: "89000000000",
        projectManagerId: "user_003",
        orderManagerId: "user_001",
        description: "국제선 터미널 확장 및 시설 현대화",
        startDate: new Date("2024-06-01"),
        endDate: new Date("2026-05-31"),
        isActive: true,
      }
    ];

    for (const project of sampleProjects) {
      await db.insert(projects).values(project).onConflictDoNothing();
    }

    // 7. 발주서 샘플 데이터 생성
    console.log("📋 발주서 정보 생성 중...");
    const sampleOrders = [
      {
        orderNumber: "PO-2024-001",
        projectId: 1,
        vendorId: 1,
        userId: "user_001",
        orderDate: new Date("2024-01-20"),
        deliveryDate: new Date("2024-02-15"),
        status: "approved" as const,
        totalAmount: 2550000,
        notes: "1차 철강 자재 발주"
      },
      {
        orderNumber: "PO-2024-002",
        projectId: 1,
        vendorId: 4,
        userId: "user_001",
        orderDate: new Date("2024-01-25"),
        deliveryDate: new Date("2024-02-10"),
        status: "pending" as const,
        totalAmount: 3600000,
        notes: "기초 콘크리트 발주"
      },
      {
        orderNumber: "PO-2024-003",
        projectId: 2,
        vendorId: 3,
        userId: "user_001",
        orderDate: new Date("2024-02-01"),
        deliveryDate: new Date("2024-02-20"),
        status: "sent" as const,
        totalAmount: 500000,
        notes: "전기설비 기초 자재"
      }
    ];

    for (const order of sampleOrders) {
      await db.insert(purchaseOrders).values(order).onConflictDoNothing();
    }

    console.log("✅ 샘플 데이터 생성 완료!");
    console.log("📊 생성된 데이터:");
    console.log("- 회사 정보: 1개");
    console.log("- 사용자: 4명");
    console.log("- 거래처: 4개");
    console.log("- 품목: 5개");
    console.log("- 프로젝트: 3개");
    console.log("- 발주서: 3개");
    
  } catch (error) {
    console.error("❌ 샘플 데이터 생성 실패:", error);
    throw error;
  }
}

// 스크립트 실행
seedSampleData()
  .then(() => {
    console.log("🎉 스크립트 완료");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 스크립트 실행 중 오류:", error);
    process.exit(1);
  });