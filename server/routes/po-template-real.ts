import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { POTemplateProcessorMock } from '../utils/po-template-processor-mock.js';
import { DebugLogger } from '../utils/debug-logger.js';
// MockDB import 제거 - 실제 데이터베이스만 사용
import { POEmailServiceMock } from '../utils/po-email-service-mock.js';
import { convertExcelToPdfMock } from '../utils/excel-to-pdf-mock.js';
import { POTemplateValidator } from '../utils/po-template-validator.js';
import { db } from '../db.js';
import { purchaseOrders, purchaseOrderItems, vendors, projects, attachments, companies } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { ProfessionalPDFGenerationService } from '../services/professional-pdf-generation-service.js';
const router = Router();

// 테스트용 엔드포인트
router.get('/test', (req, res) => {
  res.json({ message: 'PO Template router is working!', timestamp: new Date() });
});

// ES modules에서 __dirname 정의
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 파일 업로드 설정 - Vercel serverless 환경 지원
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Vercel 환경에서는 /tmp 디렉토리만 쓰기 가능
    const uploadDir = process.env.VERCEL ? '/tmp' : path.join(__dirname, '../../uploads');
    if (!process.env.VERCEL && !fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    // 한글 파일명 처리: latin1으로 잘못 인코딩된 파일명을 UTF-8로 변환
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const extension = path.extname(originalName);
    const basename = path.basename(originalName, extension);
    // 파일 시스템 저장시는 영문+타임스탬프 사용, 원본 파일명은 DB에 별도 저장
    const safeBasename = basename.replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
    cb(null, `${timestamp}-${safeBasename}${extension}`);
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

// 간단한 인증 미들웨어 (개발용)
const simpleAuth = (req: any, res: any, next: any) => {
  req.user = { id: 'test_admin_001' };
  next();
};

/**
 * 실제 DB 연결 상태 확인
 */
router.get('/db-status', simpleAuth, async (req: any, res) => {
  try {
    if (!db) {
      return res.json({
        success: false,
        message: 'DB 연결 없음 - Mock DB 사용',
        usingMockDB: true
      });
    }

    // DB 연결 테스트
    const testResult = await db.select().from(vendors).limit(1);
    
    res.json({
      success: true,
      message: '실제 DB 연결 성공',
      usingMockDB: false,
      vendorCount: testResult.length
    });
    
  } catch (error) {
    console.error('DB 상태 확인 오류:', error);
    res.json({
      success: false,
      message: 'DB 연결 실패 - Mock DB로 폴백',
      usingMockDB: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PO Template 파일 업로드 및 파싱 (유효성 검사 포함)
 */
router.post('/upload', simpleAuth, upload.single('file'), async (req: any, res) => {
  // ⭐ CRITICAL: Guaranteed response mechanism for Vercel serverless
  const startTime = Date.now();
  let responseHandler = {
    sent: false,
    send: (status: number, data: any) => {
      if (!responseHandler.sent) {
        responseHandler.sent = true;
        console.log(`📤 [Vercel] Response sent: ${status}`, { 
          elapsedTime: Date.now() - startTime,
          success: data.success,
          hasError: !!data.error
        });
        res.status(status).json(data);
      }
    }
  };

  // ⭐ CRITICAL: Maximum timeout protection (Vercel 60s limit with 55s safety margin)
  const timeoutDuration = process.env.VERCEL ? 55000 : 120000; // Vercel: 55초, 로컬: 120초
  const timeoutId = setTimeout(() => {
    responseHandler.send(408, {
      success: false,
      error: `서버리스 함수 처리 시간 초과 (${timeoutDuration/1000}초). 파일이 너무 크거나 복잡할 수 있습니다.`,
      debug: {
        elapsedTime: Date.now() - startTime,
        phase: 'timeout_protection',
        platform: process.env.VERCEL ? 'vercel_serverless' : 'local',
        memoryUsage: process.memoryUsage(),
        suggestion: '더 작은 파일로 나누어 업로드하거나 파일 크기를 줄여주세요.'
      }
    });
  }, timeoutDuration);

  console.log('🚀 [Vercel] 서버리스 함수 시작:', {
    timestamp: new Date().toISOString(),
    memoryUsage: process.memoryUsage(),
    platform: process.platform,
    nodeVersion: process.version,
    timeoutProtection: '25s_active'
  });

  try {
    console.log('📥 [서버] 파일 업로드 요청 수신:', {
      hasFile: !!req.file,
      originalname: req.file?.originalname,
      filename: req.file?.filename,
      size: req.file?.size,
      mimetype: req.file?.mimetype,
      endpoint: '/api/po-template/upload'
    });

    if (!req.file) {
      console.error('❌ [서버] 파일 없음');
      clearTimeout(timeoutId);
      return responseHandler.send(400, { 
        success: false,
        error: '파일이 업로드되지 않았습니다.',
        debug: { phase: 'file_validation', elapsedTime: Date.now() - startTime }
      });
    }

    const filePath = req.file.path;
    console.log('📂 [서버] 파일 경로:', { filePath });
    
    // 1. 빠른 유효성 검사
    console.log('🔍 [서버] 유효성 검사 시작');
    const quickValidation = await POTemplateValidator.quickValidate(filePath);
    console.log('📋 [서버] 유효성 검사 결과:', {
      isValid: quickValidation.isValid,
      errorCount: quickValidation.errors.length,
      errors: quickValidation.errors
    });
    
    if (!quickValidation.isValid) {
      console.error('❌ [서버] 유효성 검사 실패');
      fs.unlinkSync(filePath);
      clearTimeout(timeoutId);
      return responseHandler.send(400, { 
        success: false,
        error: '파일 유효성 검사 실패', 
        details: quickValidation.errors.join(', '),
        validation: quickValidation,
        debug: { phase: 'quick_validation', elapsedTime: Date.now() - startTime }
      });
    }

    // 2. Input 시트 파싱
    console.log('⚙️ [서버] Input 시트 파싱 시작');
    const parseResult = POTemplateProcessorMock.parseInputSheet(filePath);
    console.log('📊 [서버] 파싱 결과:', {
      success: parseResult.success,
      hasData: !!parseResult.data,
      ordersCount: parseResult.data?.orders?.length || 0
    });
    
    if (!parseResult.success) {
      console.error('❌ [서버] 파싱 실패:', parseResult.error);
      fs.unlinkSync(filePath);
      clearTimeout(timeoutId);
      return responseHandler.send(400, { 
        success: false,
        error: '파싱 실패', 
        details: parseResult.error,
        debug: { phase: 'parsing', elapsedTime: Date.now() - startTime }
      });
    }

    // 3. 상세 유효성 검사
    console.log('🔍 [서버] 상세 유효성 검사 시작');
    const detailedValidation = await POTemplateValidator.validatePOTemplateFile(filePath);
    console.log('📋 [서버] 상세 유효성 검사 완료');
    
    const responseData = {
      success: true,
      message: '파일 파싱 완료',
      data: {
        fileName: req.file.originalname,
        filePath,
        totalOrders: parseResult.data?.totalOrders || 0,
        totalItems: parseResult.data?.totalItems || 0,
        orders: parseResult.data?.orders || [],
        validation: detailedValidation
      }
    };
    
    console.log('✅ [서버] 성공 응답 전송:', {
      success: responseData.success,
      fileName: responseData.data.fileName,
      totalOrders: responseData.data.totalOrders,
      totalItems: responseData.data.totalItems,
      ordersCount: responseData.data.orders?.length || 0,
      elapsedTime: Date.now() - startTime
    });
    
    clearTimeout(timeoutId);
    responseHandler.send(200, responseData);

  } catch (error) {
    console.error('💥 [서버] PO Template 업로드 오류:', {
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : 'No stack trace',
      endpoint: '/api/po-template/upload',
      elapsedTime: Date.now() - startTime
    });
    
    if (req.file && fs.existsSync(req.file.path)) {
      console.log('🗑️ [서버] 임시 파일 삭제:', req.file.path);
      fs.unlinkSync(req.file.path);
    }
    
    clearTimeout(timeoutId);
    responseHandler.send(500, { 
      success: false,
      error: '서버 오류', 
      details: error instanceof Error ? error.message : 'Unknown error',
      debug: { 
        phase: 'catch_block', 
        elapsedTime: Date.now() - startTime,
        memoryUsage: process.memoryUsage()
      }
    });
  }
});

/**
 * 실제 DB 또는 Mock DB에 저장 + PDF/Excel 파일 생성 및 저장
 */
router.post('/save', simpleAuth, async (req: any, res) => {
  console.log('🔥🔥🔥 /save 엔드포인트 호출됨 - PDF/Excel 파일 생성 포함');
  try {
    const { orders, extractedFilePath } = req.body;
    console.log('📋 받은 extractedFilePath:', extractedFilePath);
    
    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ error: '발주서 데이터가 누락되었습니다.' });
    }

    // 실제 DB 연결 확인
    if (db) {
      try {
        // 실제 DB에 저장 시도
        let savedOrders = 0;
        const savedOrderNumbers: string[] = [];
        const pdfGenerationStatuses: any[] = [];
        
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
          
          // 3. 발주서 번호 중복 체크 및 생성
          let orderNumber = orderData.orderNumber;
          let suffix = 1;
          
          // 중복된 발주번호가 있으면 suffix 추가
          while (true) {
            try {
              const existing = await db.select().from(purchaseOrders).where(eq(purchaseOrders.orderNumber, orderNumber));
              if (existing.length === 0) {
                break; // 중복 없음, 사용 가능
              }
              // 중복 있음, suffix 추가하여 다시 시도
              orderNumber = `${orderData.orderNumber}-${suffix}`;
              suffix++;
            } catch (error) {
              console.error('발주번호 중복 검사 오류:', error);
              orderNumber = `${orderData.orderNumber}-${Date.now().toString().slice(-6)}`;
              break;
            }
          }
          
          console.log(`📋 최종 발주번호: ${orderNumber} (원본: ${orderData.orderNumber})`);
          console.log(`📅 발주일자 디버깅: orderData.orderDate="${orderData.orderDate}", type=${typeof orderData.orderDate}`);
          console.log(`📅 납기일자 디버깅: orderData.dueDate="${orderData.dueDate}", type=${typeof orderData.dueDate}`);
          
          // 날짜 변환 함수 - 새로운 버전으로 업데이트됨
          console.log(`🔥🔥🔥 날짜 변환 함수 시작 - 새 코드 실행됨`);
          const parseDate = (dateStr: string) => {
            console.log(`🔥📅 parseDate 입력값: "${dateStr}", type=${typeof dateStr}, isEmpty=${!dateStr || dateStr.trim() === ''}`);
            if (!dateStr || dateStr.trim() === '') {
              console.log(`🔥📅 parseDate 결과: null (빈 문자열)`);
              return null;
            }
            const date = new Date(dateStr);
            const isValid = !isNaN(date.getTime());
            console.log(`🔥📅 parseDate 결과: "${dateStr}" -> ${isValid ? date.toISOString() : 'Invalid'} (valid: ${isValid})`);
            return isValid ? date : null;
          };
          
          // 발주서 생성
          const parsedOrderDate = parseDate(orderData.orderDate);
          const parsedDeliveryDate = parseDate(orderData.dueDate);
          
          console.log(`📅 최종 저장할 날짜들:`, {
            orderDate: parsedOrderDate,
            deliveryDate: parsedDeliveryDate,
            orderDateISO: parsedOrderDate ? parsedOrderDate.toISOString() : null,
            deliveryDateISO: parsedDeliveryDate ? parsedDeliveryDate.toISOString() : null
          });
          
          const newOrder = await db.insert(purchaseOrders).values({
            orderNumber,
            projectId,
            vendorId,
            userId: req.user.id,
            orderDate: parsedOrderDate ? parsedOrderDate.toISOString().split('T')[0] : null,
            deliveryDate: parsedDeliveryDate ? parsedDeliveryDate.toISOString().split('T')[0] : null,
            totalAmount: orderData.totalAmount,
            status: 'draft',
            notes: 'PO Template에서 자동 생성됨'
          }).returning();
          
          console.log(`📅 DB에 저장된 발주서:`, {
            id: newOrder[0].id,
            orderNumber: newOrder[0].orderNumber,
            orderDate: newOrder[0].orderDate,
            deliveryDate: newOrder[0].deliveryDate
          });
          
          const orderId = newOrder[0].id;
          
          // 4. 발주서 아이템들 생성
          for (const item of orderData.items) {
            await db.insert(purchaseOrderItems).values({
              orderId,
              itemName: item.itemName,
              specification: item.specification,
              unit: item.unit || null, // 단위가 없으면 NULL (DB에서 NULL 허용됨)
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalAmount: item.totalAmount,
              // categoryLv1: item.categoryLv1, // TODO: Add column to DB
              // categoryLv2: item.categoryLv2, // TODO: Add column to DB
              // categoryLv3: item.categoryLv3, // TODO: Add column to DB
              // supplyAmount: item.supplyAmount, // TODO: Add column to DB
              // taxAmount: item.taxAmount, // TODO: Add column to DB
              // deliveryName: item.deliveryName, // TODO: Add column to DB
              notes: item.notes
            });
          }
          
          // PDF 파일 생성 및 저장 - gatherComprehensiveOrderData 사용
          let pdfBuffer: Buffer;
          let pdfBase64: string;
          let pdfGenerationStatus = {
            orderNumber,
            success: false,
            message: '',
            attachmentId: null as number | null
          };
          
          try {
            console.log('🚀 [PDF생성] 시작:', orderNumber, 'Order ID:', newOrder[0].id);
            console.log('🌐 [PDF생성] Environment:', { VERCEL: !!process.env.VERCEL, NODE_ENV: process.env.NODE_ENV });
            
            // ProfessionalPDFGenerationService의 gatherComprehensiveOrderData 사용
            const comprehensiveData = await ProfessionalPDFGenerationService.gatherComprehensiveOrderData(newOrder[0].id);
            
            if (comprehensiveData) {
              console.log('✅ [PDF생성] 포괄적 데이터 수집 성공');
              // PDF 생성 with enhanced error handling
              pdfBuffer = await ProfessionalPDFGenerationService.generateProfessionalPDF(comprehensiveData);
              pdfBase64 = pdfBuffer.toString('base64');
              console.log('✅ [PDF생성] PDF 버퍼 생성 완료, 크기:', pdfBuffer.length, 'bytes', 'Base64 길이:', pdfBase64.length, 'chars');
            } else {
              // fallback: 직접 데이터 구성
              console.log('⚠️ 포괄적 데이터 수집 실패, fallback 모드 사용');
              
              // 회사 정보 조회 (발주업체)
              const companyList = await db.select().from(companies).limit(1);
              const company = companyList[0];
              
              // Professional PDF 생성을 위한 데이터 준비
              const pdfOrderData: any = {
                orderNumber,
                orderDate: parsedOrderDate,
                deliveryDate: parsedDeliveryDate ? parsedDeliveryDate : null,
                orderStatus: 'created',
                approvalStatus: 'pending',
                createdAt: new Date(),
                updatedAt: new Date(),
                
                issuerCompany: {
                  name: company?.companyName || '익진테크',
                  businessNumber: company?.businessNumber || '123-45-67890',
                  representative: company?.representativeName || '대표이사',
                  address: company?.address || '서울특별시 강남구',
                  phone: company?.phoneNumber || '02-1234-5678',
                  fax: company?.faxNumber || '02-1234-5679',
                  email: company?.email || 'info@ikjintech.com',
                  website: company?.website || ''
                },
                
                vendorCompany: {
                  name: orderData.vendorName,
                  businessNumber: vendor[0]?.businessNumber || '',
                  representative: vendor[0]?.representative || '',
                  contactPerson: vendor[0]?.contactPerson || '',
                  phone: vendor[0]?.phone || vendor[0]?.mainContact || '',
                  fax: vendor[0]?.fax || '',
                  email: vendor[0]?.email || '',
                  address: vendor[0]?.address || '',
                  contactPhone: vendor[0]?.mainContact || '',
                  contactEmail: vendor[0]?.email || '',
                  businessType: vendor[0]?.businessType || ''
                },
                
                project: {
                  name: orderData.siteName,
                  code: project[0]?.projectCode || '',
                  clientName: project[0]?.clientName || '',
                  location: project[0]?.location || '',
                  startDate: project[0]?.startDate,
                  endDate: project[0]?.endDate,
                  projectManager: '',
                  projectManagerContact: '',
                  orderManager: '',
                  orderManagerContact: '',
                  totalBudget: project[0]?.totalBudget || 0
                },
                
                creator: {
                  name: req.user?.name || '시스템',
                  email: req.user?.email || '',
                  phone: req.user?.phoneNumber || '',
                  position: req.user?.position || '',
                  role: req.user?.role || '',
                  department: ''
                },
                
                items: orderData.items.map((item: any, idx: number) => ({
                  sequenceNo: idx + 1,
                  majorCategory: item.majorCategory || '',
                  middleCategory: item.middleCategory || '',
                  minorCategory: item.minorCategory || '',
                  itemCode: '',
                  name: item.itemName,
                  specification: item.specification || '',
                  quantity: parseFloat(item.quantity) || 0,
                  unit: item.unit || 'EA',
                  unitPrice: parseFloat(item.unitPrice) || 0,
                  totalPrice: parseFloat(item.totalAmount) || 0,
                  deliveryLocation: orderData.deliveryName || orderData.vendorName,
                  remarks: item.remarks || '',
                  categoryPath: [item.majorCategory, item.middleCategory, item.minorCategory].filter(c => c).join(' > ')
                })),
                
                financial: {
                  subtotalAmount: orderData.totalAmount,
                  vatRate: 0.1,
                  vatAmount: Math.round(orderData.totalAmount * 0.1),
                  totalAmount: Math.round(orderData.totalAmount * 1.1),
                  discountAmount: 0,
                  currencyCode: 'KRW'
                },
                
                terms: {
                  paymentTerms: '월말 현금 지급',
                  deliveryTerms: '지정 장소 납품',
                  warrantyPeriod: '1년',
                  penaltyRate: '',
                  qualityStandard: '',
                  inspectionMethod: ''
                },
                
                attachments: {
                  count: 0,
                  hasAttachments: false,
                  fileNames: [],
                  totalSize: 0
                },
                
                communication: {
                  emailHistory: [],
                  lastEmailSent: undefined,
                  totalEmailsSent: 0
                },
                
                approval: {
                  currentStatus: 'pending',
                  approvalLevel: 0,
                  approvers: [],
                  requestedAt: new Date(),
                  completedAt: undefined
                },
                
                metadata: {
                  notes: orderData.remarks || '',
                  specialInstructions: orderData.internalRemarks || '',
                  riskFactors: '',
                  complianceNotes: '',
                  revisionNumber: 1,
                  documentId: `DOC-${orderNumber}`,
                  generatedAt: new Date(),
                  generatedBy: req.user?.name || 'System',
                  templateVersion: 'v2.0.0'
                }
              };
              
              // PDF 생성
              pdfBuffer = await ProfessionalPDFGenerationService.generateProfessionalPDF(pdfOrderData);
              pdfBase64 = pdfBuffer.toString('base64');
            }
            
            // PDF를 attachments 테이블에 저장 (한글 파일명 인코딩 처리)
            // orderNumber가 이미 PO-로 시작하므로 중복 제거
            const cleanOrderNumber = orderNumber.startsWith('PO-') ? orderNumber.substring(3) : orderNumber;
            const pdfOriginalName = `PO_Professional_${cleanOrderNumber}_${Date.now()}.pdf`;
            const pdfStoredName = `PO_Professional_${cleanOrderNumber}_${Date.now()}.pdf`;
            
            const pdfAttachment = await db.insert(attachments).values({
              orderId: newOrder[0].id,
              originalName: pdfOriginalName,  // 한글 포함 파일명
              storedName: pdfStoredName,  // 영문 저장용 파일명
              filePath: `uploads/pdf/${pdfStoredName}`,
              fileSize: pdfBuffer.length,
              mimeType: 'application/pdf',
              uploadedBy: req.user?.id || 'system',
              fileData: pdfBase64
            }).returning();
            
            pdfGenerationStatus = {
              orderNumber,
              success: true,
              message: `PDF 파일이 성공적으로 생성되었습니다 (${orderNumber}.pdf)`,
              attachmentId: pdfAttachment[0].id
            };
            
            console.log('✅ [PDF생성] PDF 생성 및 저장 완료:', orderNumber);
          } catch (pdfError) {
            console.error('❌ [PDF생성] PDF 생성 실패 (계속 진행):', pdfError);
            console.error('❌ [PDF생성] 에러 상세:', {
              orderNumber,
              orderId: newOrder[0].id,
              environment: process.env.VERCEL ? 'vercel' : 'local',
              errorMessage: pdfError instanceof Error ? pdfError.message : '알 수 없는 오류',
              errorStack: pdfError instanceof Error ? pdfError.stack : null,
              memoryUsage: process.memoryUsage()
            });
            pdfGenerationStatus.success = false;
            pdfGenerationStatus.message = process.env.VERCEL 
              ? `PDF 생성 실패 (Vercel): ${pdfError instanceof Error ? pdfError.message : '알 수 없는 오류'}. 폰트 또는 환경 문제일 수 있습니다.`
              : `PDF 생성 실패: ${pdfError instanceof Error ? pdfError.message : '알 수 없는 오류'}`;
          }
          
          pdfGenerationStatuses.push(pdfGenerationStatus);
          
          // Excel 파일 저장 (Input 시트 제거된 파일)
          if (extractedFilePath && fs.existsSync(extractedFilePath)) {
            try {
              console.log('📊 Excel 파일 저장 시작:', extractedFilePath);
              
              const excelBuffer = fs.readFileSync(extractedFilePath);
              const excelBase64 = excelBuffer.toString('base64');
              
              // Excel 파일명 한글 인코딩 처리
              const excelOriginalName = `${orderNumber}_갑지을지.xlsx`;
              const excelStoredName = `${orderNumber}_${Date.now()}_extracted.xlsx`;
              
              await db.insert(attachments).values({
                orderId: newOrder[0].id,
                originalName: excelOriginalName,  // 한글 포함 파일명
                storedName: excelStoredName,  // 영문 저장용 파일명
                filePath: extractedFilePath,
                fileSize: excelBuffer.length,
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                uploadedBy: req.user?.id || 'system',
                fileData: excelBase64
              });
              
              console.log('✅ Excel 파일 저장 완료:', orderNumber);
            } catch (excelError) {
              console.error('❌ Excel 파일 저장 실패 (계속 진행):', excelError);
            }
          }
          
          savedOrders++;
          savedOrderNumbers.push(orderNumber);
        }
        
        console.log('📤 [응답] PDF 생성 상태 포함하여 응답 전송:', {
          savedOrders,
          pdfStatusCount: pdfGenerationStatuses.length,
          pdfStatuses: pdfGenerationStatuses.map(s => ({ orderNumber: s.orderNumber, success: s.success, hasMessage: !!s.message }))
        });

        res.json({
          success: true,
          message: '실제 DB 저장 완료',
          data: {
            savedOrders,
            savedOrderNumbers,
            usingMockDB: false,
            pdfGenerationStatuses: pdfGenerationStatuses // 확실히 포함
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
router.post('/extract-sheets', simpleAuth, async (req: any, res) => {
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
        extractedSheets: extractResult.extractedSheets,
        extractedFilePath: extractedPath  // Add this for frontend compatibility
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
 * DB 통계 조회 (실제 DB 우선, 실패시 Mock DB)
 */
router.get('/db-stats', simpleAuth, async (req: any, res) => {
  try {
    if (db) {
      try {
        // 실제 DB에서 통계 조회
        const vendorCount = await db.select().from(vendors);
        const projectCount = await db.select().from(projects);
        const orderCount = await db.select().from(purchaseOrders);
        const itemCount = await db.select().from(purchaseOrderItems);
        
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
              recentOrders: orderCount.slice(-3),
              recentItems: itemCount.slice(-3)
            },
            usingMockDB: false
          }
        });
        
      } catch (dbError) {
        console.error('실제 DB 통계 조회 실패, Mock DB로 폴백:', dbError);
        
        // Mock DB로 폴백
        res.json({
          success: true,
          data: {
            stats: { vendors: 0, projects: 0, purchaseOrders: 0, purchaseOrderItems: 0 },
            sampleData: {
              recentVendors: [],
              recentProjects: [],
              recentOrders: [],
              recentItems: []
            },
            usingMockDB: true,
            dbError: dbError instanceof Error ? dbError.message : 'Unknown error'
          }
        });
      }
    } else {
      // DB 연결이 없는 경우 빈 데이터 반환
      res.json({
        success: true,
        data: {
          stats: { vendors: 0, projects: 0, purchaseOrders: 0, purchaseOrderItems: 0 },
          sampleData: {
            recentVendors: [],
            recentProjects: [],
            recentOrders: [],
            recentItems: []
          },
          usingMockDB: true
        }
      });
    }
    
  } catch (error) {
    console.error('DB 통계 조회 오류:', error);
    res.status(500).json({ 
      error: '서버 오류', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * 이메일 발송 (갑지/을지 시트 Excel + PDF 첨부)
 */
router.post('/send-email', simpleAuth, async (req: any, res) => {
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

    // 이메일 서비스 인스턴스 생성
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

    // 이메일 발송 성공 시 발주서 상태를 'sent'로 업데이트 (orderNumber가 있는 경우)
    if (emailResult.success && orderNumber) {
      try {
        const { db } = await import('../db');
        const { purchaseOrders } = await import('@shared/schema');
        const { eq } = await import('drizzle-orm');
        
        await db.update(purchaseOrders)
          .set({
            orderStatus: 'sent',
            updatedAt: new Date()
          })
          .where(eq(purchaseOrders.orderNumber, orderNumber));
          
        console.log(`📋 발주서 상태 업데이트 완료: ${orderNumber} → sent`);
      } catch (updateError) {
        console.error(`❌ 발주서 상태 업데이트 실패: ${orderNumber}`, updateError);
        // 상태 업데이트 실패는 이메일 발송 성공에 영향을 주지 않음
      }
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
 * PDF 변환 (갑지/을지 시트만)
 */
router.post('/convert-to-pdf', simpleAuth, async (req: any, res) => {
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
 * 통합 처리 (업로드 → 파싱 → 검증 → 저장 → 추출 → 이메일)
 */
router.post('/process-complete', simpleAuth, upload.single('file'), async (req: any, res) => {
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

    const results = {
      upload: null,
      validation: null,
      parsing: null,
      saving: null,
      extraction: null,
      pdf: null,
      email: null
    };

    // 1. 업로드 및 유효성 검사
    console.log('📁 1단계: 파일 업로드 및 유효성 검사');
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

    // 2. 파싱
    console.log('📊 2단계: 데이터 파싱');
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

    // 3. 데이터베이스 저장
    console.log('💾 3단계: 데이터베이스 저장');
    const saveResult = await this.saveToDatabase(parseResult.orders, req.user.id);
    results.saving = saveResult;

    // 4. 갑지/을지 시트 추출
    console.log('📋 4단계: 갑지/을지 시트 추출');
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

    // 5. PDF 변환 (옵션)
    if (generatePDF) {
      console.log('📄 5단계: PDF 변환');
      const pdfPath = path.join(
        path.dirname(filePath),
        `po-sheets-${timestamp}.pdf`
      );
      
      const pdfResult = await convertExcelToPdfMock(extractedPath, pdfPath);
      results.pdf = pdfResult;
    }

    // 6. 이메일 발송 (옵션)
    if (sendEmail && emailTo && emailSubject) {
      console.log('📧 6단계: 이메일 발송');
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

    console.log('✅ 모든 단계 완료');

    res.json({
      success: true,
      message: 'PO Template 통합 처리 완료',
      data: {
        fileName: req.file.originalname,
        results,
        summary: {
          totalOrders: parseResult.totalOrders,
          totalItems: parseResult.totalItems,
          validationPassed: validation.isValid,
          savedToDatabase: saveResult.success,
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
router.get('/test-email', simpleAuth, async (req: any, res) => {
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
 * DB 초기화 (개발용)
 */
router.post('/reset-db', simpleAuth, (req: any, res) => {
  try {
    res.json({
      success: true,
      message: 'DB 초기화 요청 처리됨 (Mock DB 없음)',
      data: { vendors: 0, projects: 0, purchaseOrders: 0, purchaseOrderItems: 0 }
    });
    
  } catch (error) {
    console.error('DB 초기화 오류:', error);
    res.status(500).json({ 
      error: '서버 오류', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// 헬퍼 메서드 추가
router.saveToDatabase = async function(orders: any[], userId: string) {
  // 실제 DB 연결 확인
  if (db) {
    try {
      // 실제 DB에 저장 시도
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
      
    } catch (dbError) {
      console.error('실제 DB 저장 실패, Mock DB로 폴백:', dbError);
      
      // Mock DB로 폴백
      const mockResult = await POTemplateProcessorMock.saveToDatabase(orders, userId);
      
      return {
        success: mockResult.success,
        savedOrders: mockResult.savedOrders,
        usingMockDB: true,
        dbError: dbError instanceof Error ? dbError.message : 'Unknown error'
      };
    }
  } else {
    // DB 연결이 없는 경우 Mock DB 사용
    const mockResult = await POTemplateProcessorMock.saveToDatabase(orders, userId);
    
    return {
      success: mockResult.success,
      savedOrders: mockResult.savedOrders,
      usingMockDB: true
    };
  }
};

export default router;