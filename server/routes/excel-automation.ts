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

// 파일 업로드 설정 - Vercel serverless 환경 지원
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Vercel 환경에서는 /tmp 디렉토리만 쓰기 가능
    const uploadDir = process.env.VERCEL ? '/tmp' : 'uploads';
    if (!process.env.VERCEL && !fs.existsSync(uploadDir)) {
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
    console.log('=== Excel Automation File Upload Debug ===');
    console.log('File name:', file.originalname);
    console.log('File MIME type:', file.mimetype);
    
    // Check both MIME type and file extension for Excel files
    const validMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.ms-excel.sheet.macroEnabled.12',
      'application/octet-stream' // Sometimes Excel files are uploaded as octet-stream
    ];
    
    const fileName = file.originalname.toLowerCase();
    const hasValidExtension = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.xlsm');
    const hasValidMimeType = validMimeTypes.includes(file.mimetype);
    
    console.log('Valid MIME type:', hasValidMimeType);
    console.log('Valid extension:', hasValidExtension);
    
    if (hasValidMimeType && hasValidExtension) {
      console.log('File accepted:', file.originalname);
      cb(null, true);
    } else {
      console.log('File rejected:', file.originalname, 'MIME type:', file.mimetype, 'Extension valid:', hasValidExtension);
      cb(new Error('Only Excel files are allowed'));
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
  console.log(`🚀 [API] Excel automation request received`);
  DebugLogger.logExecutionPath('/api/excel-automation/upload-and-process', 'ExcelAutomationService.processExcelUpload');
  
  // Vercel timeout 방지를 위한 응답 보장 (55초 타임아웃 설정)
  const timeoutDuration = process.env.VERCEL ? 55000 : 120000; // Vercel: 55초, 로컬: 120초
  let responseHandled = false;
  
  const timeoutHandler = setTimeout(() => {
    if (!responseHandled) {
      console.log(`⏱️ [API] Processing timeout reached (${timeoutDuration}ms)`);
      responseHandled = true;
      res.status(202).json({
        success: false,
        error: '처리 시간이 초과되었습니다. 파일이 너무 크거나 복잡할 수 있습니다.',
        code: 'TIMEOUT',
        message: '더 작은 파일로 다시 시도하거나 파일을 나누어 업로드해주세요.'
      });
    }
  }, timeoutDuration);
  
  try {
    console.log(`🔍 [API] Request file:`, req.file ? 'Present' : 'Missing');
    console.log(`🔍 [API] Request user:`, req.user ? `ID: ${req.user.id}` : 'Missing');
    
    if (!req.file) {
      console.log(`❌ [API] No file uploaded`);
      clearTimeout(timeoutHandler);
      responseHandled = true;
      return res.status(400).json({ 
        success: false,
        error: '파일이 업로드되지 않았습니다.' 
      });
    }

    const filePath = req.file.path;
    const userId = req.user?.id;

    if (!userId) {
      console.log(`❌ [API] User not authenticated`);
      clearTimeout(timeoutHandler);
      responseHandled = true;
      return res.status(401).json({
        success: false,
        error: '사용자 인증이 필요합니다.'
      });
    }

    console.log(`📁 [API] Excel 자동화 처리 시작: ${filePath}, 사용자: ${userId}, 파일크기: ${req.file.size}bytes`);

    // 통합 자동화 프로세스 실행 (필드 검증은 프론트엔드에서 수행)
    console.log(`🔄 [API] ExcelAutomationService.processExcelUpload 호출 시작`);
    const result = await ExcelAutomationService.processExcelUpload(filePath, userId);
    console.log(`✅ [API] ExcelAutomationService.processExcelUpload 완료:`, result.success ? '성공' : '실패');

    if (!result.success) {
      // 실패 시 업로드된 파일 정리
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      clearTimeout(timeoutHandler);
      if (!responseHandled) {
        responseHandled = true;
        return res.status(400).json(result);
      }
      return;
    }

    // 성공 응답
    clearTimeout(timeoutHandler);
    if (!responseHandled) {
      responseHandled = true;
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
    }

  } catch (error) {
    clearTimeout(timeoutHandler);
    console.error('❌ [API] Excel 자동화 처리 오류:', error);
    
    // 오류 시 업로드된 파일 정리
    if (req.file?.path && fs.existsSync(req.file.path)) {
      console.log(`🗑️ [API] 오류로 인한 임시 파일 정리: ${req.file.path}`);
      fs.unlinkSync(req.file.path);
    }
    
    // 더 구체적인 에러 메시지 제공
    let errorMessage = '서버 오류가 발생했습니다.';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('Database') || error.message.includes('connection')) {
        errorMessage = '데이터베이스 연결 오류가 발생했습니다.';
        statusCode = 503;
      } else if (error.message.includes('timeout')) {
        errorMessage = '처리 시간이 초과되었습니다. 파일 크기를 확인해주세요.';
        statusCode = 408;
      } else if (error.message.includes('memory') || error.message.includes('Memory')) {
        errorMessage = '메모리 부족으로 처리할 수 없습니다. 더 작은 파일로 시도해주세요.';
        statusCode = 413;
      } else if (error.message.includes('parse') || error.message.includes('Excel')) {
        errorMessage = 'Excel 파일 형식에 오류가 있습니다. 템플릿을 확인해주세요.';
        statusCode = 422;
      }
    }
    
    console.error(`❌ [API] 최종 응답: ${statusCode} - ${errorMessage}`);
    
    if (!responseHandled) {
      responseHandled = true;
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
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
      emailOptions
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
 * 디버그용 단계별 처리 테스트
 * POST /api/excel-automation/debug-upload
 */
router.post('/debug-upload', requireAuth, upload.single('file'), async (req: any, res) => {
  console.log(`🐛 [DEBUG] Excel automation debug request received`);
  
  let step = 0;
  const startTime = Date.now();
  
  try {
    step = 1;
    console.log(`🐛 [DEBUG] Step ${step}: Request validation`);
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: '파일이 업로드되지 않았습니다.',
        step,
        duration: Date.now() - startTime
      });
    }

    step = 2;
    console.log(`🐛 [DEBUG] Step ${step}: Database connection test`);
    
    // DB 연결 테스트 - 이 부분에서 멈출 수 있음
    const { db } = await import('../db');
    const { purchaseOrders } = await import('@shared/schema');
    await db.select().from(purchaseOrders).limit(1);
    console.log(`🐛 [DEBUG] Step ${step} PASSED: DB connection OK`);

    step = 3;
    console.log(`🐛 [DEBUG] Step ${step}: File path check`);
    const filePath = req.file.path;
    const fs = await import('fs');
    if (!fs.existsSync(filePath)) {
      return res.status(400).json({
        success: false,
        error: '업로드된 파일을 찾을 수 없습니다.',
        step,
        duration: Date.now() - startTime
      });
    }
    console.log(`🐛 [DEBUG] Step ${step} PASSED: File exists at ${filePath}`);

    step = 4;
    console.log(`🐛 [DEBUG] Step ${step}: Excel parsing test`);
    const { POTemplateProcessorMock } = await import('../utils/po-template-processor-mock');
    const parseResult = POTemplateProcessorMock.parseInputSheet(filePath);
    
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: `Excel 파싱 실패: ${parseResult.error}`,
        step,
        duration: Date.now() - startTime
      });
    }
    console.log(`🐛 [DEBUG] Step ${step} PASSED: Excel parsing OK - ${parseResult.totalOrders} orders`);

    // 성공 응답
    return res.json({
      success: true,
      message: '디버그 테스트 완료',
      step,
      duration: Date.now() - startTime,
      data: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        parsedOrders: parseResult.totalOrders,
        parsedItems: parseResult.totalItems
      }
    });

  } catch (error) {
    console.error(`🐛 [DEBUG] Error at step ${step}:`, error);
    return res.status(500).json({
      success: false,
      error: `Step ${step}에서 오류 발생: ${error instanceof Error ? error.message : 'Unknown error'}`,
      step,
      duration: Date.now() - startTime
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