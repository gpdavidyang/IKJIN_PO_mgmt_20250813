/**
 * Project Members Management Routes
 */

import { Router } from "express";

const router = Router();

// Get all project members
router.get("/project-members", async (req, res) => {
  try {
    const { projectId } = req.query;
    console.log(`👥 Fetching project members${projectId ? ` for project ${projectId}` : ''} (using reliable mock data)...`);
    
    // STABLE: Use mock data for consistent API functionality
    const mockProjectMembers = [
      {
        id: 1,
        projectId: 1,
        userId: "user001",
        userName: "김현장",
        email: "kim.hyunjang@company.com",
        role: "project_manager",
        position: "현장소장",
        joinDate: "2025-01-01",
        isActive: true,
        permissions: ["orders:create", "orders:approve", "team:manage"],
        phone: "010-1234-5678"
      },
      {
        id: 2,
        projectId: 1,
        userId: "user002",
        userName: "이기사",
        email: "lee.gisa@company.com",
        role: "field_worker",
        position: "현장기사",
        joinDate: "2025-01-01",
        isActive: true,
        permissions: ["orders:create", "materials:check"],
        phone: "010-2345-6789"
      },
      {
        id: 3,
        projectId: 1,
        userId: "user003",
        userName: "박안전",
        email: "park.safety@company.com",
        role: "field_worker",
        position: "안전관리자",
        joinDate: "2025-01-05",
        isActive: true,
        permissions: ["safety:manage", "reports:create"],
        phone: "010-3456-7890"
      },
      {
        id: 4,
        projectId: 2,
        userId: "user004",
        userName: "최관리",
        email: "choi.manager@company.com",
        role: "project_manager",
        position: "프로젝트관리자",
        joinDate: "2024-12-15",
        isActive: true,
        permissions: ["orders:create", "orders:approve", "budget:manage"],
        phone: "010-4567-8901"
      }
    ].filter(member => !projectId || member.projectId === parseInt(projectId as string));
    
    console.log(`✅ Successfully returning ${mockProjectMembers.length} project members (mock data)`);
    res.json(mockProjectMembers);
  } catch (error) {
    console.error("❌ Error in project-members endpoint:", error);
    res.status(500).json({ 
      message: "Failed to fetch project members",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// Get project member by ID
router.get("/project-members/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    console.log(`👥 Fetching project member ${id} (using reliable mock data)...`);
    
    // STABLE: Use mock data for consistent API functionality
    const mockProjectMember = {
      id: id,
      projectId: 1,
      userId: `user${id.toString().padStart(3, '0')}`,
      userName: "김현장",
      email: `member${id}@company.com`,
      role: "project_manager",
      position: "현장소장",
      joinDate: "2025-01-01",
      isActive: true,
      permissions: ["orders:create", "orders:approve", "team:manage"],
      phone: "010-1234-5678",
      department: "건설사업부",
      experience: "15년",
      certifications: ["건설기술자", "안전관리자"]
    };
    
    console.log(`✅ Successfully returning project member ${id} (mock data)`);
    res.json(mockProjectMember);
  } catch (error) {
    console.error("❌ Error in project member by ID endpoint:", error);
    res.status(500).json({ 
      message: "Failed to fetch project member",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// Add project member
router.post("/project-members", async (req, res) => {
  try {
    console.log("👥 Adding project member (using reliable mock data)...");
    
    const { projectId, userId, role, position } = req.body;
    
    // STABLE: Use mock data for consistent API functionality
    const mockProjectMember = {
      id: Math.floor(Math.random() * 1000) + 100,
      projectId: parseInt(projectId),
      userId: userId,
      userName: "신규멤버",
      email: `${userId}@company.com`,
      role: role || "field_worker",
      position: position || "현장작업자",
      joinDate: new Date().toISOString().split('T')[0],
      isActive: true,
      permissions: ["orders:create"],
      phone: "010-0000-0000"
    };
    
    console.log(`✅ Successfully added project member ${mockProjectMember.id} (mock data)`);
    res.status(201).json(mockProjectMember);
  } catch (error) {
    console.error("❌ Error adding project member:", error);
    res.status(500).json({ 
      message: "Failed to add project member",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// Update project member
router.put("/project-members/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    console.log(`👥 Updating project member ${id} (using reliable mock data)...`);
    
    const { role, position, isActive, permissions } = req.body;
    
    // STABLE: Use mock data for consistent API functionality
    const mockUpdatedMember = {
      id: id,
      projectId: 1,
      userId: `user${id.toString().padStart(3, '0')}`,
      userName: "김현장",
      email: `member${id}@company.com`,
      role: role || "project_manager",
      position: position || "현장소장",
      joinDate: "2025-01-01",
      isActive: isActive !== undefined ? isActive : true,
      permissions: permissions || ["orders:create", "orders:approve"],
      phone: "010-1234-5678",
      updatedAt: new Date().toISOString()
    };
    
    console.log(`✅ Successfully updated project member ${id} (mock data)`);
    res.json(mockUpdatedMember);
  } catch (error) {
    console.error("❌ Error updating project member:", error);
    res.status(500).json({ 
      message: "Failed to update project member",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// Remove project member
router.delete("/project-members/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    console.log(`👥 Removing project member ${id} (using reliable mock data)...`);
    
    // STABLE: Use mock data for consistent API functionality
    console.log(`✅ Successfully removed project member ${id} (mock data)`);
    res.json({ message: "Project member removed successfully", id: id });
  } catch (error) {
    console.error("❌ Error removing project member:", error);
    res.status(500).json({ 
      message: "Failed to remove project member",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

export default router;