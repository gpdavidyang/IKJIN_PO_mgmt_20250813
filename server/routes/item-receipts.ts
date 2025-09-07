/**
 * Item Receipts Routes
 */

import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { itemReceipts, purchaseOrderItems, users } from "@shared/schema";

const router = Router();

// Get all item receipts
router.get("/item-receipts", async (_req, res) => {
  try {
    console.log("📦 Fetching all item receipts from database...");
    
    // Fetch from actual database with joins
    const receipts = await db
      .select({
        id: itemReceipts.id,
        orderItemId: itemReceipts.orderItemId,
        invoiceId: itemReceipts.invoiceId,
        receivedQuantity: itemReceipts.receivedQuantity,
        receivedDate: itemReceipts.receivedDate,
        qualityCheck: itemReceipts.qualityCheck,
        qualityNotes: itemReceipts.qualityNotes,
        verifiedBy: itemReceipts.verifiedBy,
        status: itemReceipts.status,
        notes: itemReceipts.notes,
        createdAt: itemReceipts.createdAt,
        updatedAt: itemReceipts.updatedAt,
        // Join with order items for item details
        itemName: purchaseOrderItems.itemName,
        unit: purchaseOrderItems.unit,
        orderId: purchaseOrderItems.orderId,
        // Join with users for verifier name
        verifierName: users.name,
      })
      .from(itemReceipts)
      .leftJoin(purchaseOrderItems, eq(itemReceipts.orderItemId, purchaseOrderItems.id))
      .leftJoin(users, eq(itemReceipts.verifiedBy, users.id))
      .orderBy(desc(itemReceipts.createdAt));
    
    console.log(`✅ Successfully fetched ${receipts.length} item receipts from database`);
    res.json(receipts);
  } catch (error) {
    console.error("❌ Error fetching item receipts:", error);
    res.status(500).json({ 
      message: "Failed to fetch item receipts",
      error: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
    });
  }
});

// Get item receipts for a specific order
router.get("/item-receipts/order/:orderId", async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    console.log(`📦 Fetching item receipts for order ${orderId} from database...`);
    
    // Fetch from database with joins, filtering by orderId
    const receipts = await db
      .select({
        id: itemReceipts.id,
        orderItemId: itemReceipts.orderItemId,
        invoiceId: itemReceipts.invoiceId,
        receivedQuantity: itemReceipts.receivedQuantity,
        receivedDate: itemReceipts.receivedDate,
        qualityCheck: itemReceipts.qualityCheck,
        qualityNotes: itemReceipts.qualityNotes,
        verifiedBy: itemReceipts.verifiedBy,
        status: itemReceipts.status,
        notes: itemReceipts.notes,
        createdAt: itemReceipts.createdAt,
        updatedAt: itemReceipts.updatedAt,
        // Join with order items for item details
        itemName: purchaseOrderItems.itemName,
        unit: purchaseOrderItems.unit,
        orderId: purchaseOrderItems.orderId,
        // Join with users for verifier name
        verifierName: users.name,
      })
      .from(itemReceipts)
      .leftJoin(purchaseOrderItems, eq(itemReceipts.orderItemId, purchaseOrderItems.id))
      .leftJoin(users, eq(itemReceipts.verifiedBy, users.id))
      .where(eq(purchaseOrderItems.orderId, orderId))
      .orderBy(desc(itemReceipts.createdAt));
    
    console.log(`✅ Successfully fetched ${receipts.length} item receipts for order ${orderId}`);
    res.json(receipts);
  } catch (error) {
    console.error("❌ Error fetching item receipts by order:", error);
    res.status(500).json({ 
      message: "Failed to fetch item receipts for order",
      error: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
    });
  }
});

// Create new item receipt
router.post("/item-receipts", async (req, res) => {
  try {
    console.log("📦 Creating new item receipt...");
    console.log("Request body:", req.body);
    
    const { 
      orderItemId, 
      invoiceId, 
      receivedQuantity, 
      receivedDate,
      qualityCheck,
      qualityNotes,
      status,
      notes 
    } = req.body;
    
    // Get current user ID from session
    const userId = (req as any).user?.id || 'test_admin_001';
    
    // Validate required fields
    if (!orderItemId || !receivedQuantity || !receivedDate) {
      return res.status(400).json({ 
        message: "Missing required fields: orderItemId, receivedQuantity, receivedDate" 
      });
    }
    
    // Create receipt in database
    const [newReceipt] = await db
      .insert(itemReceipts)
      .values({
        orderItemId: parseInt(orderItemId),
        invoiceId: invoiceId ? parseInt(invoiceId) : null,
        receivedQuantity: parseFloat(receivedQuantity),
        receivedDate: new Date(receivedDate),
        qualityCheck: qualityCheck || false,
        qualityNotes: qualityNotes || null,
        verifiedBy: userId,
        status: status || 'pending',
        notes: notes || null,
      })
      .returning();
    
    // Fetch the created receipt with joins for complete data
    const [receipt] = await db
      .select({
        id: itemReceipts.id,
        orderItemId: itemReceipts.orderItemId,
        invoiceId: itemReceipts.invoiceId,
        receivedQuantity: itemReceipts.receivedQuantity,
        receivedDate: itemReceipts.receivedDate,
        qualityCheck: itemReceipts.qualityCheck,
        qualityNotes: itemReceipts.qualityNotes,
        verifiedBy: itemReceipts.verifiedBy,
        status: itemReceipts.status,
        notes: itemReceipts.notes,
        createdAt: itemReceipts.createdAt,
        updatedAt: itemReceipts.updatedAt,
        // Join with order items for item details
        itemName: purchaseOrderItems.itemName,
        unit: purchaseOrderItems.unit,
        orderId: purchaseOrderItems.orderId,
        // Join with users for verifier name
        verifierName: users.name,
      })
      .from(itemReceipts)
      .leftJoin(purchaseOrderItems, eq(itemReceipts.orderItemId, purchaseOrderItems.id))
      .leftJoin(users, eq(itemReceipts.verifiedBy, users.id))
      .where(eq(itemReceipts.id, newReceipt.id));
    
    console.log(`✅ Successfully created item receipt ${newReceipt.id}`);
    res.status(201).json(receipt);
  } catch (error) {
    console.error("❌ Error creating item receipt:", error);
    res.status(500).json({ 
      message: "Failed to create item receipt",
      error: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
    });
  }
});

// Update item receipt
router.patch("/item-receipts/:id", async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id, 10);
    console.log(`📦 Updating item receipt ${receiptId}...`);
    
    const { 
      receivedQuantity, 
      receivedDate,
      qualityCheck,
      qualityNotes,
      status,
      notes 
    } = req.body;
    
    // Build update object with only provided fields
    const updateData: any = {};
    if (receivedQuantity !== undefined) updateData.receivedQuantity = parseFloat(receivedQuantity);
    if (receivedDate !== undefined) updateData.receivedDate = new Date(receivedDate);
    if (qualityCheck !== undefined) updateData.qualityCheck = qualityCheck;
    if (qualityNotes !== undefined) updateData.qualityNotes = qualityNotes;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    updateData.updatedAt = new Date();
    
    // Update receipt in database
    const [updatedReceipt] = await db
      .update(itemReceipts)
      .set(updateData)
      .where(eq(itemReceipts.id, receiptId))
      .returning();
    
    if (!updatedReceipt) {
      return res.status(404).json({ message: "Item receipt not found" });
    }
    
    // Fetch the updated receipt with joins for complete data
    const [receipt] = await db
      .select({
        id: itemReceipts.id,
        orderItemId: itemReceipts.orderItemId,
        invoiceId: itemReceipts.invoiceId,
        receivedQuantity: itemReceipts.receivedQuantity,
        receivedDate: itemReceipts.receivedDate,
        qualityCheck: itemReceipts.qualityCheck,
        qualityNotes: itemReceipts.qualityNotes,
        verifiedBy: itemReceipts.verifiedBy,
        status: itemReceipts.status,
        notes: itemReceipts.notes,
        createdAt: itemReceipts.createdAt,
        updatedAt: itemReceipts.updatedAt,
        // Join with order items for item details
        itemName: purchaseOrderItems.itemName,
        unit: purchaseOrderItems.unit,
        orderId: purchaseOrderItems.orderId,
        // Join with users for verifier name
        verifierName: users.name,
      })
      .from(itemReceipts)
      .leftJoin(purchaseOrderItems, eq(itemReceipts.orderItemId, purchaseOrderItems.id))
      .leftJoin(users, eq(itemReceipts.verifiedBy, users.id))
      .where(eq(itemReceipts.id, receiptId));
    
    console.log(`✅ Successfully updated item receipt ${receiptId}`);
    res.json(receipt);
  } catch (error) {
    console.error("❌ Error updating item receipt:", error);
    res.status(500).json({ 
      message: "Failed to update item receipt",
      error: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
    });
  }
});

// Delete item receipt
router.delete("/item-receipts/:id", async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id, 10);
    console.log(`📦 Deleting item receipt ${receiptId}...`);
    
    // Delete receipt from database
    const [deletedReceipt] = await db
      .delete(itemReceipts)
      .where(eq(itemReceipts.id, receiptId))
      .returning();
    
    if (!deletedReceipt) {
      return res.status(404).json({ message: "Item receipt not found" });
    }
    
    console.log(`✅ Successfully deleted item receipt ${receiptId}`);
    res.json({ message: "Item receipt deleted successfully", id: receiptId });
  } catch (error) {
    console.error("❌ Error deleting item receipt:", error);
    res.status(500).json({ 
      message: "Failed to delete item receipt",
      error: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
    });
  }
});

export default router;