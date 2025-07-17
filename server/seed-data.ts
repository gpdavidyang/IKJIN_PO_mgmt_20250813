import { db } from "./db";
import { users, projects, companies, vendors, purchaseOrders, items } from "@shared/schema";

async function seedData() {
  console.log("샘플 데이터 생성 시작...");

  try {
    // 사용자 샘플 데이터 생성
    const sampleUsers = [
      {
        id: "user_001",
        email: "order.manager@company.com", 
        name: "발주 관리자",
        role: "order_manager",
        phoneNumber: "010-1111-1111",
        profileImageUrl: null,
      },
      {
        id: "user_003",
        email: "project.supervisor@company.com", 
        name: "프로젝트 담당자",
        role: "user",
        phoneNumber: "010-3333-3333",
        profileImageUrl: null,
      },
      {
        id: "user_004",
        email: "project.coordinator@company.com",
        name: "프로젝트 조정자",
        role: "user",
        phoneNumber: "010-4444-4444",
        profileImageUrl: null,
      },
      {
        id: "user_005",
        email: "technical.specialist@company.com",
        name: "기술 전문가",
        role: "user",
        phoneNumber: "010-5555-5555",
        profileImageUrl: null,
      }
    ];

    console.log("사용자 데이터 삽입 중...");
    for (const user of sampleUsers) {
      await db.insert(users).values(user).onConflictDoNothing();
    }

    // 프로젝트 샘플 데이터 생성 - 동적 예산 계산
    const generateProjectBudget = (projectType: string, scale: number = 1) => {
      const baseBudgets: { [key: string]: number } = {
        commercial: 15000000000,    // 150억 기준
        residential: 20000000000,   // 200억 기준  
        infrastructure: 50000000000, // 500억 기준
        remodeling: 5000000000,     // 50억 기준
        industrial: 12000000000     // 120억 기준
      };
      return Math.floor((baseBudgets[projectType] || 10000000000) * scale).toString();
    };

    const sampleProjects = [
      {
        projectName: "중심가 상업시설 신축",
        projectCode: "PRJ-2024-001",
        clientName: "건설회사 A",
        projectType: "commercial",
        location: "서울특별시 강남구",
        status: "active",
        totalBudget: generateProjectBudget("commercial", 1.5),
        projectManagerId: "user_001",
        orderManagerId: "user_001",
        description: "도심 상업시설 건설 프로젝트",
        startDate: new Date("2024-01-15"),
        endDate: new Date("2025-12-31"),
        isActive: true,
      },
      {
        projectName: "신도시 주거단지 개발",
        projectCode: "PRJ-2024-002",
        clientName: "건설회사 B",
        projectType: "residential",
        location: "세종특별자치시",
        status: "active",
        totalBudget: generateProjectBudget("residential", 1.8),
        projectManagerId: "user_003",
        orderManagerId: "user_001",
        description: "대규모 주거단지 개발 사업",
        startDate: new Date("2024-03-01"),
        endDate: new Date("2026-02-28"),
        isActive: true,
      },
      {
        projectName: "공항 인프라 확장",
        projectCode: "PRJ-2024-003",
        clientName: "공공기관 A",
        projectType: "infrastructure", 
        location: "인천광역시 중구",
        status: "active",
        totalBudget: generateProjectBudget("infrastructure", 2.5),
        projectManagerId: "user_003",
        orderManagerId: "user_001",
        description: "공항 시설 확장 및 개선 공사",
        startDate: new Date("2024-02-01"),
        endDate: new Date("2027-12-31"),
        isActive: true,
      },
      {
        projectName: "기존 시설 리모델링",
        projectCode: "PRJ-2024-004",
        clientName: "건설회사 C",
        projectType: "remodeling",
        location: "서울특별시 마포구",
        status: "completed",
        totalBudget: generateProjectBudget("remodeling", 1.2),
        projectManagerId: "user_004",
        orderManagerId: "user_003",
        description: "기존 건물 전면 리모델링 공사",
        startDate: new Date("2023-09-01"),
        endDate: new Date("2024-08-31"),
        isActive: false,
      },
      {
        projectName: "산업단지 제조시설",
        projectCode: "PRJ-2024-005",
        clientName: "제조회사 A",
        projectType: "industrial",
        location: "경기도 고양시 일산동구",
        status: "active",
        totalBudget: generateProjectBudget("industrial", 1.3),
        projectManagerId: "user_005",
        orderManagerId: "user_003",
        description: "첨단 제조시설 건설 프로젝트",
        startDate: new Date("2024-06-01"),
        endDate: new Date("2025-11-30"),
        isActive: true,
      }
    ];

    console.log("프로젝트 데이터 삽입 중...");
    const insertedProjects = [];
    for (const project of sampleProjects) {
      const [insertedProject] = await db.insert(projects).values(project).returning();
      insertedProjects.push(insertedProject);
    }

    // 회사 정보 샘플 데이터 생성 - 일반화된 정보
    const generateBusinessNumber = (index: number) => {
      const base = 100 + index;
      return `${base}-${(index * 11) % 100}-${(index * 67) % 100000}`.padStart(12, '0');
    };

    const sampleCompanies = [
      {
        companyName: "(주)프로젝트 엔지니어링",
        businessNumber: generateBusinessNumber(1),
        representative: "대표이사",
        phone: "02-555-1000",
        fax: "02-555-1001",
        email: "info@project-eng.co.kr",
        website: "https://project-eng.co.kr",
        address: "서울특별시 강남구 테헤란로 123",
        isActive: true,
      },
      {
        companyName: "(주)건설 솔루션",
        businessNumber: generateBusinessNumber(2),
        representative: "대표이사",
        phone: "02-987-2000",
        fax: "02-987-2001",
        email: "contact@construction-sol.co.kr",
        website: "https://construction-sol.co.kr",
        address: "서울특별시 종로구 세종대로 200",
        isActive: false,
      },
      {
        companyName: "(주)스마트 건축",
        businessNumber: generateBusinessNumber(3),
        representative: "대표이사",
        phone: "031-123-3000",
        fax: "031-123-3001",
        email: "admin@smart-arch.co.kr",
        website: "https://smart-arch.co.kr",
        address: "경기도 성남시 분당구 판교로 300",
        isActive: false,
      }
    ];

    console.log("회사 데이터 삽입 중...");
    for (const company of sampleCompanies) {
      await db.insert(companies).values(company).onConflictDoNothing();
    }

    // 샘플 발주서 데이터 생성
    const samplePurchaseOrders = [
      {
        orderNumber: "PO-2024-001",
        projectId: insertedProjects[0].id,
        vendorId: 15, // CJ제일제당
        userId: "user_001",
        status: "draft",
        totalAmount: "15000000",
        orderDate: new Date("2024-06-01"),
        requestedDeliveryDate: new Date("2024-06-15"),
        notes: "긴급 발주 - 공기 단축을 위한 조기 납품 요청",
        items: [
          {
            itemName: "H형강 200x200x8x12",
            quantity: 50,
            unitPrice: 120000,
            totalAmount: 6000000,
            specification: "KS D 3503, SS400",
            notes: "1차 납품분"
          },
          {
            itemName: "철근 D25",
            quantity: 100,
            unitPrice: 90000,
            totalAmount: 9000000,
            specification: "KS D 3504, SD400",
            notes: "기초공사용"
          }
        ]
      },
      {
        orderNumber: "PO-2024-002",
        projectId: insertedProjects[1].id,
        vendorId: 16, // 대림산업
        userId: "user_002",
        status: "pending_approval",
        totalAmount: "28000000",
        orderDate: new Date("2024-06-02"),
        requestedDeliveryDate: new Date("2024-06-20"),
        notes: "세종시 프로젝트 자재 발주",
        items: [
          {
            itemName: "레미콘 25-24-150",
            quantity: 200,
            unitPrice: 140000,
            totalAmount: 28000000,
            specification: "KS F 4009",
            notes: "펌프카 포함"
          }
        ]
      },
      {
        orderNumber: "PO-2024-003",
        projectId: insertedProjects[2].id,
        vendorId: 17, // 포스코
        userId: "user_003",
        status: "approved",
        totalAmount: "45000000",
        orderDate: new Date("2024-06-03"),
        requestedDeliveryDate: new Date("2024-07-01"),
        notes: "인천공항 프로젝트 구조재 발주",
        items: [
          {
            itemName: "철골보 H-600x200x11x17",
            quantity: 30,
            unitPrice: 850000,
            totalAmount: 25500000,
            specification: "KS D 3503, SM490A",
            notes: "터미널 구조재"
          },
          {
            itemName: "철골기둥 H-800x300x14x22",
            quantity: 20,
            unitPrice: 975000,
            totalAmount: 19500000,
            specification: "KS D 3503, SM490A",
            notes: "주요 구조기둥"
          }
        ]
      },
      {
        orderNumber: "PO-2024-004",
        projectId: insertedProjects[3].id,
        vendorId: 18, // 현대제철
        userId: "user_004",
        status: "delivered",
        totalAmount: "12000000",
        orderDate: new Date("2024-05-15"),
        requestedDeliveryDate: new Date("2024-05-30"),
        actualDeliveryDate: new Date("2024-05-29"),
        notes: "리모델링 프로젝트 마감재",
        items: [
          {
            itemName: "알루미늄 샷시",
            quantity: 80,
            unitPrice: 150000,
            totalAmount: 12000000,
            specification: "KS L 2514",
            notes: "창호 교체용"
          }
        ]
      },
      {
        orderNumber: "PO-2024-005",
        projectId: insertedProjects[4].id,
        vendorId: 19, // 두산중공업
        userId: "user_005",
        status: "completed",
        totalAmount: "35000000",
        orderDate: new Date("2024-06-05"),
        requestedDeliveryDate: new Date("2024-06-25"),
        actualDeliveryDate: new Date("2024-06-24"),
        notes: "스마트팩토리 설비 발주",
        items: [
          {
            itemName: "공장용 크레인 5톤",
            quantity: 2,
            unitPrice: 12000000,
            totalAmount: 24000000,
            specification: "KS B 6217",
            notes: "천장 설치형"
          },
          {
            itemName: "컨베이어 벨트 20m",
            quantity: 5,
            unitPrice: 2200000,
            totalAmount: 11000000,
            specification: "내열 고무벨트",
            notes: "생산라인용"
          }
        ]
      }
    ];

    console.log("발주서 데이터 삽입 중...");
    for (const order of samplePurchaseOrders) {
      await db.insert(purchaseOrders).values(order).onConflictDoNothing();
    }

    console.log("샘플 데이터 생성 완료!");

  } catch (error) {
    console.error("샘플 데이터 생성 중 오류:", error);
  }
}

// 샘플 데이터는 필요 시 API 엔드포인트를 통해 수동으로 생성
// seedData();

export { seedData };