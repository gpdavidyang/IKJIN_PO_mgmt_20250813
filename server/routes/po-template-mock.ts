import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { POTemplateProcessorMock } from '../utils/po-template-processor-mock.js';
import { MockDB } from '../utils/mock-db.js';

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
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Excel 파일만 업로드 가능합니다.'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// 간단한 인증 (Mock)
const requireAuth = (req: any, res: any, next: any) => {
  req.user = { id: 'mock-user-001' };
  next();
};

/**
 * PO Template 파일 업로드 및 파싱 (Mock DB 사용)
 */
router.post('/upload', requireAuth, upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
    }

    const filePath = req.file.path;
    
    // Input 시트 파싱
    const parseResult = POTemplateProcessorMock.parseInputSheet(filePath);
    
    if (!parseResult.success) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ 
        error: '파싱 실패', 
        details: parseResult.error 
      });
    }

    res.json({
      success: true,
      message: '파일 파싱 완료',
      data: {
        fileName: req.file.originalname,
        filePath,
        totalOrders: parseResult.totalOrders,
        totalItems: parseResult.totalItems,
        orders: parseResult.orders
      }
    });

  } catch (error) {
    console.error('PO Template 업로드 오류:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: '서버 오류', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * 파싱된 데이터를 Mock DB에 저장
 */
router.post('/save', requireAuth, async (req: any, res) => {
  try {
    const { orders } = req.body;
    
    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ error: '발주서 데이터가 누락되었습니다.' });
    }

    const saveResult = await POTemplateProcessorMock.saveToDatabase(orders, req.user.id);
    
    if (!saveResult.success) {
      return res.status(500).json({ 
        error: 'DB 저장 실패', 
        details: saveResult.error 
      });
    }

    res.json({
      success: true,
      message: 'Mock DB 저장 완료',
      data: {
        savedOrders: saveResult.savedOrders,
        dbStats: MockDB.getStats()
      }
    });

  } catch (error) {
    console.error('PO Template 저장 오류:', error);
    res.status(500).json({ 
      error: '서버 오류', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * 갑지/을지 시트 추출
 */
router.post('/extract-sheets', requireAuth, async (req: any, res) => {
  try {
    const { filePath, sheetNames = ['갑지', '을지'] } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: '파일 경로가 필요합니다.' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ error: '파일을 찾을 수 없습니다.' });
    }

    const timestamp = Date.now();
    const extractedPath = path.join(
      path.dirname(filePath),
      `extracted-${timestamp}.xlsx`
    );

    const extractResult = POTemplateProcessorMock.extractSheetsToFile(
      filePath,
      extractedPath,
      sheetNames
    );

    if (!extractResult.success) {
      return res.status(500).json({ 
        error: '시트 추출 실패', 
        details: extractResult.error 
      });
    }

    res.json({
      success: true,
      message: '시트 추출 완료',
      data: {
        extractedPath,
        extractedSheets: extractResult.extractedSheets
      }
    });

  } catch (error) {
    console.error('시트 추출 오류:', error);
    res.status(500).json({ 
      error: '서버 오류', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * 통합 처리 (Mock DB 사용)
 */
router.post('/process', requireAuth, upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
    }

    const filePath = req.file.path;
    
    // 1. Input 시트 파싱
    const parseResult = POTemplateProcessorMock.parseInputSheet(filePath);
    
    if (!parseResult.success) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ 
        error: '파싱 실패', 
        details: parseResult.error 
      });
    }

    // 2. Mock DB 저장
    const saveResult = await POTemplateProcessorMock.saveToDatabase(parseResult.orders, req.user.id);
    
    if (!saveResult.success) {
      fs.unlinkSync(filePath);
      return res.status(500).json({ 
        error: 'DB 저장 실패', 
        details: saveResult.error 
      });
    }

    // 3. 갑지/을지 시트 추출
    const timestamp = Date.now();
    const extractedPath = path.join(
      path.dirname(filePath),
      `extracted-${timestamp}.xlsx`
    );

    const extractResult = POTemplateProcessorMock.extractSheetsToFile(
      filePath,
      extractedPath,
      ['갑지', '을지']
    );

    res.json({
      success: true,
      message: 'PO Template 처리 완료 (Mock DB 사용)',
      data: {
        fileName: req.file.originalname,
        parsing: {
          totalOrders: parseResult.totalOrders,
          totalItems: parseResult.totalItems
        },
        database: {
          savedOrders: saveResult.savedOrders,
          dbStats: MockDB.getStats()
        },
        extraction: {
          extractedPath: extractResult.success ? extractedPath : null,
          extractedSheets: extractResult.extractedSheets
        }
      }
    });

  } catch (error) {
    console.error('PO Template 통합 처리 오류:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: '서버 오류', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * Mock DB 상태 조회
 */
router.get('/db-stats', requireAuth, (req: any, res) => {
  try {
    const stats = MockDB.getStats();
    const allData = MockDB.getAllData();
    
    res.json({
      success: true,
      data: {
        stats,
        sampleData: {
          recentVendors: allData.vendors.slice(-3),
          recentProjects: allData.projects.slice(-3),
          recentOrders: allData.purchaseOrders.slice(-3),
          recentItems: allData.purchaseOrderItems.slice(-3)
        }
      }
    });
    
  } catch (error) {
    console.error('DB 상태 조회 오류:', error);
    res.status(500).json({ 
      error: '서버 오류', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * Mock DB 초기화
 */
router.post('/reset-db', requireAuth, (req: any, res) => {
  try {
    MockDB.clear();
    
    res.json({
      success: true,
      message: 'Mock DB 초기화 완료',
      data: MockDB.getStats()
    });
    
  } catch (error) {
    console.error('DB 초기화 오류:', error);
    res.status(500).json({ 
      error: '서버 오류', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * 파일 다운로드
 */
router.get('/download/:filename', requireAuth, (req: any, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../../uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
    }

    res.download(filePath, (err) => {
      if (err) {
        console.error('파일 다운로드 오류:', err);
        res.status(500).json({ error: '파일 다운로드 실패' });
      }
    });

  } catch (error) {
    console.error('다운로드 오류:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

export default router;