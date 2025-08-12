import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAuth } from '../local-auth.js';
import { storage } from '../storage.js';

const router = Router();

// ES modules에서 __dirname 정의
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const extension = path.extname(originalName);
    const basename = path.basename(originalName, extension);
    cb(null, `${timestamp}-${basename}${extension}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel.sheet.macroEnabled.12', // .xlsm (대문자 E)
      'application/vnd.ms-excel.sheet.macroenabled.12', // .xlsm (소문자 e)
      'application/vnd.ms-excel' // .xls
    ];
    
    console.log('File upload attempt:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname
    });
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      console.log('File type not allowed:', file.mimetype);
      cb(new Error(`지원되지 않는 파일 형식입니다. 허용된 형식: ${allowedMimes.join(', ')}`), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB 제한
  }
});

// 테스트용 엔드포인트
router.get('/test', (req, res) => {
  res.json({ message: 'PO Template router is working!', timestamp: new Date() });
});

// 간단한 업로드 엔드포인트
router.post('/upload', requireAuth, upload.single('file'), async (req: any, res) => {
  try {
    console.log('📁 파일 업로드 요청:', {
      user: req.user?.email,
      file: req.file ? {
        originalname: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      } : null
    });

    if (!req.file) {
      return res.status(400).json({ 
        error: '파일이 업로드되지 않았습니다.',
        success: false 
      });
    }

    // 클라이언트가 기대하는 형태로 응답
    res.json({
      success: true,
      message: '파일 업로드 성공',
      data: {
        fileName: req.file.filename,
        originalName: req.file.originalname,
        filePath: req.file.path,
        size: req.file.size,
        uploadTime: new Date(),
        // Mock 데이터 - 추후 실제 파싱으로 대체 예정
        totalOrders: 1,
        totalItems: 5,
        orders: [
          {
            orderNumber: 'PO-2025-TEST-001',
            vendorName: '테스트 거래처',
            totalAmount: 1000000,
            items: [
              { itemName: '테스트 품목 1', quantity: 10, unitPrice: 50000 },
              { itemName: '테스트 품목 2', quantity: 5, unitPrice: 100000 }
            ]
          }
        ]
      }
    });

  } catch (error) {
    console.error('❌ 파일 업로드 오류:', error);
    res.status(500).json({ 
      error: '파일 업로드 중 오류가 발생했습니다.',
      success: false,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 데이터베이스 저장 엔드포인트
router.post('/save', requireAuth, async (req: any, res) => {
  try {
    console.log('💾 데이터베이스 저장 요청:', {
      user: req.user?.email,
      ordersCount: req.body.orders?.length
    });

    const { orders } = req.body;
    
    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({
        error: '유효하지 않은 발주서 데이터입니다.',
        success: false
      });
    }

    // TODO: 실제 데이터베이스 저장 구현
    // 현재는 Mock 응답만 반환
    
    res.json({
      success: true,
      message: '데이터베이스 저장 성공',
      data: {
        savedOrders: orders.length,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('❌ 데이터베이스 저장 오류:', error);
    res.status(500).json({
      error: '데이터베이스 저장 중 오류가 발생했습니다.',
      success: false,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 시트 추출 엔드포인트
router.post('/extract-sheets', requireAuth, async (req: any, res) => {
  try {
    console.log('📄 시트 추출 요청:', {
      user: req.user?.email,
      filePath: req.body.filePath
    });

    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({
        error: '파일 경로가 제공되지 않았습니다.',
        success: false
      });
    }

    // TODO: 실제 시트 추출 구현
    // 현재는 Mock 응답만 반환
    
    res.json({
      success: true,
      message: '시트 추출 성공',
      data: {
        extractedSheets: ['발주서1', '발주서2', '발주서3'],
        filePath: filePath,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('❌ 시트 추출 오류:', error);
    res.status(500).json({
      error: '시트 추출 중 오류가 발생했습니다.',
      success: false,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;