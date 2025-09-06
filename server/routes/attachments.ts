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
    // 1. 첨부파일 정보 조회
    const [attachment] = await db
      .select()
      .from(attachments)
      .where(eq(attachments.id, attachmentId));

    if (!attachment) {
      return res.status(404).json({ 
        error: '첨부파일을 찾을 수 없습니다.',
        attachmentId 
      });
    }

    // 2. Check if file is stored in database (db:// prefix)
    if (attachment.filePath?.startsWith('db://')) {
      // PDF was meant to be stored in database but fileData column is disabled
      // Try to find the file in the filesystem using the stored name
      console.log('📄 PDF has db:// prefix, but fileData column is disabled. Looking for file in filesystem...');
      
      // Extract the filename from the db:// path
      const fileName = attachment.filePath.replace('db://', '');
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
      
      if (!foundPath) {
        console.error('PDF file not found in any expected location:', fileName);
        return res.status(404).json({ 
          error: '파일을 찾을 수 없습니다. PDF 파일이 생성되지 않았거나 삭제되었습니다.',
          fileName: attachment.originalName,
          detail: 'PDF 파일을 다시 생성해주세요.'
        });
      }
      
      // Send the file
      const mimeType = 'application/pdf';
      const displayName = attachment.originalName || fileName;
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(displayName)}`);
      
      const fileStream = fs.createReadStream(foundPath);
      fileStream.pipe(res);
      
    } else {
      // File is stored in filesystem
      const filePath = path.join(process.cwd(), attachment.filePath);
      
      // 3. 파일 존재 여부 확인
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return res.status(404).json({ 
          error: '파일을 찾을 수 없습니다.',
          fileName: attachment.originalName
        });
      }

      // 4. 파일 전송
      const fileName = attachment.originalName || attachment.fileName;
      
      // Set headers based on file type
      const mimeType = attachment.mimeType || 'application/octet-stream';
      res.setHeader('Content-Type', mimeType);
      
      // For PDFs, display inline in browser; for others, download
      if (mimeType.includes('pdf')) {
        res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`);
      } else {
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
      }
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
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