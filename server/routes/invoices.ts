/**
 * Invoice Management Routes
 */

import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { invoices, users } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth } from "../local-auth";

const router = Router();

// Configure multer for invoice file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.VERCEL ? '/tmp' : 'uploads/invoices';
    if (!process.env.VERCEL && !fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}_${timestamp}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow PDF, images, and Excel files for invoices
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, images, and Excel files are allowed.'));
    }
  }
});

// Get invoices for a specific order
router.get("/invoices", async (req, res) => {
  try {
    const { orderId } = req.query;
    console.log(`💰 Fetching invoices${orderId ? ` for order ${orderId}` : ''} from database...`);
    
    let query = db
      .select({
        id: invoices.id,
        orderId: invoices.orderId,
        invoiceNumber: invoices.invoiceNumber,
        invoiceType: invoices.invoiceType,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        totalAmount: invoices.totalAmount,
        vatAmount: invoices.vatAmount,
        status: invoices.status,
        filePath: invoices.filePath,
        uploadedBy: invoices.uploadedBy,
        verifiedBy: invoices.verifiedBy,
        verifiedAt: invoices.verifiedAt,
        taxInvoiceIssued: invoices.taxInvoiceIssued,
        taxInvoiceIssuedDate: invoices.taxInvoiceIssuedDate,
        notes: invoices.notes,
        createdAt: invoices.createdAt,
        updatedAt: invoices.updatedAt,
      })
      .from(invoices);
    
    if (orderId) {
      query = query.where(eq(invoices.orderId, parseInt(orderId as string)));
    }
    
    const invoiceList = await query.orderBy(desc(invoices.createdAt));
    
    console.log(`✅ Successfully fetched ${invoiceList.length} invoices from database`);
    res.json(invoiceList);
  } catch (error) {
    console.error("❌ Error fetching invoices:", error);
    res.status(500).json({ 
      message: "Failed to fetch invoices",
      error: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
    });
  }
});

// Get invoice by ID
router.get("/invoices/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    console.log(`💰 Fetching invoice ${id} from database...`);
    
    const [invoice] = await db
      .select({
        id: invoices.id,
        orderId: invoices.orderId,
        invoiceNumber: invoices.invoiceNumber,
        invoiceType: invoices.invoiceType,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        totalAmount: invoices.totalAmount,
        vatAmount: invoices.vatAmount,
        status: invoices.status,
        filePath: invoices.filePath,
        uploadedBy: invoices.uploadedBy,
        verifiedBy: invoices.verifiedBy,
        verifiedAt: invoices.verifiedAt,
        taxInvoiceIssued: invoices.taxInvoiceIssued,
        taxInvoiceIssuedDate: invoices.taxInvoiceIssuedDate,
        taxInvoiceIssuedBy: invoices.taxInvoiceIssuedBy,
        notes: invoices.notes,
        createdAt: invoices.createdAt,
        updatedAt: invoices.updatedAt,
        // Join with users for uploader name
        uploaderName: users.name,
      })
      .from(invoices)
      .leftJoin(users, eq(invoices.uploadedBy, users.id))
      .where(eq(invoices.id, id))
      .limit(1);
    
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    
    console.log(`✅ Successfully fetched invoice ${id}`);
    res.json(invoice);
  } catch (error) {
    console.error("❌ Error fetching invoice by ID:", error);
    res.status(500).json({ 
      message: "Failed to fetch invoice",
      error: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
    });
  }
});

// Upload new invoice
router.post("/invoices", upload.single('file'), async (req, res) => {
  try {
    console.log('💰 Creating new invoice...');
    console.log('Request body:', req.body);
    console.log('Uploaded file:', req.file);
    
    const {
      orderId,
      invoiceNumber,
      invoiceType,
      issueDate,
      dueDate,
      totalAmount,
      vatAmount,
      notes
    } = req.body;
    
    // Get current user ID from session
    const userId = (req as any).user?.id || 'test_admin_001';
    
    // Validate required fields
    if (!orderId || !invoiceNumber || !totalAmount) {
      return res.status(400).json({ 
        message: "Missing required fields: orderId, invoiceNumber, totalAmount" 
      });
    }
    
    // Handle file data for Vercel environment
    let fileData: string | undefined;
    let filePath: string | undefined;
    
    if (req.file) {
      filePath = req.file.path;
      
      // For Vercel, store file as base64
      if (process.env.VERCEL) {
        const fileBuffer = fs.readFileSync(req.file.path);
        fileData = fileBuffer.toString('base64');
        console.log(`📎 File data encoded for Vercel: ${Math.round(fileBuffer.length / 1024)}KB`);
      }
    }
    
    // Create invoice in database
    const [newInvoice] = await db
      .insert(invoices)
      .values({
        orderId: parseInt(orderId),
        invoiceNumber,
        invoiceType: invoiceType || 'invoice',
        issueDate: new Date(issueDate), // Correct column name
        dueDate: dueDate ? new Date(dueDate) : null,
        totalAmount: parseFloat(totalAmount),
        vatAmount: vatAmount ? parseFloat(vatAmount) : 0,
        status: 'pending',
        filePath: process.env.VERCEL ? req.file?.filename : filePath,
        uploadedBy: userId,
        notes: notes || null,
      })
      .returning();
    
    // Fetch the created invoice with joins for complete data
    const [invoice] = await db
      .select({
        id: invoices.id,
        orderId: invoices.orderId,
        invoiceNumber: invoices.invoiceNumber,
        invoiceType: invoices.invoiceType,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        totalAmount: invoices.totalAmount,
        vatAmount: invoices.vatAmount,
        status: invoices.status,
        filePath: invoices.filePath,
        uploadedBy: invoices.uploadedBy,
        verifiedBy: invoices.verifiedBy,
        verifiedAt: invoices.verifiedAt,
        taxInvoiceIssued: invoices.taxInvoiceIssued,
        taxInvoiceIssuedDate: invoices.taxInvoiceIssuedDate,
        notes: invoices.notes,
        createdAt: invoices.createdAt,
        updatedAt: invoices.updatedAt,
        // Join with users for uploader name
        uploaderName: users.name,
      })
      .from(invoices)
      .leftJoin(users, eq(invoices.uploadedBy, users.id))
      .where(eq(invoices.id, newInvoice.id));
    
    console.log(`✅ Successfully created invoice ${newInvoice.id}`);
    res.status(201).json(invoice);
  } catch (error) {
    console.error("❌ Error creating invoice:", error);
    res.status(500).json({ 
      message: "Failed to create invoice",
      error: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
    });
  }
});

// Verify invoice
router.post("/invoices/:id/verify", requireAuth, async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id, 10);
    const userId = (req as any).user?.id || 'test_admin_001';
    
    console.log(`💰 Verifying invoice ${invoiceId}...`);
    
    // Update invoice to verified status
    const [updatedInvoice] = await db
      .update(invoices)
      .set({
        status: 'verified',
        verifiedBy: userId,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId))
      .returning();
    
    if (!updatedInvoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    
    console.log(`✅ Successfully verified invoice ${invoiceId}`);
    res.json({ message: "Invoice verified successfully", invoice: updatedInvoice });
  } catch (error) {
    console.error("❌ Error verifying invoice:", error);
    res.status(500).json({ 
      message: "Failed to verify invoice",
      error: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
    });
  }
});

// Issue tax invoice
router.post("/invoices/:id/issue-tax", requireAuth, async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id, 10);
    const userId = (req as any).user?.id || 'test_admin_001';
    
    console.log(`💰 Issuing tax invoice for ${invoiceId}...`);
    
    // Update invoice to include tax invoice issuance
    const [updatedInvoice] = await db
      .update(invoices)
      .set({
        taxInvoiceIssued: true,
        taxInvoiceIssuedDate: new Date(),
        taxInvoiceIssuedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId))
      .returning();
    
    if (!updatedInvoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    
    console.log(`✅ Successfully issued tax invoice for ${invoiceId}`);
    res.json({ message: "Tax invoice issued successfully", invoice: updatedInvoice });
  } catch (error) {
    console.error("❌ Error issuing tax invoice:", error);
    res.status(500).json({ 
      message: "Failed to issue tax invoice",
      error: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
    });
  }
});

// Update invoice
router.patch("/invoices/:id", requireAuth, async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id, 10);
    console.log(`💰 Updating invoice ${invoiceId}...`);
    
    const {
      invoiceNumber,
      invoiceType,
      issueDate,
      dueDate,
      totalAmount,
      vatAmount,
      status,
      notes
    } = req.body;
    
    // Build update object with only provided fields
    const updateData: any = {};
    if (invoiceNumber !== undefined) updateData.invoiceNumber = invoiceNumber;
    if (invoiceType !== undefined) updateData.invoiceType = invoiceType;
    if (issueDate !== undefined) updateData.issueDate = new Date(issueDate);
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (totalAmount !== undefined) updateData.totalAmount = parseFloat(totalAmount);
    if (vatAmount !== undefined) updateData.vatAmount = parseFloat(vatAmount);
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    updateData.updatedAt = new Date();
    
    // Update invoice in database
    const [updatedInvoice] = await db
      .update(invoices)
      .set(updateData)
      .where(eq(invoices.id, invoiceId))
      .returning();
    
    if (!updatedInvoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    
    console.log(`✅ Successfully updated invoice ${invoiceId}`);
    res.json(updatedInvoice);
  } catch (error) {
    console.error("❌ Error updating invoice:", error);
    res.status(500).json({ 
      message: "Failed to update invoice",
      error: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
    });
  }
});

// Delete invoice
router.delete("/invoices/:id", requireAuth, async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id, 10);
    console.log(`💰 Deleting invoice ${invoiceId}...`);
    
    // Get invoice to check if file needs to be deleted
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);
    
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    
    // Delete invoice from database
    await db.delete(invoices).where(eq(invoices.id, invoiceId));
    
    // Delete file if exists
    if (invoice.filePath && !process.env.VERCEL) {
      try {
        if (fs.existsSync(invoice.filePath)) {
          fs.unlinkSync(invoice.filePath);
          console.log(`🗑️ Deleted invoice file: ${invoice.filePath}`);
        }
      } catch (fileError) {
        console.warn(`⚠️ Failed to delete invoice file: ${fileError}`);
      }
    }
    
    console.log(`✅ Successfully deleted invoice ${invoiceId}`);
    res.json({ message: "Invoice deleted successfully", id: invoiceId });
  } catch (error) {
    console.error("❌ Error deleting invoice:", error);
    res.status(500).json({ 
      message: "Failed to delete invoice",
      error: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
    });
  }
});

export default router;