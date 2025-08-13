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
    console.log("🔍 DATABASE_URL status:", process.env.DATABASE_URL ? "set" : "missing");
    if (process.env.DATABASE_URL) {
      console.log("🔍 DATABASE_URL preview:", process.env.DATABASE_URL.substring(0, 20) + "...[TRUNCATED]");
    }
    console.log("🔍 All env vars:", Object.keys(process.env).filter(key => key.includes('DATABASE')));
    console.log("🔍 DB object status:", typeof storage);
    
    const companies = await storage.getCompanies();
    console.log(`✅ Successfully fetched ${companies.length} companies`);
    res.json(companies);
  } catch (error) {
    console.error("❌ Error fetching companies:", error);
    console.error("Error name:", error?.name);
    console.error("Error message:", error?.message);
    console.error("Error code:", error?.code);
    console.error("Error stack:", error?.stack);
    res.status(500).json({ 
      message: "Failed to fetch companies",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      errorName: error?.name,
      errorCode: error?.code,
      databaseUrlStatus: process.env.DATABASE_URL ? "set" : "missing"
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