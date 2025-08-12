/**
 * Vendor Management Routes
 */

import { Router } from "express";
import { storage } from "../storage";
import { insertVendorSchema } from "@shared/schema";
import { requireAuth } from "../local-auth";

const router = Router();

// Vendor routes - Mock 데이터 제거하고 실제 데이터베이스만 사용
router.get("/vendors", async (req, res) => {
  try {
    const vendors = await storage.getVendors();
    res.json(vendors);
  } catch (error) {
    console.error("Error fetching vendors:", error);
    res.status(500).json({ message: "Failed to fetch vendors" });
  }
});

router.get("/vendors/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const vendor = await storage.getVendor(id);
    
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    res.json(vendor);
  } catch (error) {
    console.error("Error fetching vendor:", error);
    res.status(500).json({ message: "Failed to fetch vendor" });
  }
});

// Vendor POST route - 네트워크 연결 안정성을 위해 권한 체크 간소화
router.post("/vendors", requireAuth, async (req: any, res) => {
  try {
    console.log("🔍 Vendor creation request body:", req.body);
    console.log("🔍 User:", req.user);
    
    // 실제 데이터베이스 스키마에 맞게 데이터 구성
    const vendorData = {
      name: req.body.name,
      businessNumber: req.body.businessNumber || null,
      contactPerson: req.body.contactPerson,
      email: req.body.email,
      phone: req.body.phone || null,
      address: req.body.address || null,
      businessType: req.body.businessType || null,
    };
    
    console.log("🔍 Prepared vendor data:", vendorData);
    
    // 재시도 로직
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const vendor = await storage.createVendor(vendorData);
        console.log("✅ Vendor created successfully:", vendor);
        return res.status(201).json(vendor);
      } catch (dbError) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw dbError;
        }
        console.log(`🔄 Database operation failed, retrying (${attempts}/${maxAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
  } catch (error) {
    console.error("❌ Error creating vendor:", error);
    console.error("❌ Error details:", error.message);
    console.error("❌ Error stack:", error.stack);
    
    res.status(500).json({ 
      message: "Failed to create vendor",
      error: error.message 
    });
  }
});

router.put("/vendors/:id", requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    console.log("🔍 Vendor update request - ID:", id);
    console.log("🔍 Update data:", req.body);
    
    const updatedVendor = await storage.updateVendor(id, req.body);
    
    if (!updatedVendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    
    console.log("✅ Vendor updated successfully:", updatedVendor);
    res.json(updatedVendor);
  } catch (error) {
    console.error("❌ Error updating vendor:", error);
    res.status(500).json({ message: "Failed to update vendor" });
  }
});

router.delete("/vendors/:id", requireAuth, async (req: any, res) => {
  try {
    // 권한 체크 간소화 - requireAuth로 충분
    const id = parseInt(req.params.id);
    await storage.deleteVendor(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting vendor:", error);
    res.status(500).json({ message: "Failed to delete vendor" });
  }
});

export default router;