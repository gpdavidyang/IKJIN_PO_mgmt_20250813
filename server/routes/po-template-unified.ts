import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { POTemplateProcessorMock } from '../utils/po-template-processor-mock.js';
import { DebugLogger } from '../utils/debug-logger.js';
import { MockDB } from '../utils/mock-db.js';
import { POEmailServiceMock } from '../utils/po-email-service-mock.js';
import { convertExcelToPdfMock } from '../utils/excel-to-pdf-mock.js';
import { POTemplateValidator } from '../utils/po-template-validator.js';
import { ExcelAutomationService } from '../utils/excel-automation-service.js';
import { db } from '../db.js';
import { purchaseOrders, purchaseOrderItems, vendors, projects } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// ES modules에서 __dirname 정의
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경 감지 함수
const isProductionEnvironment = () => {
  return process.env.NODE_ENV === 'production' && db !== null;
};

// 통합 파일 업로드 설정
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
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Excel 파일만 업로드 가능합니다.'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// 통합 인증 미들웨어
const requireAuth = (req: any, res: any, next: any) => {
  if (process.env.NODE_ENV === 'development') {
    req.user = { id: isProductionEnvironment() ? 'prod_admin_001' : 'mock-user-001' };
    return next();
  }
  
  if (req.session && req.session.userId) {
    req.user = { id: req.session.userId };
    return next();
  }
  
  return res.status(401).json({ error: '인증이 필요합니다.' });
};

/**
 * 환경 상태 확인
 */
router.get('/environment', requireAuth, async (req: any, res) => {
  try {
    const isProduction = isProductionEnvironment();
    let dbStatus = 'disconnected';
    
    if (db) {
      try {
        await db.select().from(vendors).limit(1);
        dbStatus = 'connected';
      } catch (error) {
        dbStatus = 'error';
      }
    }
    
    res.json({
      success: true,
      data: {
        environment: process.env.NODE_ENV || 'development',
        isProduction,
        dbStatus,
        usingMockDB: !isProduction,
        features: {
          realDatabase: isProduction,
          mockDatabase: !isProduction,
          emailService: true,
          pdfGeneration: true,
          excelProcessing: true
        }
      }
    });
  } catch (error) {
    console.error('환경 상태 확인 오류:', error);
    res.status(500).json({
      error: '환경 상태 확인 실패',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PO Template 파일 업로드 및 파싱 (환경 자동 감지)
 */
router.post('/upload', requireAuth, upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
    }

    const filePath = req.file.path;
    const isProduction = isProductionEnvironment();
    
    // Step 0: 사전 검증 (모든 환경에서 공통)
    console.log('🔍 Step 0: Excel 파일 사전 검증 시작');
    const preValidation = await ExcelAutomationService.preValidateExcel(filePath);
    
    if (!preValidation.success) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        error: 'Excel 파일 검증 실패',
        details: preValidation.errors.join('\n'),
        warnings: preValidation.warnings
      });
    }

    // 경고사항 로깅
    if (preValidation.warnings.length > 0) {
      console.log('⚠️ Excel 검증 경고사항:');
      preValidation.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    // 1. 빠른 유효성 검사
    const quickValidation = await POTemplateValidator.quickValidate(filePath);
    if (!quickValidation.isValid) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ 
        error: '파일 유효성 검사 실패', 
        details: quickValidation.errors.join(', '),
        validation: quickValidation
      });
    }

    // 2. Input 시트 파싱
    const parseResult = POTemplateProcessorMock.parseInputSheet(filePath);
    
    if (!parseResult.success) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ 
        error: '파싱 실패', 
        details: parseResult.error 
      });
    }

    // 3. 상세 유효성 검사
    const detailedValidation = await POTemplateValidator.validatePOTemplateFile(filePath);
    
    res.json({
      success: true,
      message: '파일 파싱 완료',
      data: {
        fileName: req.file.originalname,
        filePath,
        totalOrders: parseResult.totalOrders,
        totalItems: parseResult.totalItems,
        orders: parseResult.orders,
        validation: {
          preValidation,
          quickValidation,
          detailedValidation
        },
        environment: {
          isProduction,
          usingMockDB: !isProduction
        }
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
 * 데이터베이스 저장 (환경 자동 감지)
 */
router.post('/save', requireAuth, async (req: any, res) => {
  try {
    const { orders } = req.body;
    
    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ error: '발주서 데이터가 누락되었습니다.' });
    }

    const isProduction = isProductionEnvironment();
    
    if (isProduction) {
      // 실제 DB에 저장
      const saveResult = await saveToRealDatabase(orders, req.user.id);
      res.json({
        success: true,
        message: '실제 DB 저장 완료',
        data: {
          ...saveResult,
          usingMockDB: false
        }
      });
    } else {
      // Mock DB에 저장
      const mockResult = await POTemplateProcessorMock.saveToDatabase(orders, req.user.id);
      
      if (!mockResult.success) {
        return res.status(500).json({ 
          error: 'Mock DB 저장 실패', 
          details: mockResult.error 
        });
      }
      
      res.json({
        success: true,
        message: 'Mock DB 저장 완료',
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
  DebugLogger.logExecutionPath('/api/po-template/extract-sheets', 'POTemplateProcessorMock.extractSheetsToFile');
  
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
 * 통계 조회 (환경 자동 감지)
 */
router.get('/statistics', requireAuth, async (req: any, res) => {
  try {
    const isProduction = isProductionEnvironment();
    
    if (isProduction) {
      try {
        // 실제 DB에서 통계 조회
        const [vendorCount, projectCount, orderCount, itemCount] = await Promise.all([
          db.select().from(vendors),
          db.select().from(projects),
          db.select().from(purchaseOrders),
          db.select().from(purchaseOrderItems)
        ]);
        
        res.json({
          success: true,
          data: {
            stats: {
              vendors: vendorCount.length,
              projects: projectCount.length,
              purchaseOrders: orderCount.length,
              purchaseOrderItems: itemCount.length
            },
            sampleData: {
              recentVendors: vendorCount.slice(-3),
              recentProjects: projectCount.slice(-3),
              recentOrders: orderCount.slice(-3)
            },
            usingMockDB: false
          }
        });
        
      } catch (dbError) {
        // DB 오류 시 Mock으로 폴백
        const mockStats = getMockStatistics();
        res.json({
          success: true,
          data: {
            ...mockStats,
            usingMockDB: true,
            dbError: dbError instanceof Error ? dbError.message : 'Unknown error'
          }
        });
      }
    } else {
      // Mock DB 통계
      const mockStats = getMockStatistics();
      res.json({
        success: true,
        data: {
          ...mockStats,
          usingMockDB: true
        }
      });
    }
    
  } catch (error) {
    console.error('통계 조회 오류:', error);
    res.status(500).json({ 
      error: '서버 오류', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * 이메일 발송
 */
router.post('/send-email', requireAuth, async (req: any, res) => {
  try {
    const { 
      filePath, 
      to, 
      cc, 
      bcc, 
      subject, 
      orderNumber, 
      vendorName, 
      orderDate, 
      dueDate, 
      totalAmount, 
      additionalMessage 
    } = req.body;

    // 필수 필드 검증
    if (!filePath || !to || !subject) {
      return res.status(400).json({ 
        error: '필수 데이터가 누락되었습니다. (filePath, to, subject 필수)' 
      });
    }

    // 파일 존재 확인
    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ error: '파일을 찾을 수 없습니다.' });
    }

    // 이메일 서비스 인스턴스 생성 (Mock 모드)
    const emailService = new POEmailServiceMock();

    // 이메일 발송
    const emailResult = await emailService.sendPOWithAttachments(filePath, {
      to,
      cc,
      bcc,
      subject,
      orderNumber,
      vendorName,
      orderDate,
      dueDate,
      totalAmount,
      additionalMessage
    });

    if (!emailResult.success) {
      return res.status(500).json({ 
        error: '이메일 발송 실패', 
        details: emailResult.error 
      });
    }

    res.json({
      success: true,
      message: emailResult.mockMode ? '이메일 발송 완료 (Mock 모드)' : '이메일 발송 완료',
      data: {
        messageId: emailResult.messageId,
        recipients: Array.isArray(to) ? to : [to],
        attachments: ['갑지/을지 시트 (Excel)', '갑지/을지 시트 (PDF)'],
        mockMode: emailResult.mockMode
      }
    });

  } catch (error) {
    console.error('이메일 발송 오류:', error);
    res.status(500).json({ 
      error: '서버 오류', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * PDF 변환
 */
router.post('/convert-to-pdf', requireAuth, async (req: any, res) => {
  try {
    const { filePath, outputPath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: '파일 경로가 필요합니다.' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ error: '파일을 찾을 수 없습니다.' });
    }

    // PDF 변환
    const timestamp = Date.now();
    const pdfPath = outputPath || path.join(
      path.dirname(filePath),
      `po-sheets-${timestamp}.pdf`
    );

    const pdfResult = await convertExcelToPdfMock(filePath, pdfPath, ['갑지', '을지']);

    if (!pdfResult.success) {
      return res.status(500).json({ 
        error: 'PDF 변환 실패', 
        details: pdfResult.error 
      });
    }

    res.json({
      success: true,
      message: 'PDF 변환 완료',
      data: {
        pdfPath: pdfResult.pdfPath,
        originalFile: filePath,
        convertedSheets: ['갑지', '을지']
      }
    });

  } catch (error) {
    console.error('PDF 변환 오류:', error);
    res.status(500).json({ 
      error: '서버 오류', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * 통합 처리 워크플로우
 */
router.post('/process-complete', requireAuth, upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
    }

    const filePath = req.file.path;
    const { 
      sendEmail, 
      emailTo, 
      emailSubject, 
      emailMessage,
      generatePDF 
    } = req.body;

    const isProduction = isProductionEnvironment();
    const results = {
      upload: { success: true, fileName: req.file.originalname },
      validation: null,
      parsing: null,
      saving: null,
      extraction: null,
      pdf: null,
      email: null
    };

    // 1. 검증 및 파싱
    console.log('📁 1단계: 파일 검증 및 파싱');
    const validation = await POTemplateValidator.validatePOTemplateFile(filePath);
    results.validation = validation;

    if (!validation.isValid) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ 
        error: '유효성 검사 실패', 
        details: validation.errors.join(', '),
        results
      });
    }

    const parseResult = POTemplateProcessorMock.parseInputSheet(filePath);
    results.parsing = parseResult;

    if (!parseResult.success) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ 
        error: '파싱 실패', 
        details: parseResult.error,
        results
      });
    }

    // 2. 데이터베이스 저장
    console.log('💾 2단계: 데이터베이스 저장');
    if (isProduction) {
      results.saving = await saveToRealDatabase(parseResult.orders, req.user.id);
    } else {
      results.saving = await POTemplateProcessorMock.saveToDatabase(parseResult.orders, req.user.id);
    }

    // 3. 시트 추출
    console.log('📋 3단계: 갑지/을지 시트 추출');
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
    results.extraction = extractResult;

    // 4. PDF 변환 (옵션)
    if (generatePDF && extractResult.success) {
      console.log('📄 4단계: PDF 변환');
      const pdfPath = path.join(
        path.dirname(filePath),
        `po-sheets-${timestamp}.pdf`
      );
      
      const pdfResult = await convertExcelToPdfMock(extractedPath, pdfPath);
      results.pdf = pdfResult;
    }

    // 5. 이메일 발송 (옵션)
    if (sendEmail && emailTo && emailSubject && extractResult.success) {
      console.log('📧 5단계: 이메일 발송');
      const emailService = new POEmailServiceMock();
      
      const emailResult = await emailService.sendPOWithAttachments(extractedPath, {
        to: emailTo,
        subject: emailSubject,
        orderNumber: parseResult.orders[0]?.orderNumber,
        vendorName: parseResult.orders[0]?.vendorName,
        orderDate: parseResult.orders[0]?.orderDate,
        dueDate: parseResult.orders[0]?.dueDate,
        totalAmount: parseResult.orders[0]?.totalAmount,
        additionalMessage: emailMessage
      });
      
      results.email = emailResult;
    }

    console.log('✅ 통합 처리 완료');

    res.json({
      success: true,
      message: 'PO Template 통합 처리 완료',
      data: {
        fileName: req.file.originalname,
        environment: {
          isProduction,
          usingMockDB: !isProduction
        },
        results,
        summary: {
          totalOrders: parseResult.totalOrders,
          totalItems: parseResult.totalItems,
          validationPassed: validation.isValid,
          savedToDatabase: results.saving.success,
          sheetsExtracted: extractResult.success,
          pdfGenerated: results.pdf?.success || false,
          emailSent: results.email?.success || false
        }
      }
    });

  } catch (error) {
    console.error('통합 처리 오류:', error);
    
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
 * 이메일 연결 테스트
 */
router.get('/test-email', requireAuth, async (req: any, res) => {
  try {
    const emailService = new POEmailServiceMock();
    const testResult = await emailService.testConnection();

    res.json({
      success: true,
      message: testResult.mockMode ? '이메일 Mock 모드 정상' : '이메일 서버 연결 성공',
      data: {
        mockMode: testResult.mockMode,
        error: testResult.error
      }
    });

  } catch (error) {
    console.error('이메일 연결 테스트 오류:', error);
    res.status(500).json({ 
      error: '서버 오류', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * Mock DB 리셋 (개발 환경에서만)
 */
router.post('/reset-mock-db', requireAuth, (req: any, res) => {
  try {
    if (isProductionEnvironment()) {
      return res.status(403).json({ 
        error: '프로덕션 환경에서는 Mock DB 리셋이 허용되지 않습니다.' 
      });
    }
    
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

// 헬퍼 함수들
async function saveToRealDatabase(orders: any[], userId: string) {
  try {
    let savedOrders = 0;
    
    for (const orderData of orders) {
      // 1. 거래처 찾기 또는 생성
      let vendor = await db.select().from(vendors).where(eq(vendors.name, orderData.vendorName)).limit(1);
      let vendorId;
      
      if (vendor.length === 0) {
        const newVendor = await db.insert(vendors).values({
          name: orderData.vendorName,
          contactPerson: '자동생성',
          email: `auto-${Date.now()}@example.com`,
          mainContact: '자동생성'
        }).returning();
        vendorId = newVendor[0].id;
      } else {
        vendorId = vendor[0].id;
      }
      
      // 2. 프로젝트 찾기 또는 생성
      let project = await db.select().from(projects).where(eq(projects.projectName, orderData.siteName)).limit(1);
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
      const newOrder = await db.insert(purchaseOrders).values({
        orderNumber: orderData.orderNumber,
        projectId,
        vendorId,
        userId,
        orderDate: new Date(orderData.orderDate),
        deliveryDate: orderData.dueDate ? new Date(orderData.dueDate) : null,
        totalAmount: orderData.totalAmount,
        status: 'draft',
        notes: 'PO Template에서 자동 생성됨'
      }).returning();
      
      const orderId = newOrder[0].id;
      
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
    
    return {
      success: true,
      savedOrders,
      usingMockDB: false
    };
    
  } catch (error) {
    console.error('실제 DB 저장 실패:', error);
    throw error;
  }
}

function getMockStatistics() {
  const stats = MockDB.getStats();
  const allData = MockDB.getAllData();
  
  return {
    stats,
    sampleData: {
      recentVendors: allData.vendors.slice(-3),
      recentProjects: allData.projects.slice(-3),
      recentOrders: allData.purchaseOrders.slice(-3),
      recentItems: allData.purchaseOrderItems.slice(-3)
    }
  };
}

export default router;