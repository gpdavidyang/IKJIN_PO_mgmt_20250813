import { Router } from "express";
import { db } from "../db";
import { emailSendHistory, purchaseOrders, users, vendors } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { z } from "zod";
import type { EmailSendHistory } from "@shared/schema";

const router = Router();

// Schema for creating email history
const createEmailHistorySchema = z.object({
  orderId: z.number(),
  recipientEmail: z.string().email(),
  recipientName: z.string().optional(),
  ccEmails: z.string().optional(),
  subject: z.string(),
  body: z.string(),
  attachments: z.array(z.object({
    filename: z.string(),
    path: z.string(),
    size: z.number(),
  })).optional(),
  status: z.enum(['sent', 'failed', 'bounced', 'opened', 'clicked']).default('sent'),
  errorMessage: z.string().optional(),
  emailProvider: z.string().default('naver'),
  messageId: z.string().optional(),
});

// Get email history for a specific order
router.get("/orders/:orderId/email-history", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

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
        sentBy: emailSendHistory.sentBy,
        sentByName: users.name,
        sentByEmail: users.email,
        recipientEmail: emailSendHistory.recipientEmail,
        recipientName: emailSendHistory.recipientName,
        ccEmails: emailSendHistory.ccEmails,
        subject: emailSendHistory.subject,
        body: emailSendHistory.body,
        attachments: emailSendHistory.attachments,
        status: emailSendHistory.status,
        errorMessage: emailSendHistory.errorMessage,
        openedAt: emailSendHistory.openedAt,
        clickedAt: emailSendHistory.clickedAt,
        trackingId: emailSendHistory.trackingId,
        emailProvider: emailSendHistory.emailProvider,
        messageId: emailSendHistory.messageId,
      })
      .from(emailSendHistory)
      .leftJoin(users, eq(emailSendHistory.sentBy, users.id))
      .where(eq(emailSendHistory.orderId, orderId))
      .orderBy(desc(emailSendHistory.sentAt));

    res.json(emailHistory);
  } catch (error) {
    console.error("Error fetching email history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create new email history record
router.post("/email-history", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const validatedData = createEmailHistorySchema.parse(req.body);
    
    // Create tracking ID
    const trackingId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const [newEmailHistory] = await db
      .insert(emailSendHistory)
      .values({
        ...validatedData,
        sentBy: req.user!.id,
        trackingId,
        attachments: validatedData.attachments || null,
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
router.get("/orders-email-status", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get latest email status for each order
    const emailStatusQuery = await db.execute(sql`
      WITH latest_emails AS (
        SELECT DISTINCT ON (order_id) 
          order_id,
          status,
          sent_at,
          recipient_email,
          opened_at
        FROM email_send_history
        ORDER BY order_id, sent_at DESC
      )
      SELECT 
        po.id,
        po.order_number,
        le.status as email_status,
        le.sent_at as last_sent_at,
        le.recipient_email,
        le.opened_at,
        COUNT(eh.id) as total_emails_sent
      FROM purchase_orders po
      LEFT JOIN latest_emails le ON po.id = le.order_id
      LEFT JOIN email_send_history eh ON po.id = eh.order_id
      GROUP BY po.id, po.order_number, le.status, le.sent_at, le.recipient_email, le.opened_at
    `);

    res.json(emailStatusQuery.rows);
  } catch (error) {
    console.error("Error fetching orders email status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update email tracking status (for open/click tracking)
router.put("/email-tracking/:trackingId", async (req, res) => {
  try {
    const { trackingId } = req.params;
    const { action } = req.body; // 'opened' or 'clicked'
    
    if (!['opened', 'clicked'].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }

    const updateData: any = {};
    if (action === 'opened') {
      updateData.openedAt = new Date();
      updateData.status = 'opened';
    } else if (action === 'clicked') {
      updateData.clickedAt = new Date();
      updateData.status = 'clicked';
    }

    // Update tracking info
    if (req.headers['x-forwarded-for'] || req.ip) {
      updateData.ipAddress = (req.headers['x-forwarded-for'] as string || req.ip).split(',')[0];
    }
    if (req.headers['user-agent']) {
      updateData.userAgent = req.headers['user-agent'];
    }

    const [updated] = await db
      .update(emailSendHistory)
      .set(updateData)
      .where(eq(emailSendHistory.trackingId, trackingId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Email not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating email tracking:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get email history detail
router.get("/email-history/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

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
        sentBy: emailSendHistory.sentBy,
        sentByName: users.name,
        sentByEmail: users.email,
        recipientEmail: emailSendHistory.recipientEmail,
        recipientName: emailSendHistory.recipientName,
        ccEmails: emailSendHistory.ccEmails,
        subject: emailSendHistory.subject,
        body: emailSendHistory.body,
        attachments: emailSendHistory.attachments,
        status: emailSendHistory.status,
        errorMessage: emailSendHistory.errorMessage,
        openedAt: emailSendHistory.openedAt,
        clickedAt: emailSendHistory.clickedAt,
        ipAddress: emailSendHistory.ipAddress,
        userAgent: emailSendHistory.userAgent,
        trackingId: emailSendHistory.trackingId,
        emailProvider: emailSendHistory.emailProvider,
        messageId: emailSendHistory.messageId,
      })
      .from(emailSendHistory)
      .leftJoin(purchaseOrders, eq(emailSendHistory.orderId, purchaseOrders.id))
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .leftJoin(users, eq(emailSendHistory.sentBy, users.id))
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