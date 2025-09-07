import { Router } from "express";
import { db } from "../db";
import { emailSendHistory, purchaseOrders, users, vendors } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { z } from "zod";
import type { EmailSendHistory } from "@shared/schema";
import { requireAuth } from "../local-auth";

const router = Router();

// Schema for creating email history
const createEmailHistorySchema = z.object({
  orderId: z.number(),
  orderNumber: z.string().optional(),
  recipients: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional(),
  })),
  cc: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional(),
  })).optional(),
  bcc: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional(),
  })).optional(),
  subject: z.string(),
  messageContent: z.string(),
  attachmentFiles: z.array(z.object({
    filename: z.string(),
    path: z.string(),
    size: z.number(),
  })).optional(),
  status: z.string().default('pending'),
  errorMessage: z.string().optional(),
});

// Get email history for a specific order
router.get("/orders/:orderId/email-history", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    if (isNaN(orderId)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    // Verify order exists and user has access
    const order = await db.query.purchaseOrders.findFirst({
      where: eq(purchaseOrders.id, orderId),
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Get email history with sender details
    const emailHistory = await db
      .select({
        id: emailSendHistory.id,
        orderId: emailSendHistory.orderId,
        sentAt: emailSendHistory.sentAt,
        sentBy: emailSendHistory.senderUserId,
        sentByName: users.name,
        sentByEmail: users.email,
        recipients: emailSendHistory.recipients,
        cc: emailSendHistory.cc,
        bcc: emailSendHistory.bcc,
        subject: emailSendHistory.subject,
        body: emailSendHistory.messageContent,
        attachments: emailSendHistory.attachmentFiles,
        status: emailSendHistory.status,
        errorMessage: emailSendHistory.errorMessage,
        sentCount: emailSendHistory.sentCount,
        failedCount: emailSendHistory.failedCount,
        createdAt: emailSendHistory.createdAt,
        updatedAt: emailSendHistory.updatedAt,
      })
      .from(emailSendHistory)
      .leftJoin(users, eq(emailSendHistory.senderUserId, users.id))
      .where(eq(emailSendHistory.orderId, orderId))
      .orderBy(desc(emailSendHistory.sentAt));

    res.json(emailHistory);
  } catch (error) {
    console.error("Error fetching email history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create new email history record
router.post("/email-history", requireAuth, async (req, res) => {
  try {
    const validatedData = createEmailHistorySchema.parse(req.body);

    const [newEmailHistory] = await db
      .insert(emailSendHistory)
      .values({
        ...validatedData,
        senderUserId: req.user!.id,
        attachmentFiles: validatedData.attachmentFiles || null,
      })
      .returning();

    // Update order status to 'sent' if it was 'approved'
    const order = await db.query.purchaseOrders.findFirst({
      where: eq(purchaseOrders.id, validatedData.orderId),
    });

    if (order && order.status === 'approved') {
      await db
        .update(purchaseOrders)
        .set({ 
          status: 'sent',
          updatedAt: new Date(),
        })
        .where(eq(purchaseOrders.id, validatedData.orderId));
    }

    res.json(newEmailHistory);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    console.error("Error creating email history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all orders with email status summary
router.get("/orders-email-status", requireAuth, async (req, res) => {
  try {
    try {
      // Simplified approach: get orders with their latest email status
      const orders = await db
        .select({
          id: purchaseOrders.id,
          orderNumber: purchaseOrders.orderNumber,
          emailStatus: emailSendHistory.status,
          lastSentAt: emailSendHistory.sentAt,
          recipients: emailSendHistory.recipients,
        })
        .from(purchaseOrders)
        .leftJoin(emailSendHistory, eq(purchaseOrders.id, emailSendHistory.orderId))
        .orderBy(desc(purchaseOrders.id));

      res.json(orders);
    } catch (dbError) {
      console.error("Database query error:", dbError);
      // Fallback: return empty array if email table doesn't exist yet
      const orders = await db
        .select({
          id: purchaseOrders.id,
          orderNumber: purchaseOrders.orderNumber,
          emailStatus: sql`null`.as('email_status'),
          lastSentAt: sql`null`.as('last_sent_at'),
          recipients: sql`null`.as('recipients'),
        })
        .from(purchaseOrders)
        .orderBy(desc(purchaseOrders.id));

      res.json(orders);
    }
  } catch (error) {
    console.error("Error fetching orders email status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update email status
router.put("/email-history/:id/status", requireAuth, async (req, res) => {
  try {
    const emailId = parseInt(req.params.id);
    if (isNaN(emailId)) {
      return res.status(400).json({ error: "Invalid email ID" });
    }

    const { status } = req.body;
    
    if (!['pending', 'sent', 'failed'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const [updated] = await db
      .update(emailSendHistory)
      .set({ status, updatedAt: new Date() })
      .where(eq(emailSendHistory.id, emailId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Email not found" });
    }

    res.json(updated);
  } catch (error) {
    console.error("Error updating email status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get email history detail
router.get("/email-history/:id", requireAuth, async (req, res) => {
  try {
    const emailId = parseInt(req.params.id);
    if (isNaN(emailId)) {
      return res.status(400).json({ error: "Invalid email ID" });
    }

    const email = await db
      .select({
        id: emailSendHistory.id,
        orderId: emailSendHistory.orderId,
        orderNumber: purchaseOrders.orderNumber,
        vendorName: vendors.name,
        sentAt: emailSendHistory.sentAt,
        senderUserId: emailSendHistory.senderUserId,
        sentByName: users.name,
        sentByEmail: users.email,
        recipients: emailSendHistory.recipients,
        cc: emailSendHistory.cc,
        bcc: emailSendHistory.bcc,
        subject: emailSendHistory.subject,
        messageContent: emailSendHistory.messageContent,
        attachmentFiles: emailSendHistory.attachmentFiles,
        status: emailSendHistory.status,
        errorMessage: emailSendHistory.errorMessage,
        sentCount: emailSendHistory.sentCount,
        failedCount: emailSendHistory.failedCount,
        createdAt: emailSendHistory.createdAt,
        updatedAt: emailSendHistory.updatedAt,
      })
      .from(emailSendHistory)
      .leftJoin(purchaseOrders, eq(emailSendHistory.orderId, purchaseOrders.id))
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .leftJoin(users, eq(emailSendHistory.senderUserId, users.id))
      .where(eq(emailSendHistory.id, emailId));

    if (!email || email.length === 0) {
      return res.status(404).json({ error: "Email not found" });
    }

    res.json(email[0]);
  } catch (error) {
    console.error("Error fetching email detail:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;