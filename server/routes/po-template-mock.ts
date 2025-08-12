import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { POTemplateProcessorMock } from '../utils/po-template-processor-mock';
import { MockDB } from '../utils/mock-db';
import { db } from '../db';
import { purchaseOrders, purchaseOrderItems, vendors, projects } from '@shared/schema';
import { eq } from 'drizzle-orm';

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
      console.log('File accepted:', file.mimetype);
      cb(null, true);
    } else {
      console.error('File rejected - Invalid mimetype:', file.mimetype);
      console.error('Allowed mimetypes:', allowedMimes);
      cb(new Error(`Excel 파일만 업로드 가능합니다. (받은 타입: ${file.mimetype})`));
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
    console.error('File info:', {
      originalname: req.file?.originalname,
      mimetype: req.file?.mimetype,
      size: req.file?.size,
      path: req.file?.path
    });
    
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

    // 실제 DB에 저장 시도
    if (db) {
      try {
        let savedOrders = 0;
        
        for (const orderData of orders) {
          // 1. 거래처 조회 또는 생성
          const vendor = await db.select().from(vendors)
            .where(eq(vendors.name, orderData.vendorName))
            .limit(1);
          
          let vendorId;
          
          if (vendor.length === 0) {
            // 새 거래처 생성
            const newVendor = await db.insert(vendors).values({
              name: orderData.vendorName,
              contactPerson: '자동생성',
              mainContact: '자동생성',
              email: `vendor-${Date.now()}@example.com`,
              phone: '000-0000-0000',
              address: '주소 미입력',
            }).returning();
            vendorId = newVendor[0].id;
          } else {
            vendorId = vendor[0].id;
          }
          
          // 2. 프로젝트 조회 또는 생성
          const project = await db.select().from(projects)
            .where(eq(projects.projectName, orderData.siteName))
            .limit(1);
          
          let projectId;
          
          if (project.length === 0) {
            const newProject = await db.insert(projects).values({
              projectName: orderData.siteName,
              projectCode: `AUTO-${Date.now().toString().slice(-8)}`,
              status: 'active'
            }).returning();
            projectId = newProject[0].id;
          } else {
            projectId = project[0].id;
          }
          
          // 3. 발주서 생성
          console.log(`💾 Creating order: ${orderData.orderNumber}, user: ${req.user.id}, vendor: ${vendorId}, project: ${projectId}`);
          
          const newOrder = await db.insert(purchaseOrders).values({
            orderNumber: orderData.orderNumber,
            projectId,
            vendorId,
            userId: req.user.id,
            orderDate: new Date(orderData.orderDate),
            deliveryDate: orderData.dueDate ? new Date(orderData.dueDate) : null,
            totalAmount: orderData.totalAmount,
            status: 'draft',
            notes: 'PO Template에서 자동 생성됨'
          }).returning();
          
          const orderId = newOrder[0].id;
          console.log(`✅ Order created with ID: ${orderId}`);
          
          // 4. 발주서 아이템들 생성
          for (const item of orderData.items) {
            await db.insert(purchaseOrderItems).values({
              orderId,
              itemName: item.itemName,
              specification: item.specification,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalAmount: item.totalAmount,
              categoryLv1: item.categoryLv1,
              categoryLv2: item.categoryLv2,
              categoryLv3: item.categoryLv3,
              supplyAmount: item.supplyAmount,
              taxAmount: item.taxAmount,
              deliveryName: item.deliveryName,
              notes: item.notes
            });
          }
          
          savedOrders++;
        }
        
        console.log(`✅ 실제 DB에 ${savedOrders}개의 발주서 저장 완료`);
        
        res.json({
          success: true,
          message: '실제 DB 저장 완료',
          data: {
            savedOrders,
            usingMockDB: false
          }
        });
        
      } catch (dbError) {
        console.error('실제 DB 저장 실패, Mock DB로 폴백:', dbError);
        
        // Mock DB로 폴백
        const mockResult = await POTemplateProcessorMock.saveToDatabase(orders, req.user.id);
        
        if (!mockResult.success) {
          return res.status(500).json({ 
            error: 'Mock DB 저장도 실패', 
            details: mockResult.error 
          });
        }
        
        res.json({
          success: true,
          message: 'Mock DB 저장 완료 (실제 DB 연결 실패)',
          data: {
            savedOrders: mockResult.savedOrders,
            usingMockDB: true,
            dbError: dbError instanceof Error ? dbError.message : 'Unknown error'
          }
        });
      }
    } else {
      // DB 연결이 없는 경우 Mock DB 사용
      const mockResult = await POTemplateProcessorMock.saveToDatabase(orders, req.user.id);
      
      if (!mockResult.success) {
        return res.status(500).json({ 
          error: 'Mock DB 저장 실패', 
          details: mockResult.error 
        });
      }
      
      res.json({
        success: true,
        message: 'Mock DB 저장 완료 (DB 연결 없음)',
        data: {
          savedOrders: mockResult.savedOrders,
          usingMockDB: true
        }
      });
    }

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
    console.log('======== EXTRACT-SHEETS ROUTE CALLED ========');
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

    const extractResult = await POTemplateProcessorMock.extractSheetsToFile(
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

    const extractResult = await POTemplateProcessorMock.extractSheetsToFile(
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