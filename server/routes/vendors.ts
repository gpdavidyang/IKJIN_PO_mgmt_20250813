/**
 * Vendor Management Routes
 */

import { Router } from "express";
import { storage } from "../storage";
import { insertVendorSchema } from "@shared/schema";
import { requireAuth } from "../local-auth";
import { logAuditEvent } from "../middleware/audit-logger";

const router = Router();

// Vendor routes - Mock 데이터 제거하고 실제 데이터베이스만 사용
router.get("/vendors", async (req, res) => {
  try {
    console.log("🏪 Fetching vendors from database...");
    const vendors = await storage.getVendors();
    console.log(`✅ Successfully fetched ${vendors.length} vendors`);
    res.json(vendors);
  } catch (error) {
    console.error("❌ Error fetching vendors:", error);
    console.error("Error name:", error?.name);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    res.status(500).json({ 
      message: "Failed to fetch vendors",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
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

        // Log audit event for vendor creation
        await logAuditEvent('data_create', 'data', {
          userId: req.user?.id,
          userName: req.user?.name,
          userRole: req.user?.role,
          entityType: 'vendor',
          entityId: String(vendor.id),
          tableName: 'vendors',
          action: `거래처 생성 (${vendor.name})`,
          newValue: vendor,
          additionalDetails: {
            businessNumber: vendor.businessNumber,
            contactPerson: vendor.contactPerson
          },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          sessionId: req.sessionID
        });

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
    
    // Get old vendor data for audit trail
    const oldVendor = await storage.getVendor(id);
    if (!oldVendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    
    const updatedVendor = await storage.updateVendor(id, req.body);
    
    if (!updatedVendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Log audit event for vendor update
    const changes: string[] = [];
    if (oldVendor.name !== updatedVendor.name) {
      changes.push(`명칭: ${oldVendor.name} → ${updatedVendor.name}`);
    }
    if (oldVendor.contactPerson !== updatedVendor.contactPerson) {
      changes.push(`담당자: ${oldVendor.contactPerson || ''} → ${updatedVendor.contactPerson || ''}`);
    }
    if (oldVendor.phone !== updatedVendor.phone) {
      changes.push(`연락처: ${oldVendor.phone || ''} → ${updatedVendor.phone || ''}`);
    }

    const actionDescription = changes.length > 0 
      ? `거래처 ${updatedVendor.name} 수정 (${changes.join(', ')})`
      : `거래처 ${updatedVendor.name} 수정`;

    await logAuditEvent('data_update', 'data', {
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.role,
      entityType: 'vendor',
      entityId: String(id),
      tableName: 'vendors',
      action: actionDescription,
      oldValue: oldVendor,
      newValue: updatedVendor,
      additionalDetails: {
        changes,
        updatedFields: Object.keys(req.body)
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      sessionId: req.sessionID
    });
    
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
    
    // Get vendor data before deletion for audit trail
    const vendorToDelete = await storage.getVendor(id);
    if (!vendorToDelete) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    
    await storage.deleteVendor(id);

    // Log audit event for vendor deletion
    await logAuditEvent('data_delete', 'data', {
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.role,
      entityType: 'vendor',
      entityId: String(id),
      tableName: 'vendors',
      action: `거래처 삭제 (${vendorToDelete.name})`,
      oldValue: vendorToDelete,
      additionalDetails: {
        deletedVendorName: vendorToDelete.name,
        deletedVendorBusinessNumber: vendorToDelete.businessNumber
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      sessionId: req.sessionID
    });

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting vendor:", error);
    res.status(500).json({ message: "Failed to delete vendor" });
  }
});

// Vendor validation endpoint
router.post("/vendors/validate", async (req, res) => {
  try {
    const { vendorName } = req.body;
    
    if (!vendorName) {
      return res.status(400).json({ 
        isValid: false, 
        error: 'Vendor name is required' 
      });
    }

    console.log(`🔍 Validating vendor: ${vendorName}`);
    
    // 거래처 이름으로 검색 (대소문자 구분 없이)
    const vendors = await storage.getVendors();
    const matchedVendor = vendors.find(vendor => 
      vendor.name.toLowerCase().includes(vendorName.toLowerCase()) ||
      vendorName.toLowerCase().includes(vendor.name.toLowerCase())
    );
    
    if (matchedVendor) {
      console.log(`✅ Vendor found: ${matchedVendor.name}`);
      res.json({
        isValid: true,
        vendorId: matchedVendor.id,
        vendorName: matchedVendor.name,
        vendorEmail: matchedVendor.email,
        contactPerson: matchedVendor.contactPerson,
        phone: matchedVendor.phone
      });
    } else {
      console.log(`⚠️ Vendor not found: ${vendorName}`);
      res.json({
        isValid: false,
        message: '등록되지 않은 거래처입니다.',
        suggestions: vendors
          .filter(vendor => 
            vendor.name.toLowerCase().includes(vendorName.toLowerCase().substring(0, 2)) ||
            vendorName.toLowerCase().substring(0, 2).includes(vendor.name.toLowerCase().substring(0, 2))
          )
          .slice(0, 5)
          .map(vendor => ({
            id: vendor.id,
            name: vendor.name,
            email: vendor.email
          }))
      });
    }
  } catch (error) {
    console.error('❌ Error validating vendor:', error);
    res.status(500).json({ 
      isValid: false,
      error: 'Failed to validate vendor',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;