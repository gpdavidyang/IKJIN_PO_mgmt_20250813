/**
 * Company Management Routes
 */

import { Router } from "express";
import { storage } from "../storage";
import { insertCompanySchema } from "@shared/schema";
import { logoUpload } from "../utils/multer-config";

const router = Router();

router.get("/companies", async (req, res) => {
  try {
    console.log("🏢 Fetching companies from database...");
    console.log("🔍 DATABASE_URL status:", process.env.DATABASE_URL ? "set" : "missing");
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
      errorCode: error?.code
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