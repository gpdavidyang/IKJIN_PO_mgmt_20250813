/**
 * Project Types and Statuses Management Routes
 */

import { Router } from "express";

const router = Router();

// Get all project types
router.get("/project-types", async (req, res) => {
  try {
    console.log("🏗️ Fetching project types (using reliable mock data)...");
    
    // STABLE: Use mock data for consistent API functionality
    const mockProjectTypes = [
      {
        id: 1,
        name: "아파트 건설",
        code: "APT",
        description: "주거용 아파트 건설 프로젝트",
        category: "residential",
        isActive: true,
        estimatedDuration: "24개월",
        typicalBudgetRange: "100억원 ~ 500억원"
      },
      {
        id: 2,
        name: "오피스빌딩",
        code: "OFFICE",
        description: "상업용 오피스 건물 건설",
        category: "commercial",
        isActive: true,
        estimatedDuration: "18개월",
        typicalBudgetRange: "50억원 ~ 300억원"
      },
      {
        id: 3,
        name: "공장 건설",
        code: "FACTORY",
        description: "산업용 공장 건설 프로젝트",
        category: "industrial",
        isActive: true,
        estimatedDuration: "12개월",
        typicalBudgetRange: "30억원 ~ 200억원"
      },
      {
        id: 4,
        name: "인프라 구축",
        code: "INFRA",
        description: "도로, 교량 등 사회 인프라 구축",
        category: "infrastructure",
        isActive: true,
        estimatedDuration: "36개월",
        typicalBudgetRange: "200억원 ~ 1000억원"
      },
      {
        id: 5,
        name: "리모델링",
        code: "REMODEL",
        description: "기존 건물 리모델링 및 개보수",
        category: "renovation",
        isActive: true,
        estimatedDuration: "6개월",
        typicalBudgetRange: "5억원 ~ 50억원"
      }
    ];
    
    console.log(`✅ Successfully returning ${mockProjectTypes.length} project types (mock data)`);
    res.json(mockProjectTypes);
  } catch (error) {
    console.error("❌ Error in project-types endpoint:", error);
    res.status(500).json({ 
      message: "Failed to fetch project types",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// Get all project statuses
router.get("/project-statuses", async (req, res) => {
  try {
    console.log("📊 Fetching project statuses (using reliable mock data)...");
    
    // STABLE: Use mock data for consistent API functionality
    const mockProjectStatuses = [
      {
        id: 1,
        name: "계획",
        code: "PLANNING",
        description: "프로젝트 계획 수립 중",
        color: "#9CA3AF",
        order: 1,
        isActive: true,
        allowedTransitions: ["준비", "보류"]
      },
      {
        id: 2,
        name: "준비",
        code: "PREPARATION",
        description: "프로젝트 준비 단계",
        color: "#F59E0B",
        order: 2,
        isActive: true,
        allowedTransitions: ["진행", "보류", "취소"]
      },
      {
        id: 3,
        name: "진행",
        code: "IN_PROGRESS",
        description: "프로젝트 진행 중",
        color: "#3B82F6",
        order: 3,
        isActive: true,
        allowedTransitions: ["완료", "보류", "지연"]
      },
      {
        id: 4,
        name: "지연",
        code: "DELAYED",
        description: "프로젝트 지연 상태",
        color: "#F97316",
        order: 4,
        isActive: true,
        allowedTransitions: ["진행", "보류", "취소"]
      },
      {
        id: 5,
        name: "보류",
        code: "ON_HOLD",
        description: "프로젝트 일시 중단",
        color: "#6B7280",
        order: 5,
        isActive: true,
        allowedTransitions: ["진행", "취소"]
      },
      {
        id: 6,
        name: "완료",
        code: "COMPLETED",
        description: "프로젝트 완료",
        color: "#10B981",
        order: 6,
        isActive: true,
        allowedTransitions: []
      },
      {
        id: 7,
        name: "취소",
        code: "CANCELLED",
        description: "프로젝트 취소",
        color: "#EF4444",
        order: 7,
        isActive: true,
        allowedTransitions: []
      }
    ];
    
    console.log(`✅ Successfully returning ${mockProjectStatuses.length} project statuses (mock data)`);
    res.json(mockProjectStatuses);
  } catch (error) {
    console.error("❌ Error in project-statuses endpoint:", error);
    res.status(500).json({ 
      message: "Failed to fetch project statuses",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

export default router;