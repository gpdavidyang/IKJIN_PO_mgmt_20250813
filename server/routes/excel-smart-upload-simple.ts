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

    // Enhanced validation and processing
    const hashes = new Set<string>();
    const duplicates: any[] = [];
    const validationResults: any[] = [];
    const processedData: any[] = [];
    
    // Define required fields and validation rules
    const requiredFields = ['프로젝트명', 'projectName'];
    const emailFields = ['이메일', 'email', 'vendorEmail'];
    const numberFields = ['수량', 'quantity', '단가', 'unitPrice', '금액', 'amount'];

    data.forEach((row: any, index: number) => {
      const rowNumber = index + 1;
      const errors: string[] = [];
      const warnings: string[] = [];
      let status: 'valid' | 'warning' | 'error' = 'valid';

      // Create hash of the row for duplicate detection
      const rowString = JSON.stringify(row);
      const hash = crypto.createHash('sha256').update(rowString).digest('hex');
      
      if (hashes.has(hash)) {
        warnings.push(`중복된 데이터 (동일한 내용이 이미 존재)`);
        duplicates.push({ row: rowNumber, data: row });
        status = 'warning';
      } else {
        hashes.add(hash);
      }

      // Validate required fields
      const hasProjectName = requiredFields.some(field => row[field] && row[field].toString().trim());
      if (!hasProjectName) {
        errors.push('프로젝트명이 필요합니다');
        status = 'error';
      }

      // Validate email fields
      emailFields.forEach(field => {
        if (row[field]) {
          const email = row[field].toString().trim();
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            errors.push(`${field}: 유효하지 않은 이메일 형식`);
            status = 'error';
          }
        }
      });

      // Validate number fields
      numberFields.forEach(field => {
        if (row[field]) {
          const value = row[field];
          if (isNaN(Number(value))) {
            errors.push(`${field}: 숫자가 아닌 값`);
            status = 'error';
          }
        }
      });

      // Check for vendor validation
      if (row['거래처'] || row['vendor']) {
        const vendor = row['거래처'] || row['vendor'];
        // Simulate vendor validation
        if (vendor && vendor.toString().includes('테스트')) {
          warnings.push('테스트 거래처입니다');
          if (status === 'valid') status = 'warning';
        }
      }

      // Build processed row
      const processedRow = {
        id: `row_${rowNumber}`,
        rowNumber,
        status,
        errors,
        warnings,
        ...row
      };

      processedData.push(processedRow);
      
      if (errors.length > 0) {
        validationResults.push({
          row: rowNumber,
          type: 'error',
          messages: errors
        });
      }
      
      if (warnings.length > 0) {
        validationResults.push({
          row: rowNumber,
          type: 'warning',
          messages: warnings
        });
      }
    });

    // Calculate statistics
    const validCount = processedData.filter(r => r.status === 'valid').length;
    const warningCount = processedData.filter(r => r.status === 'warning').length;
    const errorCount = processedData.filter(r => r.status === 'error').length;

    // Return enhanced results
    res.json({
      success: true,
      itemCount: data.length,
      duplicates: duplicates.length,
      validationErrors: errorCount,
      summary: {
        totalRows: data.length,
        uniqueRows: hashes.size,
        duplicateRows: duplicates.length,
        errorRows: errorCount,
        warningRows: warningCount,
        validRows: validCount,
      },
      statusCounts: {
        valid: validCount,
        warning: warningCount,
        error: errorCount
      },
      details: {
        processedData: processedData.slice(0, 100), // Limit to first 100 rows for performance
        validationResults,
        duplicates,
        columns: Object.keys(data[0] || {}).map(key => ({
          key,
          label: key,
          type: numberFields.includes(key) ? 'number' : 
                emailFields.includes(key) ? 'email' : 'text',
          editable: true
        }))
      }
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