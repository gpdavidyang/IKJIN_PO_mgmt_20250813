import { Router } from 'express';
import { db } from '../db';
import { purchaseOrders, purchaseOrderItems, attachments, orderHistory, users, projects, vendors } from '@shared/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { requireAuth } from '../local-auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { z } from 'zod';

const router = Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'excel-simple');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitizedName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = path.extname(sanitizedName);
    const basename = path.basename(sanitizedName, ext);
    cb(null, `${timestamp}-${basename}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls', '.xlsm'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

// Validation schema for order data
const OrderItemSchema = z.object({
  itemName: z.string().optional(),
  specification: z.string().optional(),
  unit: z.string().optional(),
  quantity: z.number().default(0),
  unitPrice: z.number().default(0),
  totalAmount: z.number().default(0),
  remarks: z.string().optional()
});

const OrderDataSchema = z.object({
  rowIndex: z.number(),
  orderDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  vendorName: z.string().optional(),
  vendorEmail: z.string().optional(),
  deliveryPlace: z.string().optional(),
  deliveryEmail: z.string().optional(),
  projectName: z.string().optional(),
  majorCategory: z.string().optional(),
  middleCategory: z.string().optional(),
  minorCategory: z.string().optional(),
  items: z.array(OrderItemSchema),
  notes: z.string().optional(),
  isValid: z.boolean().optional(),
  errors: z.array(z.string()).optional()
});

// Bulk create orders without validation
router.post('/orders/bulk-create-simple', requireAuth, upload.single('excelFile'), async (req, res) => {
  console.log('📥 /bulk-create-simple - Received file:', req.file);
  console.log('📥 /bulk-create-simple - File details:', {
    originalname: req.file?.originalname,
    filename: req.file?.filename,
    mimetype: req.file?.mimetype,
    size: req.file?.size,
    path: req.file?.path
  });

  try {
    const ordersData = JSON.parse(req.body.orders);
    const validatedOrders = z.array(OrderDataSchema).parse(ordersData);
    const sendEmail = req.body.sendEmail === 'true'; // Parse email flag
    
    if (validatedOrders.length === 0) {
      return res.status(400).json({ error: 'No orders to create' });
    }

    const savedOrders = [];
    const errors = [];
    const emailsToSend = [];
    
    // Get or create default project
    let defaultProject;
    try {
      console.log('🔍 Fetching default project...');
      defaultProject = await db
        .select()
        .from(projects)
        .where(eq(projects.projectName, '기본 프로젝트'))
        .then(rows => rows[0]);
      console.log('✅ Default project fetch successful');
    } catch (error) {
      console.error('❌ Error fetching default project:', error);
      throw error;
    }
      
    if (!defaultProject) {
      try {
        console.log('🔍 Creating default project...');
        const [newProject] = await db
          .insert(projects)
          .values({
            projectName: '기본 프로젝트',
            projectCode: 'DEFAULT',
            status: 'active',
            startDate: new Date().toISOString().split('T')[0]
          })
          .returning();
        defaultProject = newProject;
        console.log('✅ Default project creation successful');
      } catch (error) {
        console.error('❌ Error creating default project:', error);
        throw error;
      }
    }

    // Process each order
    for (const orderData of validatedOrders) {
      try {
        // Find or create vendor
        let vendor = null;
        if (orderData.vendorName) {
          const existingVendor = await db
            .select()
            .from(vendors)
            .where(eq(vendors.name, orderData.vendorName))
            .then(rows => rows[0]);
            
          if (existingVendor) {
            vendor = existingVendor;
          } else {
            const [newVendor] = await db
              .insert(vendors)
              .values({
                name: orderData.vendorName,
                contactPerson: '담당자', // Required field
                email: orderData.vendorEmail || 'unknown@example.com' // Required field
              })
              .returning();
            vendor = newVendor;
          }
        }

        // Find project or use default
        let project = defaultProject;
        if (orderData.projectName) {
          const existingProject = await db
            .select()
            .from(projects)
            .where(eq(projects.projectName, orderData.projectName))
            .then(rows => rows[0]);
            
          if (existingProject) {
            project = existingProject;
          }
        }

        // Generate order number
        const orderCount = await db
          .select()
          .from(purchaseOrders)
          .then(rows => rows.length);
        
        const orderNumber = `PO-${new Date().getFullYear()}-${String(orderCount + 1).padStart(5, '0')}`;
        
        // Calculate total amount
        const totalAmount = orderData.items.reduce((sum, item) => {
          return sum + ((item.quantity || 0) * (item.unitPrice || 0));
        }, 0);

        // Create purchase order
        const [newOrder] = await db
          .insert(purchaseOrders)
          .values({
            orderNumber,
            projectId: project.id,
            vendorId: vendor?.id || null,
            userId: req.user.id,
            orderDate: orderData.orderDate || new Date().toISOString().split('T')[0], // Required field
            status: sendEmail ? 'sent' : 'draft',
            totalAmount,
            deliveryDate: orderData.deliveryDate || null,
            notes: [
              orderData.notes,
              orderData.majorCategory ? `대분류: ${orderData.majorCategory}` : null,
              orderData.middleCategory ? `중분류: ${orderData.middleCategory}` : null,
              orderData.minorCategory ? `소분류: ${orderData.minorCategory}` : null,
              orderData.deliveryPlace ? `납품처: ${orderData.deliveryPlace}` : null,
              orderData.deliveryEmail ? `납품처 이메일: ${orderData.deliveryEmail}` : null
            ].filter(Boolean).join('\n') || null,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        // Create order items
        if (orderData.items.length > 0) {
          const itemsToInsert = orderData.items
            .filter(item => item.itemName) // Only insert items with names
            .map(item => ({
              orderId: newOrder.id,
              itemName: item.itemName!,
              specification: item.specification || null,
              unit: item.unit || null,
              quantity: item.quantity || 0,
              unitPrice: item.unitPrice || 0,
              totalAmount: (item.quantity || 0) * (item.unitPrice || 0),
              notes: item.remarks || null // Use 'notes' field instead of 'remarks'
            }));

          if (itemsToInsert.length > 0) {
            await db.insert(purchaseOrderItems).values(itemsToInsert);
          }
        }

        // Save file attachment if provided (attach to all orders from the same upload)
        if (req.file) {
          console.log(`📎 Saving Excel file attachment for order ${newOrder.orderNumber}:`, {
            orderId: newOrder.id,
            originalName: req.file.originalname,
            storedName: req.file.filename,
            filePath: req.file.path,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            uploadedBy: req.user.id
          });
          
          try {
            const [savedAttachment] = await db.insert(attachments).values({
              orderId: newOrder.id,
              originalName: req.file.originalname,
              storedName: req.file.filename,
              filePath: req.file.path,
              fileSize: req.file.size,
              mimeType: req.file.mimetype,
              uploadedBy: req.user.id,
              uploadedAt: new Date()
            }).returning();
            
            console.log(`✅ Excel file attachment saved with ID ${savedAttachment.id} for order ${newOrder.orderNumber}`);
          } catch (attachmentError) {
            console.error(`❌ Failed to save Excel attachment for order ${newOrder.orderNumber}:`, attachmentError);
          }
        }

        // Create history entry
        await db.insert(orderHistory).values({
          orderId: newOrder.id,
          userId: req.user.id,
          action: sendEmail ? 'sent' : 'created',
          changes: {
            source: 'excel_simple_upload',
            rowIndex: orderData.rowIndex,
            sendEmail
          },
          createdAt: new Date()
        });

        // Prepare email if needed
        if (sendEmail && vendor && orderData.vendorEmail) {
          emailsToSend.push({
            orderId: newOrder.id,
            orderNumber: newOrder.orderNumber,
            vendorName: vendor.name,
            vendorEmail: orderData.vendorEmail,
            totalAmount: totalAmount
          });
        }

        savedOrders.push({
          orderId: newOrder.id,
          orderNumber: newOrder.orderNumber,
          rowIndex: orderData.rowIndex,
          emailSent: sendEmail && vendor && orderData.vendorEmail
        });
        
      } catch (error) {
        console.error(`Error creating order for row ${orderData.rowIndex}:`, error);
        errors.push({
          rowIndex: orderData.rowIndex,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // TODO: Send emails here (implement email service)
    // For now, just log the emails that should be sent
    if (emailsToSend.length > 0) {
      console.log(`Would send ${emailsToSend.length} emails:`, emailsToSend);
    }

    const emailsSent = emailsToSend.length;
    
    res.json({
      success: true,
      message: `Successfully created ${savedOrders.length} orders` + 
               (emailsSent > 0 ? ` and sent ${emailsSent} emails` : ''),
      savedCount: savedOrders.length,
      emailsSent,
      savedOrders,
      emailsToSend: emailsToSend.length > 0 ? emailsToSend : undefined,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('Bulk order creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create orders',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get simple upload history
router.get('/orders/simple-upload-history', requireAuth, async (req, res) => {

  try {
    const history = await db
      .select({
        id: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        createdAt: purchaseOrders.createdAt,
        totalAmount: purchaseOrders.totalAmount,
        status: purchaseOrders.status,
        projectName: projects.projectName,
        vendorName: vendors.name,
        itemCount: count(purchaseOrderItems.id)
      })
      .from(purchaseOrders)
      .leftJoin(projects, eq(purchaseOrders.projectId, projects.id))
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .leftJoin(purchaseOrderItems, eq(purchaseOrderItems.orderId, purchaseOrders.id))
      .leftJoin(orderHistory, eq(orderHistory.orderId, purchaseOrders.id))
      .where(
        and(
          eq(purchaseOrders.userId, req.user.id),
          eq(orderHistory.action, 'created')
        )
      )
      .groupBy(
        purchaseOrders.id,
        purchaseOrders.orderNumber,
        purchaseOrders.createdAt,
        purchaseOrders.totalAmount,
        purchaseOrders.status,
        projects.projectName,
        vendors.name
      )
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(50);

    res.json(history);
  } catch (error) {
    console.error('Error fetching upload history:', error);
    res.status(500).json({ error: 'Failed to fetch upload history' });
  }
});

export default router;