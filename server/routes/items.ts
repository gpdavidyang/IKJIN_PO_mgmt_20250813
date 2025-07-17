/**
 * Item Management Routes
 */

import { Router } from "express";
import { storage } from "../storage";
import { insertItemSchema } from "@shared/schema";

const router = Router();

router.get("/items", async (req, res) => {
  try {
    const items = await storage.getItems();
    res.json(items);
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ message: "Failed to fetch items" });
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