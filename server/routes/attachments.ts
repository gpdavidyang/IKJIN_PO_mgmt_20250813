import { Router } from 'express';
import { db } from '../db';
import { attachments } from '@shared/schema';
import { eq } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';

const router = Router();

/**
 * GET /api/attachments/:id/download
 * 첨부파일 다운로드 엔드포인트
 */
router.get('/attachments/:id/download', async (req, res) => {
  const attachmentId = parseInt(req.params.id);

  try {
    // Check authentication - cookie only
    let authenticated = false;
    
    // Try JWT from cookie
    const token = req.cookies?.auth_token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        authenticated = true;
        console.log('✅ Attachment download authenticated via cookie token');
      } catch (err) {
        console.log('❌ Invalid cookie token for attachment download:', err.message);
      }
    }
    
    // If not authenticated via token, check session
    if (!authenticated && req.isAuthenticated && req.isAuthenticated()) {
      authenticated = true;
      console.log('✅ Attachment download authenticated via session');
    }
    
    if (!authenticated) {
      return res.status(401).json({ 
        error: '인증이 필요합니다.',
        message: 'Authentication required'
      });
    }
    // 1. 첨부파일 정보 조회 (fileData 컬럼이 없을 수 있으므로 명시적으로 선택)
    const [attachment] = await db
      .select({
        id: attachments.id,
        orderId: attachments.orderId,
        originalName: attachments.originalName,
        storedName: attachments.storedName,
        filePath: attachments.filePath,
        fileSize: attachments.fileSize,
        mimeType: attachments.mimeType,
        uploadedBy: attachments.uploadedBy,
        uploadedAt: attachments.uploadedAt
      })
      .from(attachments)
      .where(eq(attachments.id, attachmentId));

    if (!attachment) {
      return res.status(404).json({ 
        error: '첨부파일을 찾을 수 없습니다.',
        attachmentId 
      });
    }

    // 2. 파일 시스템에서 파일 찾기
    console.log('📄 Looking for file in filesystem...');
    
    let fileName = attachment.filePath;
    if (fileName?.startsWith('db://')) {
      console.log('📄 PDF has db:// prefix, converting to filesystem path...');
      fileName = fileName.replace('db://', '');
    }
    
    const possiblePaths = [
      path.join(process.cwd(), 'attached_assets', fileName),
      path.join(process.cwd(), 'uploads', fileName),
      path.join(process.cwd(), 'uploads', 'temp-pdf', fileName),
      path.join(process.cwd(), fileName)
    ];
    
    let foundPath: string | null = null;
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        foundPath = testPath;
        console.log(`✅ Found PDF file at: ${testPath}`);
        break;
      }
    }
    
    if (foundPath) {
      // Send the file
      const mimeType = attachment.mimeType || 'application/pdf';
      const displayName = attachment.originalName || fileName;
      res.setHeader('Content-Type', mimeType);
      
      // For PDFs, display inline; for other files, download
      if (mimeType.includes('pdf')) {
        res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(displayName)}`);
      } else {
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(displayName)}`);
      }
      
      const fileStream = fs.createReadStream(foundPath);
      fileStream.pipe(res);
    } else {
      // No file found in any location
      console.error(`File not found in any expected location for attachment ${attachmentId}`);
      return res.status(404).json({ 
        error: '파일을 찾을 수 없습니다.',
        fileName: attachment.originalName || 'Unknown file',
        attachmentId
      });
    }
    
  } catch (error) {
    console.error('Attachment download error:', error);
    res.status(500).json({ 
      error: '파일 다운로드 중 오류가 발생했습니다.',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;