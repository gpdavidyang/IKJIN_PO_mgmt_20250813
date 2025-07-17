import { Router } from 'express';
import multer from 'multer';
import { parseExcelInputSheet, validateParsedData } from '../utils/excel-parser.js';
import { validateMultipleVendors, validateVendorName } from '../utils/vendor-validation.js';

const router = Router();

// 파일 업로드 설정 (메모리에 저장)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 제한
  },
  fileFilter: (req, file, cb) => {
    // Excel 파일만 허용
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Excel 파일만 업로드 가능합니다. (.xlsx, .xls)'));
    }
  },
});

/**
 * POST /api/excel-automation/parse-input-sheet
 * Input Sheet의 A:M 열을 파싱하여 JSON으로 반환
 */
router.post('/parse-input-sheet', upload.single('excel'), async (req, res) => {
  try {
    // 인증 확인
    if (!req.isAuthenticated()) {
      return res.status(401).json({ 
        success: false, 
        error: '로그인이 필요합니다.' 
      });
    }

    // 파일 확인
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'Excel 파일이 업로드되지 않았습니다.' 
      });
    }

    console.log('엑셀 파일 파싱 시작:', {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });

    // Input Sheet 파싱
    const parsedData = parseExcelInputSheet(req.file.buffer);
    
    // 데이터 검증
    const validation = validateParsedData(parsedData);
    
    console.log('파싱 완료:', {
      totalRows: validation.totalRows,
      errors: validation.errors.length,
      warnings: validation.warnings.length,
    });

    // 결과 반환
    res.json({
      success: true,
      data: {
        rows: parsedData,
        validation: {
          isValid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings,
          totalRows: validation.totalRows,
        },
        meta: {
          uploadedBy: req.user?.id,
          uploadedAt: new Date().toISOString(),
          filename: req.file.originalname,
        },
      },
    });

  } catch (error) {
    console.error('엑셀 파싱 오류:', error);
    
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    });
  }
});

/**
 * POST /api/excel-automation/validate-data
 * 파싱된 데이터의 유효성을 검증
 */
router.post('/validate-data', async (req, res) => {
  try {
    // 인증 확인
    if (!req.isAuthenticated()) {
      return res.status(401).json({ 
        success: false, 
        error: '로그인이 필요합니다.' 
      });
    }

    const { data } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: '검증할 데이터가 올바르지 않습니다.',
      });
    }

    // 데이터 검증
    const validation = validateParsedData(data);

    res.json({
      success: true,
      validation,
    });

  } catch (error) {
    console.error('데이터 검증 오류:', error);
    
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    });
  }
});

/**
 * POST /api/excel-automation/validate-vendors
 * 거래처/납품처 존재 여부 확인 및 유사 업체 추천
 */
router.post('/validate-vendors', async (req, res) => {
  try {
    // 인증 확인
    if (!req.isAuthenticated()) {
      return res.status(401).json({ 
        success: false, 
        error: '로그인이 필요합니다.' 
      });
    }

    const { vendorData } = req.body;

    if (!vendorData || !Array.isArray(vendorData)) {
      return res.status(400).json({
        success: false,
        error: '검증할 거래처 데이터가 올바르지 않습니다.',
      });
    }

    console.log(`🔄 거래처/납품처 검증 요청: ${vendorData.length}개 항목`);

    // 다중 거래처 검증
    const validationResult = await validateMultipleVendors(vendorData);

    // 미등록 업체 추출
    const unregisteredVendors = validationResult.vendorValidations.filter(v => !v.exists);
    const unregisteredDeliveries = validationResult.deliveryValidations.filter(v => !v.exists);
    const emailConflicts = validationResult.emailConflicts.filter(e => e.type === 'conflict');

    console.log(`✅ 검증 완료: 미등록 거래처=${unregisteredVendors.length}, 미등록 납품처=${unregisteredDeliveries.length}, 이메일충돌=${emailConflicts.length}`);

    res.json({
      success: true,
      data: {
        vendorValidations: validationResult.vendorValidations,
        deliveryValidations: validationResult.deliveryValidations,
        emailConflicts: validationResult.emailConflicts,
        summary: {
          totalVendors: validationResult.vendorValidations.length,
          totalDeliveries: validationResult.deliveryValidations.length,
          unregisteredVendors: unregisteredVendors.length,
          unregisteredDeliveries: unregisteredDeliveries.length,
          emailConflicts: emailConflicts.length,
          needsAction: unregisteredVendors.length > 0 || unregisteredDeliveries.length > 0 || emailConflicts.length > 0,
        },
      },
    });

  } catch (error) {
    console.error('거래처 검증 오류:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '거래처 검증 중 오류가 발생했습니다.',
    });
  }
});

/**
 * POST /api/excel-automation/validate-single-vendor
 * 단일 거래처/납품처 검증
 */
router.post('/validate-single-vendor', async (req, res) => {
  try {
    // 인증 확인
    if (!req.isAuthenticated()) {
      return res.status(401).json({ 
        success: false, 
        error: '로그인이 필요합니다.' 
      });
    }

    const { vendorName, vendorType } = req.body;

    if (!vendorName || !vendorType) {
      return res.status(400).json({
        success: false,
        error: '거래처명과 타입(거래처/납품처)이 필요합니다.',
      });
    }

    if (!['거래처', '납품처'].includes(vendorType)) {
      return res.status(400).json({
        success: false,
        error: '거래처 타입은 "거래처" 또는 "납품처"여야 합니다.',
      });
    }

    console.log(`🔍 단일 ${vendorType} 검증: "${vendorName}"`);

    // 단일 거래처 검증
    const validationResult = await validateVendorName(vendorName, vendorType);

    res.json({
      success: true,
      data: validationResult,
    });

  } catch (error) {
    console.error('단일 거래처 검증 오류:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '거래처 검증 중 오류가 발생했습니다.',
    });
  }
});

export default router;