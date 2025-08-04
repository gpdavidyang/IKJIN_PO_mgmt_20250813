import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { POTemplateProcessor } from '../utils/po-template-processor';
import { POEmailService } from '../utils/po-email-service';
import { AdvancedExcelProcessor } from '../utils/advanced-excel-processor';

const router = Router();

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
    // 원본 파일명 유지하면서 타임스탬프 추가
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
    // Excel 파일만 허용
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
    fileSize: 10 * 1024 * 1024 // 10MB 제한
  }
});

// 인증 미들웨어 (간단한 버전)
const requireAuth = (req: any, res: any, next: any) => {
  // 개발 환경에서는 임시 사용자 ID 사용
  if (process.env.NODE_ENV === 'development') {
    req.user = { id: 'dev-user-001' };
    return next();
  }
  
  // 실제 환경에서는 세션 또는 JWT 확인
  if (req.session && req.session.userId) {
    req.user = { id: req.session.userId };
    return next();
  }
  
  return res.status(401).json({ error: '인증이 필요합니다.' });
};

/**
 * PO Template 파일 업로드 및 파싱
 */
router.post('/upload', requireAuth, upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
    }

    const filePath = req.file.path;
    
    // Input 시트 파싱
    const parseResult = POTemplateProcessor.parseInputSheet(filePath);
    
    if (!parseResult.success) {
      // 파일 정리
      fs.unlinkSync(filePath);
      return res.status(400).json({ 
        error: '파싱 실패', 
        details: parseResult.error 
      });
    }

    // 파싱 결과 반환 (DB 저장 전)
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
    
    // 파일 정리
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
 * 파싱된 데이터를 DB에 저장
 */
router.post('/save', requireAuth, async (req: any, res) => {
  try {
    const { filePath, orders } = req.body;
    
    if (!filePath || !orders || !Array.isArray(orders)) {
      return res.status(400).json({ error: '필수 데이터가 누락되었습니다.' });
    }

    // 파일 존재 확인
    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ error: '파일을 찾을 수 없습니다.' });
    }

    // DB에 저장
    const saveResult = await POTemplateProcessor.saveToDatabase(orders, req.user.id);
    
    if (!saveResult.success) {
      return res.status(500).json({ 
        error: 'DB 저장 실패', 
        details: saveResult.error 
      });
    }

    res.json({
      success: true,
      message: 'DB 저장 완료',
      data: {
        savedOrders: saveResult.savedOrders
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
    
    console.log(`[ROUTE DEBUG] /extract-sheets called at ${new Date().toISOString()}`);
    console.log(`[ROUTE DEBUG] filePath: ${filePath}`);
    console.log(`[ROUTE DEBUG] sheetNames: ${JSON.stringify(sheetNames)}`);
    
    if (!filePath) {
      return res.status(400).json({ error: '파일 경로가 필요합니다.' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ error: '파일을 찾을 수 없습니다.' });
    }

    // 추출된 파일 경로 생성
    const timestamp = Date.now();
    const extractedPath = path.join(
      path.dirname(filePath),
      `extracted-${timestamp}.xlsx`
    );

    console.log(`[DEBUG] extractedPath: ${extractedPath}`);
    console.log(`[DEBUG] About to call POTemplateProcessor.extractSheetsToFile`);

    // 시트 추출 (xlwings 기반 완벽한 서식 보존)
    const extractResult = await POTemplateProcessor.extractSheetsToFile(
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
 * [고급] Input 시트만 제거하고 원본 형식을 완벽하게 유지한 엑셀 파일 생성
 * Python, ExcelJS, Binary 조작 방식을 순차적으로 시도하여 최고 품질 보장
 */
router.post('/remove-input-sheet-advanced', requireAuth, async (req: any, res) => {
  try {
    const { sourceFilePath, inputSheetName = 'Input', method } = req.body;

    if (!sourceFilePath) {
      return res.status(400).json({ 
        error: 'sourceFilePath가 필요합니다.' 
      });
    }

    // 소스 파일 존재 확인
    if (!fs.existsSync(sourceFilePath)) {
      return res.status(404).json({ 
        error: '소스 파일을 찾을 수 없습니다.',
        filePath: sourceFilePath
      });
    }

    // 타겟 파일 경로 생성
    const timestamp = Date.now();
    const uploadsDir = path.join(__dirname, '../../uploads');
    const targetFilePath = path.join(uploadsDir, `po-advanced-format-${timestamp}.xlsx`);

    // 고급 방식으로 Input 시트 제거 처리
    const result = await AdvancedExcelProcessor.removeInputSheetAdvanced(
      sourceFilePath,
      targetFilePath,
      inputSheetName,
      method as any
    );

    if (!result.success) {
      return res.status(500).json({
        error: 'Input 시트 제거 실패',
        details: result.error
      });
    }

    // 결과 반환
    res.json({
      success: true,
      message: '고급 방식으로 Input 시트가 성공적으로 제거되었습니다.',
      data: {
        originalFile: sourceFilePath,
        processedFile: targetFilePath,
        removedSheet: result.removedSheet,
        remainingSheets: result.remainingSheets,
        inputSheetName: inputSheetName,
        method: result.method,
        methodDetails: result.methodDetails,
        quality: result.methodDetails?.quality || 'unknown'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('고급 Input 시트 제거 API 오류:', error);
    res.status(500).json({
      error: '고급 Input 시트 제거 중 서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * [기존] Input 시트만 제거하고 원본 형식을 유지한 엑셀 파일 생성
 * @deprecated 형식 손상 문제로 remove-input-sheet-advanced 사용 권장
 */
router.post('/remove-input-sheet', requireAuth, async (req: any, res) => {
  try {
    const { sourceFilePath, inputSheetName = 'Input' } = req.body;

    if (!sourceFilePath) {
      return res.status(400).json({ 
        error: 'sourceFilePath가 필요합니다.' 
      });
    }

    // 소스 파일 존재 확인
    if (!fs.existsSync(sourceFilePath)) {
      return res.status(404).json({ 
        error: '소스 파일을 찾을 수 없습니다.',
        filePath: sourceFilePath
      });
    }

    // 타겟 파일 경로 생성
    const timestamp = Date.now();
    const uploadsDir = path.join(__dirname, '../../uploads');
    const targetFilePath = path.join(uploadsDir, `po-without-input-${timestamp}.xlsx`);

    // Input 시트 제거 처리 (xlwings 기반 완벽한 서식 보존)
    const result = await POTemplateProcessor.removeInputSheetOnly(
      sourceFilePath,
      targetFilePath,
      inputSheetName
    );

    if (!result.success) {
      return res.status(500).json({
        error: 'Input 시트 제거 실패',
        details: result.error
      });
    }

    // 결과 반환
    res.json({
      success: true,
      message: 'Input 시트가 성공적으로 제거되었습니다.',
      data: {
        originalFile: sourceFilePath,
        processedFile: targetFilePath,
        removedSheet: result.removedSheet,
        remainingSheets: result.remainingSheets,
        inputSheetName: inputSheetName
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Input 시트 제거 API 오류:', error);
    res.status(500).json({
      error: 'Input 시트 제거 중 서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 통합 처리 - 업로드, 파싱, DB 저장, 시트 추출을 한 번에
 */
router.post('/process', requireAuth, upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
    }

    const filePath = req.file.path;
    
    // 1. Input 시트 파싱
    const parseResult = POTemplateProcessor.parseInputSheet(filePath);
    
    if (!parseResult.success) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ 
        error: '파싱 실패', 
        details: parseResult.error 
      });
    }

    // 2. DB 저장
    const saveResult = await POTemplateProcessor.saveToDatabase(parseResult.orders, req.user.id);
    
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

    const extractResult = POTemplateProcessor.extractSheetsToFile(
      filePath,
      extractedPath,
      ['갑지', '을지']
    );

    res.json({
      success: true,
      message: 'PO Template 처리 완료',
      data: {
        fileName: req.file.originalname,
        parsing: {
          totalOrders: parseResult.totalOrders,
          totalItems: parseResult.totalItems
        },
        database: {
          savedOrders: saveResult.savedOrders
        },
        extraction: {
          extractedPath: extractResult.success ? extractedPath : null,
          extractedSheets: extractResult.extractedSheets
        }
      }
    });

  } catch (error) {
    console.error('PO Template 통합 처리 오류:', error);
    
    // 파일 정리
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
 * 이메일 발송 (갑지/을지 시트 Excel + PDF 첨부)
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

    // 이메일 서비스 인스턴스 생성
    const emailService = new POEmailService();

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
      message: '이메일 발송 완료',
      data: {
        messageId: emailResult.messageId,
        recipients: Array.isArray(to) ? to : [to],
        attachments: ['갑지/을지 시트 (Excel)', '갑지/을지 시트 (PDF)']
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
 * 원본 형식 유지 이메일 발송 - Input 시트만 제거하고 원본 형식 유지
 */
router.post('/send-email-original-format', requireAuth, async (req: any, res) => {
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

    // 필수 파라미터 검증
    if (!filePath || !to) {
      return res.status(400).json({ 
        error: 'filePath와 to(수신자)는 필수입니다.' 
      });
    }

    // 파일 존재 확인
    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ error: '파일을 찾을 수 없습니다.' });
    }

    // 이메일 서비스 인스턴스 생성
    const emailService = new POEmailService();

    // 새로운 방식으로 이메일 발송 (원본 형식 유지)
    const emailResult = await emailService.sendPOWithOriginalFormat(filePath, {
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
      message: '원본 형식 유지 이메일 발송 완료',
      data: {
        messageId: emailResult.messageId,
        recipients: Array.isArray(to) ? to : [to],
        attachments: ['발주서 (Excel - 원본 형식 유지)', '발주서 (PDF)'],
        method: 'original-format',
        note: 'Input 시트만 제거하여 원본 양식이 그대로 유지됩니다.'
      }
    });

  } catch (error) {
    console.error('원본 형식 유지 이메일 발송 오류:', error);
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
    const emailService = new POEmailService();
    const testResult = await emailService.testConnection();

    if (testResult.success) {
      res.json({
        success: true,
        message: '이메일 서버 연결 성공'
      });
    } else {
      res.status(500).json({
        success: false,
        error: '이메일 서버 연결 실패',
        details: testResult.error
      });
    }

  } catch (error) {
    console.error('이메일 연결 테스트 오류:', error);
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

    // 파일 다운로드
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

/**
 * 임시 파일 정리
 */
router.delete('/cleanup/:filename', requireAuth, (req: any, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../../uploads', filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ success: true, message: '파일 정리 완료' });

  } catch (error) {
    console.error('파일 정리 오류:', error);
    res.status(500).json({ error: '파일 정리 실패' });
  }
});

export default router;