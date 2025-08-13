import { Router } from 'express';
import { requireAuth } from '../local-auth';
import { ImportExportService } from '../utils/import-export-service';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel and CSV files are allowed.'));
    }
  }
});

const router = Router();

// Helper function to determine file type
const getFileType = (filename: string): 'excel' | 'csv' => {
  const ext = path.extname(filename).toLowerCase();
  return ext === '.csv' ? 'csv' : 'excel';
};

// Import vendors
router.post('/import/vendors', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileType = getFileType(req.file.filename);
    const result = await ImportExportService.importVendors(req.file.path, fileType);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      message: 'Vendor import completed',
      imported: result.imported,
      errors: result.errors,
      totalRows: result.imported + result.errors.length
    });
  } catch (error) {
    console.error('Error importing vendors:', error);
    res.status(500).json({ error: 'Failed to import vendors' });
  }
});

// Import items
router.post('/import/items', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileType = getFileType(req.file.filename);
    const result = await ImportExportService.importItems(req.file.path, fileType);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      message: 'Item import completed',
      imported: result.imported,
      errors: result.errors,
      totalRows: result.imported + result.errors.length
    });
  } catch (error) {
    console.error('Error importing items:', error);
    res.status(500).json({ error: 'Failed to import items' });
  }
});

// Import projects
router.post('/import/projects', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileType = getFileType(req.file.filename);
    const result = await ImportExportService.importProjects(req.file.path, fileType);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      message: 'Project import completed',
      imported: result.imported,
      errors: result.errors,
      totalRows: result.imported + result.errors.length
    });
  } catch (error) {
    console.error('Error importing projects:', error);
    res.status(500).json({ error: 'Failed to import projects' });
  }
});

// Import purchase orders
router.post('/import/purchase_orders', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileType = getFileType(req.file.filename);
    const result = await ImportExportService.importPurchaseOrders(req.file.path, fileType);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      message: 'Purchase order import completed',
      imported: result.imported,
      errors: result.errors,
      totalRows: result.imported + result.errors.length
    });
  } catch (error) {
    console.error('Error importing purchase orders:', error);
    res.status(500).json({ error: 'Failed to import purchase orders' });
  }
});

// Export vendors
router.get('/export/vendors', requireAuth, async (req, res) => {
  try {
    const format = (req.query.format as string || 'excel') as 'excel' | 'csv';
    const buffer = await ImportExportService.exportVendors(format);

    const filename = `vendors_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
    const contentType = format === 'csv' 
      ? 'text/csv; charset=utf-8' 
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting vendors:', error);
    res.status(500).json({ error: 'Failed to export vendors' });
  }
});

// Export items
router.get('/export/items', requireAuth, async (req, res) => {
  try {
    const format = (req.query.format as string || 'excel') as 'excel' | 'csv';
    const buffer = await ImportExportService.exportItems(format);

    const filename = `items_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
    const contentType = format === 'csv' 
      ? 'text/csv; charset=utf-8' 
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting items:', error);
    res.status(500).json({ error: 'Failed to export items' });
  }
});

// Export projects
router.get('/export/projects', requireAuth, async (req, res) => {
  try {
    const format = (req.query.format as string || 'excel') as 'excel' | 'csv';
    const buffer = await ImportExportService.exportProjects(format);

    const filename = `projects_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
    const contentType = format === 'csv' 
      ? 'text/csv; charset=utf-8' 
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting projects:', error);
    res.status(500).json({ error: 'Failed to export projects' });
  }
});

// Export purchase orders
router.get('/export/purchase_orders', requireAuth, async (req, res) => {
  try {
    const format = (req.query.format as string || 'excel') as 'excel' | 'csv';
    const buffer = await ImportExportService.exportPurchaseOrders(format);

    const filename = `purchase_orders_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
    const contentType = format === 'csv' 
      ? 'text/csv; charset=utf-8' 
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting purchase orders:', error);
    res.status(500).json({ error: 'Failed to export purchase orders' });
  }
});

// Download import template
router.get('/template/:entity', requireAuth, async (req, res) => {
  try {
    const entity = req.params.entity as 'vendors' | 'items' | 'projects' | 'purchase_orders';
    const format = (req.query.format as string || 'excel') as 'excel' | 'csv';

    if (!['vendors', 'items', 'projects', 'purchase_orders'].includes(entity)) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    const buffer = ImportExportService.generateImportTemplate(entity, format);

    const filename = `${entity}_template.${format === 'csv' ? 'csv' : 'xlsx'}`;
    const contentType = format === 'csv' 
      ? 'text/csv; charset=utf-8' 
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({ error: 'Failed to generate template' });
  }
});

export default router;