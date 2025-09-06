import { Router } from 'express';
import { db } from '../db';
import { attachments } from '@shared/schema';
import { eq } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../local-auth';

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
    // 1. 첨부파일 정보 조회 (fileData 컬럼 포함)
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
        uploadedAt: attachments.uploadedAt,
        fileData: attachments.fileData
      })
      .from(attachments)
      .where(eq(attachments.id, attachmentId));

    if (!attachment) {
      return res.status(404).json({ 
        error: '첨부파일을 찾을 수 없습니다.',
        attachmentId 
      });
    }

    // 2. 먼저 Base64 데이터가 있는지 확인
    if (attachment.fileData) {
      console.log('📄 Serving file from Base64 data in database');
      const mimeType = attachment.mimeType || 'application/pdf';
      const displayName = attachment.originalName || 'file';
      
      try {
        // Base64 데이터를 Buffer로 변환
        const buffer = Buffer.from(attachment.fileData, 'base64');
        
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Length', buffer.length);
        
        // For PDFs, display inline; for other files, download
        if (mimeType.includes('pdf')) {
          res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(displayName)}`);
        } else {
          res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(displayName)}`);
        }
        
        return res.send(buffer);
      } catch (error) {
        console.error('Error decoding Base64 data:', error);
        // 계속해서 파일 시스템 검색 시도
      }
    }

    // 3. Base64 데이터가 없으면 파일 시스템에서 파일 찾기
    console.log('📄 Looking for file in filesystem...');
    
    let fileName = attachment.filePath;
    if (fileName?.startsWith('db://')) {
      console.log('📄 PDF has db:// prefix, converting to filesystem path...');
      fileName = fileName.replace('db://', '');
    }
    
    const possiblePaths = [];
    
    // If it's already an absolute path, use it directly
    if (path.isAbsolute(fileName)) {
      console.log('📄 Using absolute path directly:', fileName);
      possiblePaths.push(fileName);
    } else {
      // Try relative paths
      possiblePaths.push(
        path.join(process.cwd(), 'attached_assets', fileName),
        path.join(process.cwd(), 'uploads', fileName),
        path.join(process.cwd(), 'uploads', 'temp-pdf', fileName),
        path.join(process.cwd(), fileName)
      );
    }
    
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

/**
 * DELETE /api/attachments/:id
 * 첨부파일 삭제 엔드포인트 (Admin Only)
 */
router.delete('/attachments/:id', requireAuth, async (req: any, res) => {
  const attachmentId = parseInt(req.params.id);

  try {
    const { user } = req;
    console.log('🗑️ Attachment delete request received');
    console.log('👤 User info:', { id: user?.id, role: user?.role, name: user?.name });
    
    // Check if user is admin
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Admin access required',
        message: 'Only administrators can delete attachments' 
      });
    }

    console.log(`🗑️ Admin ${user.name} (ID: ${user.id}) requesting deletion of attachment ${attachmentId}`);

    // 1. 첨부파일 정보 조회
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
        uploadedAt: attachments.uploadedAt,
        fileData: attachments.fileData
      })
      .from(attachments)
      .where(eq(attachments.id, attachmentId));

    if (!attachment) {
      return res.status(404).json({ 
        error: '첨부파일을 찾을 수 없습니다.',
        attachmentId 
      });
    }

    console.log(`📄 Found attachment: ${attachment.originalName} (Order: ${attachment.orderId})`);

    // 2. 파일 시스템에서 실제 파일 삭제 시도
    if (attachment.filePath && !attachment.filePath.startsWith('db://')) {
      let fileName = attachment.filePath;
      
      const possiblePaths = [];
      
      // If it's already an absolute path, use it directly
      if (path.isAbsolute(fileName)) {
        possiblePaths.push(fileName);
      } else {
        // Try relative paths
        possiblePaths.push(
          path.join(process.cwd(), 'attached_assets', fileName),
          path.join(process.cwd(), 'uploads', fileName),
          path.join(process.cwd(), 'uploads', 'temp-pdf', fileName),
          path.join(process.cwd(), fileName)
        );
      }
      
      // Try to delete physical file
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          try {
            fs.unlinkSync(testPath);
            console.log(`🗑️ Deleted physical file at: ${testPath}`);
            break;
          } catch (fileError) {
            console.warn(`⚠️ Failed to delete physical file at ${testPath}:`, fileError.message);
          }
        }
      }
    }

    // 3. 데이터베이스에서 첨부파일 레코드 삭제
    const deletedRows = await db
      .delete(attachments)
      .where(eq(attachments.id, attachmentId));

    console.log(`✅ Deleted attachment record from database (affected rows: ${deletedRows})`);

    // 4. 성공 응답
    return res.json({
      success: true,
      message: '첨부파일이 성공적으로 삭제되었습니다.',
      deletedAttachment: {
        id: attachment.id,
        originalName: attachment.originalName,
        orderId: attachment.orderId
      }
    });

  } catch (error) {
    console.error('Attachment deletion error:', error);
    res.status(500).json({ 
      error: '첨부파일 삭제 중 오류가 발생했습니다.',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;