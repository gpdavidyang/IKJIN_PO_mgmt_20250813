import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import xlsx from 'xlsx';
import crypto from 'crypto';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  },
});

// Simple process endpoint
router.post('/process', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    // Simple duplicate detection using hash
    const hashes = new Set<string>();
    const duplicates: any[] = [];
    const validationErrors: any[] = [];

    data.forEach((row: any, index: number) => {
      // Create hash of the row
      const rowString = JSON.stringify(row);
      const hash = crypto.createHash('sha256').update(rowString).digest('hex');
      
      if (hashes.has(hash)) {
        duplicates.push({ row: index + 1, data: row });
      } else {
        hashes.add(hash);
      }

      // Simple validation
      if (!row['프로젝트명'] && !row['projectName']) {
        validationErrors.push({
          row: index + 1,
          field: 'projectName',
          error: 'Project name is required',
        });
      }
    });

    // Return results
    res.json({
      success: true,
      itemCount: data.length,
      duplicates: duplicates.length,
      validationErrors: validationErrors.length,
      summary: {
        totalRows: data.length,
        uniqueRows: hashes.size,
        duplicateRows: duplicates.length,
        errorRows: validationErrors.length,
      },
    });

  } catch (error: any) {
    console.error('Excel processing error:', error);
    res.status(500).json({
      error: 'Failed to process Excel file',
      message: error.message,
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'excel-smart-upload-simple' });
});

export default router;