/**
 * Purchase Order Management Routes
 * Handles order CRUD, approval workflow, file uploads
 */

import { Router } from "express";
import { storage } from "../storage";
import { requireAuth, requireAdmin, requireOrderManager } from "../temp-auth-fix";
import { insertPurchaseOrderSchema } from "@shared/schema";
import { upload } from "../utils/multer-config";
import { decodeKoreanFilename } from "../utils/korean-filename";
import { OrderService } from "../services/order-service";
import { OptimizedOrderQueries, OptimizedDashboardQueries } from "../utils/optimized-queries";
import { z } from "zod";

const router = Router();

// Get all orders with filters and pagination
router.get("/orders", async (req, res) => {
  try {
    const { 
      page = "1", 
      limit = "20",
      status,
      projectId,
      vendorId,
      startDate,
      endDate,
      userId,
      search
    } = req.query;

    const filters = {
      status: status as string,
      projectId: projectId ? parseInt(projectId as string) : undefined,
      vendorId: vendorId ? parseInt(vendorId as string) : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      userId: userId as string,
      search: search as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };

    const result = await OptimizedOrderQueries.getOrdersWithFilters(filters);
    res.json(result);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

// Get order by ID
router.get("/orders/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const order = await storage.getPurchaseOrder(id);
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ message: "Failed to fetch order" });
  }
});

// Create new order
router.post("/orders", requireAuth, upload.array('attachments'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    console.log("🔧🔧🔧 ORDERS.TS - Order creation request:", {
      body: req.body,
      files: req.files?.map(f => ({ 
        originalname: f.originalname, 
        filename: f.filename,
        size: f.size 
      }))
    });

    // Parse items from form data
    let items = [];
    try {
      items = JSON.parse(req.body.items || "[]");
    } catch (parseError) {
      console.error("🔧🔧🔧 ORDERS.TS - Error parsing items:", parseError);
      return res.status(400).json({ message: "Invalid items data" });
    }

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => 
      sum + (parseFloat(item.quantity) * parseFloat(item.unitPrice)), 0);

    // Prepare order data
    const orderData = {
      orderNumber: await OrderService.generateOrderNumber(),
      projectId: parseInt(req.body.projectId),
      vendorId: req.body.vendorId ? parseInt(req.body.vendorId) : null,
      templateId: req.body.templateId ? parseInt(req.body.templateId) : null,
      userId,
      orderDate: new Date(),
      deliveryDate: req.body.deliveryDate ? new Date(req.body.deliveryDate) : null,
      totalAmount,
      notes: req.body.notes || null,
      status: "draft" as const,
      currentApproverRole: null,
      approvalLevel: 0,
      items
    };

    console.log("🔧🔧🔧 ORDERS.TS - Prepared order data:", orderData);

    // Create order
    const order = await storage.createPurchaseOrder(orderData);
    console.log("🔧🔧🔧 ORDERS.TS - Created order:", order);

    // Handle file attachments
    if (req.files && req.files.length > 0) {
      for (const file of req.files as Express.Multer.File[]) {
        const decodedFilename = decodeKoreanFilename(file.originalname);
        console.log("🔧🔧🔧 ORDERS.TS - Processing file:", {
          original: file.originalname,
          decoded: decodedFilename,
          stored: file.filename
        });

        await storage.createAttachment({
          orderId: order.id,
          fileName: decodedFilename,
          filePath: file.filename,
          uploadedBy: userId
        });
      }
    }

    res.status(201).json(order);
  } catch (error) {
    console.error("🔧🔧🔧 ORDERS.TS - Error creating order:", error);
    res.status(500).json({ message: "Failed to create order" });
  }
});

// Update order
router.put("/orders/:id", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const updateData = req.body;

    // Check if user can edit this order
    const order = await storage.getPurchaseOrder(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Only draft orders can be edited by creators
    if (order.status !== 'draft' && order.userId !== req.user?.id) {
      return res.status(403).json({ message: "Cannot edit approved orders" });
    }

    const updatedOrder = await storage.updatePurchaseOrder(orderId, updateData);
    res.json(updatedOrder);
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ message: "Failed to update order" });
  }
});

// Delete order
router.delete("/orders/:id", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    
    // Check if user can delete this order
    const order = await storage.getPurchaseOrder(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Only draft orders can be deleted
    if (order.status !== 'draft') {
      return res.status(403).json({ message: "Cannot delete submitted orders" });
    }

    await storage.deletePurchaseOrder(orderId);
    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ message: "Failed to delete order" });
  }
});

// Order approval workflow
router.post("/orders/:id/approve", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const result = await OrderService.approveOrder(orderId, userId);
    res.json(result);
  } catch (error) {
    console.error("Error approving order:", error);
    res.status(500).json({ message: "Failed to approve order" });
  }
});

router.post("/orders/:id/reject", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const { reason } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const result = await OrderService.rejectOrder(orderId, userId, reason);
    res.json(result);
  } catch (error) {
    console.error("Error rejecting order:", error);
    res.status(500).json({ message: "Failed to reject order" });
  }
});

router.post("/orders/:id/submit", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const result = await OrderService.submitForApproval(orderId, userId);
    res.json(result);
  } catch (error) {
    console.error("Error submitting order:", error);
    res.status(500).json({ message: "Failed to submit order" });
  }
});

// Get orders for approval
router.get("/orders/pending-approval", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const orders = await OptimizedOrderQueries.getPendingApprovalOrders(user.role);
    res.json(orders);
  } catch (error) {
    console.error("Error fetching pending orders:", error);
    res.status(500).json({ message: "Failed to fetch pending orders" });
  }
});

// Get order statistics
router.get("/orders/stats", async (req, res) => {
  try {
    const stats = await OptimizedDashboardQueries.getOrderStatistics();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching order statistics:", error);
    res.status(500).json({ message: "Failed to fetch order statistics" });
  }
});

export default router;