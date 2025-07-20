/**
 * Excel 발주서 자동화 처리 API 라우트
 * 
 * 엑셀 업로드 → DB 저장 → 거래처 검증 → 이메일 발송까지 통합 처리
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { ExcelAutomationService } from '../utils/excel-automation-service.js';
import { DebugLogger } from '../utils/debug-logger.js';
import { requireAuth } from '../local-auth.js';

const router = Router();

// 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, `${timestamp}-${originalName}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Excel 파일만 업로드 가능합니다.'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

/**
 * 1단계: 엑셀 파일 업로드 및 초기 처리
 * POST /api/excel-automation/upload-and-process
 */
router.post('/upload-and-process', requireAuth, upload.single('file'), async (req: any, res) => {
  DebugLogger.logExecutionPath('/api/excel-automation/upload-and-process', 'ExcelAutomationService.processExcelUpload');
  
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: '파일이 업로드되지 않았습니다.' 
      });
    }

    const filePath = req.file.path;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '사용자 인증이 필요합니다.'
      });
    }

    console.log(`📁 Excel 자동화 처리 시작: ${filePath}`);

    // 통합 자동화 프로세스 실행
    const result = await ExcelAutomationService.processExcelUpload(filePath, userId);

    if (!result.success) {
      // 실패 시 업로드된 파일 정리
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      return res.status(400).json(result);
    }

    // 성공 응답
    res.json({
      success: true,
      message: 'Excel 파일 처리 완료',
      data: {
        ...result.data,
        filePath,
        fileName: req.file.originalname,
        fileSize: req.file.size
      }
    });

  } catch (error) {
    console.error('Excel 자동화 처리 오류:', error);
    
    // 오류 시 업로드된 파일 정리
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 2단계: 거래처 선택 후 이메일 미리보기 업데이트
 * POST /api/excel-automation/update-email-preview
 */
router.post('/update-email-preview', requireAuth, async (req: any, res) => {
  DebugLogger.logExecutionPath('/api/excel-automation/update-email-preview', 'ExcelAutomationService.updateEmailPreviewWithVendorSelection');
  
  try {
    const { filePath, selectedVendors } = req.body;

    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: '파일 경로가 필요합니다.'
      });
    }

    if (!Array.isArray(selectedVendors)) {
      return res.status(400).json({
        success: false,
        error: '선택된 거래처 정보가 필요합니다.'
      });
    }

    console.log(`📧 이메일 미리보기 업데이트: ${selectedVendors.length}개 거래처`);

    const emailPreview = await ExcelAutomationService.updateEmailPreviewWithVendorSelection(
      filePath,
      selectedVendors
    );

    res.json({
      success: true,
      message: '이메일 미리보기 업데이트 완료',
      data: { emailPreview }
    });

  } catch (error) {
    console.error('이메일 미리보기 업데이트 오류:', error);
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 3단계: 이메일 발송 실행
 * POST /api/excel-automation/send-emails
 */
router.post('/send-emails', requireAuth, async (req: any, res) => {
  DebugLogger.logExecutionPath('/api/excel-automation/send-emails', 'ExcelAutomationService.sendEmails');
  
  try {
    const { 
      processedFilePath,
      recipients,
      cc,
      bcc,
      additionalAttachments = [],
      emailOptions = {}
    } = req.body;

    if (!processedFilePath) {
      return res.status(400).json({
        success: false,
        error: '처리된 파일 경로가 필요합니다.'
      });
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: '이메일 수신자가 필요합니다.'
      });
    }

    if (!fs.existsSync(processedFilePath)) {
      return res.status(400).json({
        success: false,
        error: '처리된 파일을 찾을 수 없습니다.'
      });
    }

    console.log(`📧 이메일 발송 시작: ${recipients.length}명`);

    const sendResult = await ExcelAutomationService.sendEmails(
      processedFilePath,
      recipients,
      {
        ...emailOptions,
        cc,
        bcc,
        additionalAttachments
      }
    );

    res.json({
      success: sendResult.success,
      message: sendResult.success 
        ? `이메일 발송 완료 (성공: ${sendResult.sentEmails}개)`
        : `이메일 발송 부분 실패 (성공: ${sendResult.sentEmails}개, 실패: ${sendResult.failedEmails.length}개)`,
      data: sendResult
    });

  } catch (error) {
    console.error('이메일 발송 오류:', error);
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 이메일 내용 미리보기 생성
 * POST /api/excel-automation/email-preview
 */
router.post('/email-preview', requireAuth, async (req: any, res) => {
  try {
    const { 
      subject, 
      orderNumber, 
      vendorName, 
      orderDate, 
      totalAmount, 
      additionalMessage 
    } = req.body;

    const { POEmailService } = await import('../utils/po-email-service.js');
    const emailService = new POEmailService();

    const htmlContent = emailService.generateEmailPreview({
      to: 'preview@example.com', // 미리보기용 더미 이메일
      subject: subject || '발주서 전송',
      orderNumber,
      vendorName,
      orderDate,
      totalAmount,
      additionalMessage
    });

    res.json({
      success: true,
      data: {
        htmlContent
      }
    });

  } catch (error) {
    console.error('이메일 미리보기 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 거래처 유사성 검증 (독립 실행)
 * POST /api/excel-automation/validate-vendors
 */
router.post('/validate-vendors', requireAuth, async (req: any, res) => {
  try {
    const { filePath } = req.body;

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(400).json({
        success: false,
        error: '유효한 파일 경로가 필요합니다.'
      });
    }

    const vendorValidation = await ExcelAutomationService.validateVendorsFromExcel(filePath);

    res.json({
      success: true,
      message: '거래처 검증 완료',
      data: { vendorValidation }
    });

  } catch (error) {
    console.error('거래처 검증 오류:', error);
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 추가 첨부파일 업로드
 * POST /api/excel-automation/upload-attachment
 */
router.post('/upload-attachment', requireAuth, upload.array('attachments', 10), async (req: any, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: '업로드된 파일이 없습니다.'
      });
    }

    const uploadedFiles = req.files.map((file: any) => ({
      filename: file.filename,
      originalName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      size: file.size,
      path: file.path,
      mimetype: file.mimetype
    }));

    console.log(`📎 추가 첨부파일 업로드: ${uploadedFiles.length}개`);

    res.json({
      success: true,
      message: '파일 업로드 완료',
      data: {
        files: uploadedFiles
      }
    });

  } catch (error) {
    console.error('추가 첨부파일 업로드 오류:', error);
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
});

/**
 * PDF 파일 생성 및 다운로드
 * POST /api/excel-automation/generate-pdf
 */
router.post('/generate-pdf', requireAuth, async (req: any, res) => {
  try {
    const { processedFilePath, orderNumber } = req.body;

    if (!processedFilePath) {
      return res.status(400).json({
        success: false,
        error: '처리된 파일 경로가 필요합니다.'
      });
    }

    const filePath = path.join('uploads', processedFilePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: '처리된 파일을 찾을 수 없습니다.'
      });
    }

    // PDF 변환
    const { convertExcelToPdf } = await import('../utils/excel-to-pdf.js');
    const timestamp = Date.now();
    const pdfPath = path.join('uploads', `po-pdf-${timestamp}.pdf`);
    
    console.log(`📄 PDF 생성 시작: ${filePath} -> ${pdfPath}`);
    
    const pdfResult = await convertExcelToPdf(filePath, pdfPath, ['갑지', '을지']);
    
    if (!pdfResult.success) {
      return res.status(500).json({
        success: false,
        error: `PDF 변환 실패: ${pdfResult.error}`
      });
    }

    const pdfFilename = `발주서_${orderNumber || timestamp}.pdf`;
    
    res.json({
      success: true,
      message: 'PDF 생성 완료',
      data: {
        pdfPath: `po-pdf-${timestamp}.pdf`,
        pdfFilename
      }
    });

  } catch (error) {
    console.error('PDF 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 처리된 파일 다운로드
 * GET /api/excel-automation/download/:filename
 */
router.get('/download/:filename', requireAuth, (req: any, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join('uploads', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: '파일을 찾을 수 없습니다.'
      });
    }

    // 파일 다운로드
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('파일 다운로드 오류:', err);
        res.status(500).json({
          success: false,
          error: '파일 다운로드 중 오류가 발생했습니다.'
        });
      }
    });

  } catch (error) {
    console.error('파일 다운로드 오류:', error);
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
});

/**
 * 이메일 발송 이력 조회
 * GET /api/excel-automation/email-history
 */
router.get('/email-history', requireAuth, async (req: any, res) => {
  try {
    const { page = 1, limit = 10, status, orderNumber, userId } = req.query;
    
    const { EmailHistoryService } = await import('../utils/email-history-service.js');
    
    const result = await EmailHistoryService.getEmailHistory({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      orderNumber,
      userId: userId || req.user?.id
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('이메일 발송 이력 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 특정 이메일 발송 이력 상세 조회
 * GET /api/excel-automation/email-history/:id
 */
router.get('/email-history/:id', requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    
    const { EmailHistoryService } = await import('../utils/email-history-service.js');
    
    const result = await EmailHistoryService.getEmailHistoryDetail(parseInt(id));

    if (!result) {
      return res.status(404).json({
        success: false,
        error: '이메일 발송 이력을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('이메일 발송 이력 상세 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 이메일 재발송
 * POST /api/excel-automation/resend-email/:id
 */
router.post('/resend-email/:id', requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { recipients } = req.body;
    
    const { EmailHistoryService } = await import('../utils/email-history-service.js');
    
    const result = await EmailHistoryService.resendEmail(parseInt(id), recipients || []);

    res.json({
      success: result.success,
      message: result.success ? '이메일 재발송 완료' : '이메일 재발송 실패',
      data: result
    });

  } catch (error) {
    console.error('이메일 재발송 오류:', error);
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 임시 파일 정리
 * DELETE /api/excel-automation/cleanup
 */
router.delete('/cleanup', requireAuth, async (req: any, res) => {
  try {
    const { filePaths } = req.body;

    if (!Array.isArray(filePaths)) {
      return res.status(400).json({
        success: false,
        error: '파일 경로 배열이 필요합니다.'
      });
    }

    let deletedCount = 0;
    const errors: string[] = [];

    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`🗑️ 파일 삭제: ${filePath}`);
        }
      } catch (error) {
        const errorMsg = `${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`❌ 파일 삭제 실패: ${errorMsg}`);
      }
    }

    res.json({
      success: errors.length === 0,
      message: `파일 정리 완료 (삭제: ${deletedCount}개, 실패: ${errors.length}개)`,
      data: {
        deletedCount,
        errors
      }
    });

  } catch (error) {
    console.error('파일 정리 오류:', error);
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
});

export default router;