/**
 * Vendor Management Routes
 */

import { Router } from "express";
import { storage } from "../storage";
import { insertVendorSchema } from "@shared/schema";

const router = Router();

router.get("/vendors", async (req, res) => {
  try {
    const vendors = await storage.getVendors();
    res.json(vendors);
  } catch (error) {
    console.error("Error fetching vendors:", error);
    res.status(500).json({ message: "Failed to fetch vendors" });
  }
});

router.get("/vendors/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
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

router.post("/vendors", async (req, res) => {
  try {
    const validatedData = insertVendorSchema.parse(req.body);
    const vendor = await storage.createVendor(validatedData);
    res.status(201).json(vendor);
  } catch (error) {
    console.error("Error creating vendor:", error);
    res.status(500).json({ message: "Failed to create vendor" });
  }
});

router.put("/vendors/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updatedVendor = await storage.updateVendor(id, req.body);
    res.json(updatedVendor);
  } catch (error) {
    console.error("Error updating vendor:", error);
    res.status(500).json({ message: "Failed to update vendor" });
  }
});

router.delete("/vendors/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await storage.deleteVendor(id);
    res.json({ message: "Vendor deleted successfully" });
  } catch (error) {
    console.error("Error deleting vendor:", error);
    res.status(500).json({ message: "Failed to delete vendor" });
  }
});

export default router;