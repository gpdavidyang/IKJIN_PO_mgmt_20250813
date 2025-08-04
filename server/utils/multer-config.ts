/**
 * Centralized Multer configuration with Korean filename support
 */

import multer from "multer";
import path from "path";
import fs from "fs";
import { decodeKoreanFilename } from "./korean-filename";

// Configure upload directory
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Standard multer configuration with Korean filename handling
 */
export const createMulterConfig = (prefix: string = 'FILE') => {
  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        console.log(`💾 ${prefix} - Multer filename callback`);
        console.log(`💾 ${prefix} - Raw originalname:`, file.originalname);
        console.log(`💾 ${prefix} - Raw bytes:`, Buffer.from(file.originalname));
        
        // Fix Korean filename encoding
        const decodedName = decodeKoreanFilename(file.originalname);
        file.originalname = decodedName;
        
        // Generate unique filename for filesystem
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = uniqueSuffix.toString();
        
        console.log(`💾 ${prefix} - Decoded originalname:`, decodedName);
        console.log(`💾 ${prefix} - Generated filename:`, filename);
        
        cb(null, filename);
      }
    }),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 10, // Allow up to 10 files
    },
    fileFilter: (req, file, cb) => {
      console.log(`🔍 ${prefix} - File filter - fieldname:`, file.fieldname);
      console.log(`🔍 ${prefix} - File filter - originalname:`, file.originalname);
      console.log(`🔍 ${prefix} - File filter - mimetype:`, file.mimetype);
      
      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/dwg",
        "application/x-dwg",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
        "application/vnd.ms-excel.sheet.macroEnabled.12", // .xlsm (대문자 E)
        "application/vnd.ms-excel.sheet.macroenabled.12", // .xlsm (소문자 e)
        "application/vnd.ms-excel",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      
      if (allowedTypes.includes(file.mimetype)) {
        console.log(`✅ ${prefix} - File type accepted:`, file.mimetype);
        cb(null, true);
      } else {
        console.log(`❌ ${prefix} - File type rejected:`, file.mimetype);
        cb(new Error(`File type not allowed: ${file.mimetype}`), false);
      }
    },
  });
};

/**
 * Main upload instance for general use
 */
export const upload = createMulterConfig('MAIN');

/**
 * Upload instance for order-specific files
 */
export const orderUpload = createMulterConfig('ORDER');

/**
 * Upload instance for company logos
 */
export const logoUpload = createMulterConfig('LOGO');

/**
 * Excel 파싱 전용 메모리 스토리지 multer 설정
 */
export const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    console.log(`🔍 EXCEL - File filter - fieldname:`, file.fieldname);
    console.log(`🔍 EXCEL - File filter - originalname:`, file.originalname);
    console.log(`🔍 EXCEL - File filter - mimetype:`, file.mimetype);
    
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel.sheet.macroEnabled.12", // .xlsm (대문자 E)
      "application/vnd.ms-excel.sheet.macroenabled.12", // .xlsm (소문자 e)
      "application/vnd.ms-excel", // .xls
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      console.log(`✅ EXCEL - File type accepted:`, file.mimetype);
      cb(null, true);
    } else {
      console.log(`❌ EXCEL - File type rejected:`, file.mimetype);
      cb(new Error(`Excel 파일만 허용됩니다. 현재 타입: ${file.mimetype}`), false);
    }
  },
});

/**
 * Export the upload directory path
 */
export { uploadDir };