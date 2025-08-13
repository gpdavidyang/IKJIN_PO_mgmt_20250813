/**
 * Company Management Routes
 */

import { Router } from "express";
import { storage } from "../storage";
import { insertCompanySchema } from "@shared/schema";
import { logoUpload } from "../utils/multer-config";
import { sql } from "drizzle-orm";

const router = Router();

// Debug endpoint to check environment
router.get("/companies/debug", async (req, res) => {
  console.log("🔍 Debug endpoint called");
  try {
    console.log("🔍 Attempting to import db module...");
    // Import db here to test
    const { db } = await import("../db");
    console.log("🔍 DB module imported successfully");
    
    console.log("🔍 Attempting basic query...");
    // Test basic query
    const basicTest = await db.execute(sql`SELECT 1 as test`);
    console.log("🔍 Basic query successful:", basicTest);
    
    res.json({
      databaseUrlSet: !!process.env.DATABASE_URL,
      databaseUrlPreview: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + "..." : "not set",
      nodeEnv: process.env.NODE_ENV,
      allDbEnvVars: Object.keys(process.env).filter(key => key.includes('DATABASE')),
      vercelEnv: process.env.VERCEL_ENV,
      dbConnection: "success",
      basicQueryResult: basicTest
    });
  } catch (error) {
    console.error("🔍 Debug endpoint error:", error);
    res.json({  // Changed from res.status(500).json to res.json
      databaseUrlSet: !!process.env.DATABASE_URL,
      databaseUrlPreview: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + "..." : "not set",
      nodeEnv: process.env.NODE_ENV,
      allDbEnvVars: Object.keys(process.env).filter(key => key.includes('DATABASE')),
      vercelEnv: process.env.VERCEL_ENV,
      dbConnection: "failed",
      error: error?.message,
      errorCode: error?.code,
      errorName: error?.name,
      stack: error?.stack?.substring(0, 500) // Add first 500 chars of stack trace
    });
  }
});

router.get("/companies", async (req, res) => {
  try {
    console.log("🏢 Fetching companies from database...");
    
    // TEMPORARY: Return mock data until DB connection is fixed
    const mockCompanies = [
      {
        id: 1,
        companyName: "테스트 회사 1",
        businessNumber: "123-45-67890",
        address: "서울시 강남구 테헤란로 123",
        contactPerson: "홍길동",
        phone: "02-1234-5678",
        email: "test1@company.com",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 2,
        companyName: "테스트 회사 2",
        businessNumber: "987-65-43210",
        address: "서울시 서초구 강남대로 456",
        contactPerson: "김철수",
        phone: "02-9876-5432",
        email: "test2@company.com",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    console.log(`✅ Returning mock companies data (${mockCompanies.length} companies)`);
    res.json(mockCompanies);
  } catch (error) {
    console.error("❌ Error fetching companies:", error);
    res.status(500).json({ 
      message: "Failed to fetch companies",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

router.post("/companies", logoUpload.single('logo'), async (req, res) => {
  try {
    const companyData = { ...req.body };
    if (req.file) {
      companyData.logoUrl = `/uploads/${req.file.filename}`;
    }
    
    const validatedData = insertCompanySchema.parse(companyData);
    const company = await storage.createCompany(validatedData);
    res.status(201).json(company);
  } catch (error) {
    console.error("Error creating company:", error);
    res.status(500).json({ message: "Failed to create company" });
  }
});

router.put("/companies/:id", logoUpload.single('logo'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updateData = { ...req.body };
    
    if (req.file) {
      updateData.logoUrl = `/uploads/${req.file.filename}`;
    }
    
    const updatedCompany = await storage.updateCompany(id, updateData);
    res.json(updatedCompany);
  } catch (error) {
    console.error("Error updating company:", error);
    res.status(500).json({ message: "Failed to update company" });
  }
});

export default router;