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
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel.sheet.macroEnabled.12', // .xlsm (대문자 E)
      'application/vnd.ms-excel.sheet.macroenabled.12', // .xlsm (소문자 e)
      'application/vnd.ms-excel' // .xls
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