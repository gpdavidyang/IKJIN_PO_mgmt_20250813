/**
 * Item Management Routes
 */

import { Router } from "express";
import { storage } from "../storage";
import { insertItemSchema } from "@shared/schema";

const router = Router();

router.get("/items", async (req, res) => {
  try {
    console.log("🔨 Fetching items from database...");
    console.log("🔍 DATABASE_URL status:", process.env.DATABASE_URL ? "set" : "missing");
    console.log("🔍 DB object status:", typeof storage);
    
    const result = await storage.getItems({});
    console.log(`✅ Successfully fetched ${result.items.length} items (total: ${result.total})`);
    res.json(result.items);
  } catch (error) {
    console.error("💥 Error fetching items:", error);
    console.error("💥 Error name:", error?.name);
    console.error("💥 Error code:", error?.code);
    console.error("💥 Error message:", error?.message);
    console.error("💥 Error stack:", error?.stack?.substring(0, 500));
    
    res.status(500).json({ 
      message: "Failed to fetch items",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      errorName: error?.name,
      errorCode: error?.code,
      databaseUrlStatus: process.env.DATABASE_URL ? "set" : "missing"
    });
  }
});

// Item categories route - must come before /items/:id to avoid route conflicts
router.get("/items/categories", async (req, res) => {
  try {
    console.log("🏷️ Fetching item categories from database...");
    console.log("🔍 DATABASE_URL status:", process.env.DATABASE_URL ? "set" : "missing");
    
    const categories = await storage.getItemCategories();
    console.log(`✅ Successfully fetched ${categories.length} categories`);
    res.json(categories);
  } catch (error) {
    console.error("💥 Error fetching item categories:", error);
    console.error("💥 Error name:", error?.name);
    console.error("💥 Error code:", error?.code);
    console.error("💥 Error message:", error?.message);
    
    res.status(500).json({ 
      message: "Failed to fetch item categories",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      errorName: error?.name,
      errorCode: error?.code
    });
  }
});

router.get("/items/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const item = await storage.getItem(id);
    
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    
    res.json(item);
  } catch (error) {
    console.error("Error fetching item:", error);
    res.status(500).json({ message: "Failed to fetch item" });
  }
});

router.post("/items", async (req, res) => {
  try {
    const validatedData = insertItemSchema.parse(req.body);
    const item = await storage.createItem(validatedData);
    res.status(201).json(item);
  } catch (error) {
    console.error("Error creating item:", error);
    res.status(500).json({ message: "Failed to create item" });
  }
});

router.put("/items/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updatedItem = await storage.updateItem(id, req.body);
    res.json(updatedItem);
  } catch (error) {
    console.error("Error updating item:", error);
    res.status(500).json({ message: "Failed to update item" });
  }
});

router.delete("/items/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await storage.deleteItem(id);
    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error("Error deleting item:", error);
    res.status(500).json({ message: "Failed to delete item" });
  }
});

// Item categories management
router.get("/item-categories", async (req, res) => {
  try {
    const categories = await storage.getItemCategories();
    res.json(categories);
  } catch (error) {
    console.error("Error fetching item categories:", error);
    res.status(500).json({ message: "Failed to fetch item categories" });
  }
});

// Specific category endpoints
router.get("/item-categories/major", async (req, res) => {
  try {
    const categories = await storage.getMajorCategories();
    res.json(categories);
  } catch (error) {
    console.error("Error fetching major categories:", error);
    res.status(500).json({ message: "Failed to fetch major categories" });
  }
});

router.get("/item-categories/middle", async (req, res) => {
  try {
    const { majorId } = req.query;
    const categories = await storage.getMiddleCategories(majorId ? parseInt(majorId as string) : undefined);
    res.json(categories);
  } catch (error) {
    console.error("Error fetching middle categories:", error);
    res.status(500).json({ message: "Failed to fetch middle categories" });
  }
});

router.get("/item-categories/minor", async (req, res) => {
  try {
    const { middleId } = req.query;
    const categories = await storage.getMinorCategories(middleId ? parseInt(middleId as string) : undefined);
    res.json(categories);
  } catch (error) {
    console.error("Error fetching minor categories:", error);
    res.status(500).json({ message: "Failed to fetch minor categories" });
  }
});

router.post("/item-categories", async (req, res) => {
  try {
    const category = await storage.createItemCategory(req.body);
    res.status(201).json(category);
  } catch (error) {
    console.error("Error creating item category:", error);
    res.status(500).json({ message: "Failed to create item category" });
  }
});

router.put("/item-categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updatedCategory = await storage.updateItemCategory(id, req.body);
    res.json(updatedCategory);
  } catch (error) {
    console.error("Error updating item category:", error);
    res.status(500).json({ message: "Failed to update item category" });
  }
});

router.delete("/item-categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await storage.deleteItemCategory(id);
    res.json({ message: "Item category deleted successfully" });
  } catch (error) {
    console.error("Error deleting item category:", error);
    res.status(500).json({ message: "Failed to delete item category" });
  }
});

export default router;