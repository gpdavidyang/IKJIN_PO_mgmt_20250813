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

// Define STRICT field mappings - MUST BE DEFINED BEFORE USE
const standardFieldMappings: Record<string, string> = {
  // Standard template fields only
  '발주일자': 'orderDate',
  '납기일자': 'deliveryDate',
  '거래처명': 'vendorName',
  '거래처 이메일': 'vendorEmail',
  '납품처명': 'deliveryLocation',
  '납품처 이메일': 'deliveryEmail',
  '프로젝트명': 'projectName',
  '품목명': 'itemName',
  '규격': 'specification',
  '수량': 'quantity',
  '단가': 'unitPrice',
  '총금액': 'totalAmount',
  '대분류': 'majorCategory',
  '중분류': 'middleCategory',
  '소분류': 'minorCategory',
  '비고': 'notes'
};

// Required fields for validation - MUST BE DEFINED BEFORE USE
const requiredStandardFields = ['거래처명', '프로젝트명', '품목명'];
const emailFields = ['거래처 이메일', '납품처 이메일'];
const numberFields = ['수량', '단가', '총금액'];

// Simple process endpoint
router.post('/process', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No file uploaded' 
      });
    }

    console.log('=== Excel Smart Upload Processing Started ===');
    console.log('File received:', req.file.originalname);
    console.log('File size:', req.file.size, 'bytes');

    // Parse Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    
    // Find the correct sheet (Input or first available)
    let sheetName = workbook.SheetNames.find(name => 
      name === 'Input' || name.toLowerCase().includes('input')
    ) || workbook.SheetNames[0];
    
    console.log('Available sheets:', workbook.SheetNames);
    console.log('Processing sheet:', sheetName);
    
    const worksheet = workbook.Sheets[sheetName];
    
    // Get raw data with headers
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (!rawData || rawData.length === 0) {
      return res.status(400).json({
        success: false,
        error: '빈 Excel 파일',
        message: 'Excel 파일에 데이터가 없습니다.'
      });
    }
    
    const headers = rawData[0] || [];
    console.log('Headers found:', headers);
    console.log('First data row:', rawData[1]);
    
    // ===== CRITICAL: Field validation MUST happen here =====
    const missingFields: string[] = [];
    const incorrectFields: string[] = [];
    
    // Check for required standard fields
    console.log('Checking required fields:', requiredStandardFields);
    requiredStandardFields.forEach(field => {
      if (!headers.includes(field)) {
        missingFields.push(field);
        console.log(`Missing required field: ${field}`);
      }
    });
    
    // Check for incorrect field names
    headers.forEach((header: any) => {
      if (header && typeof header === 'string' && header.trim()) {
        // Skip empty headers
        if (!standardFieldMappings[header as keyof typeof standardFieldMappings]) {
          // Common incorrect field names with helpful messages
          if (header === '발주일' || header === '납기일') {
            incorrectFields.push(`${header} → 정확한 필드명: ${header}자`);
          } else if (header === '현장명') {
            incorrectFields.push(`${header} → 정확한 필드명: 프로젝트명`);
          } else if (header === '품목') {
            incorrectFields.push(`${header} → 정확한 필드명: 품목명`);
          } else if (header === '거래처') {
            incorrectFields.push(`${header} → 정확한 필드명: 거래처명`);
          } else if (header === '합계') {
            incorrectFields.push(`${header} → 정확한 필드명: 총금액`);
          } else if (header === '공급가액' || header === '부가세') {
            // These fields should be removed, not renamed
            incorrectFields.push(`${header} → 이 필드는 제거하고 '총금액'만 사용하세요`);
          } else if (header === '발주번호' || header === '단위') {
            // These fields are not in template
            incorrectFields.push(`${header} → 표준 템플릿에 없는 필드입니다`);
          }
        }
      }
    });
    
    console.log('Missing fields:', missingFields);
    console.log('Incorrect fields:', incorrectFields);
    
    // If there are field errors, return detailed error response
    if (missingFields.length > 0 || incorrectFields.length > 0) {
      const errorResponse = {
        success: false,
        error: 'Excel 필드명 오류',
        fieldErrors: {
          missing: missingFields,
          incorrect: incorrectFields
        },
        message: `Excel 파일의 필드명이 표준 형식과 일치하지 않습니다.\n\n` +
                 (missingFields.length > 0 ? `❌ 필수 필드 누락:\n${missingFields.map(f => `  • ${f}`).join('\n')}\n\n` : '') +
                 (incorrectFields.length > 0 ? `⚠️ 잘못된 필드명:\n${incorrectFields.map(f => `  • ${f}`).join('\n')}\n\n` : '') +
                 `📥 표준 템플릿을 다운로드하여 정확한 필드명을 사용해주세요.`,
        templateUrl: '/api/excel-template/download'
      };
      
      console.log('Returning field validation error:', errorResponse);
      return res.status(400).json(errorResponse);
    }
    
    console.log('Field validation passed! Continuing with data processing...');
    
    // Convert to JSON with proper header mapping
    const data = xlsx.utils.sheet_to_json(worksheet);
    console.log('Total data rows:', data.length);
    console.log('First parsed row:', data[0]);

    // Enhanced validation and processing
    const hashes = new Set<string>();
    const duplicates: any[] = [];
    const validationResults: any[] = [];
    const processedData: any[] = [];

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

      // Validate required standard fields
      requiredStandardFields.forEach(field => {
        if (!row[field] || !row[field].toString().trim()) {
          errors.push(`${field}이(가) 필요합니다`);
          status = 'error';
        }
      });

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
      if (row['거래처명']) {
        const vendor = row['거래처명'];
        // Simulate vendor validation
        if (vendor && vendor.toString().includes('테스트')) {
          warnings.push('테스트 거래처입니다');
          if (status === 'valid') status = 'warning';
        }
      }

      // Build processed row with standard field mappings only
      const mappedRow: any = {};
      
      // Only map standard field names
      Object.keys(row).forEach(key => {
        const mappedKey = standardFieldMappings[key as keyof typeof standardFieldMappings];
        if (mappedKey) {
          mappedRow[mappedKey] = row[key];
        }
        // Keep original field for display
        mappedRow[key] = row[key];
      });
      
      const processedRow = {
        id: `row_${rowNumber}`,
        rowNumber,
        status,
        errors,
        warnings,
        ...mappedRow
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

    console.log('Processing complete!');
    console.log(`Valid: ${validCount}, Warning: ${warningCount}, Error: ${errorCount}`);

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
        columns: Object.keys(data[0] || {}).map(key => {
          // Only use standard field mappings
          const mappedKey = standardFieldMappings[key as keyof typeof standardFieldMappings] || key;
          return {
            key: mappedKey,
            label: key,  // Keep original Korean label for display
            type: numberFields.includes(key) ? 'number' : 
                  emailFields.includes(key) ? 'email' : 'text',
            editable: true
          };
        })
      }
    });

  } catch (error: any) {
    console.error('Excel processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process Excel file',
      message: error.message || '파일 처리 중 오류가 발생했습니다.',
      fieldErrors: null
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'excel-smart-upload-simple',
    fieldValidation: 'enabled',
    requiredFields: requiredStandardFields
  });
});

export default router;