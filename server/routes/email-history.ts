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
  recipients: z.array(z.string()),
  cc: z.array(z.string()).optional(),
  bcc: z.array(z.string()).optional(),
  subject: z.string(),
  messageContent: z.string(),
  attachmentFiles: z.array(z.string()).optional(),
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
          emailStatus: emailSendHistory.status, // This maps to sending_status column
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

// Get all email history with pagination and filters (for reports page)
router.get("/email-history", requireAuth, async (req, res) => {
  try {
    const { 
      page = '1', 
      limit = '50',
      startDate,
      endDate,
      status,
      orderNumber,
      vendorName,
      senderUserId 
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build where conditions
    const conditions = [];
    
    if (startDate) {
      conditions.push(sql`${emailSendHistory.sentAt} >= ${new Date(startDate as string)}`);
    }
    if (endDate) {
      conditions.push(sql`${emailSendHistory.sentAt} <= ${new Date(endDate as string)}`);
    }
    if (status) {
      conditions.push(eq(emailSendHistory.status, status as string));
    }
    if (orderNumber) {
      conditions.push(sql`${purchaseOrders.orderNumber} ILIKE ${`%${orderNumber}%`}`);
    }
    if (vendorName) {
      conditions.push(sql`${vendors.name} ILIKE ${`%${vendorName}%`}`);
    }
    if (senderUserId) {
      conditions.push(eq(emailSendHistory.senderUserId, senderUserId as string));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(emailSendHistory)
      .leftJoin(purchaseOrders, eq(emailSendHistory.orderId, purchaseOrders.id))
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(whereClause);

    // Get paginated data
    const emails = await db
      .select({
        id: emailSendHistory.id,
        orderId: emailSendHistory.orderId,
        orderNumber: purchaseOrders.orderNumber,
        vendorName: vendors.name,
        sentAt: emailSendHistory.sentAt,
        sentByName: users.name,
        sentByEmail: users.email,
        recipients: emailSendHistory.recipients,
        cc: emailSendHistory.cc,
        subject: emailSendHistory.subject,
        messageContent: emailSendHistory.messageContent,
        attachmentFiles: emailSendHistory.attachmentFiles,
        status: emailSendHistory.status,
        errorMessage: emailSendHistory.errorMessage,
        createdAt: emailSendHistory.createdAt,
      })
      .from(emailSendHistory)
      .leftJoin(purchaseOrders, eq(emailSendHistory.orderId, purchaseOrders.id))
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .leftJoin(users, eq(emailSendHistory.senderUserId, users.id))
      .where(whereClause)
      .orderBy(desc(emailSendHistory.sentAt))
      .limit(limitNum)
      .offset(offset);

    // Calculate statistics
    const statusCounts = await db
      .select({
        status: emailSendHistory.status,
        count: sql<number>`count(*)`
      })
      .from(emailSendHistory)
      .leftJoin(purchaseOrders, eq(emailSendHistory.orderId, purchaseOrders.id))
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(whereClause)
      .groupBy(emailSendHistory.status);

    const totalEmails = count;
    const successfulEmails = statusCounts.find(s => s.status === 'sent')?.count || 0;
    const failedEmails = statusCounts.find(s => s.status === 'failed')?.count || 0;
    const pendingEmails = statusCounts.find(s => s.status === 'pending')?.count || 0;

    res.json({
      data: emails,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalEmails,
        pages: Math.ceil(totalEmails / limitNum)
      },
      statistics: {
        totalEmails,
        successfulEmails,
        failedEmails,
        pendingEmails,
        successRate: totalEmails > 0 ? Math.round((successfulEmails / totalEmails) * 100) : 0
      }
    });
  } catch (error) {
    console.error("Error fetching email history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;