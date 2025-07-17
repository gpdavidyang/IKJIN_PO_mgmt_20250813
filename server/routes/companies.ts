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
    const companies = await storage.getCompanies();
    res.json(companies);
  } catch (error) {
    console.error("Error fetching companies:", error);
    res.status(500).json({ message: "Failed to fetch companies" });
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