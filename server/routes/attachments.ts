import { Router } from 'express';
import { db } from '../db';
import { attachments } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../local-auth';
import path from 'path';
import fs from 'fs';

const router = Router();

/**
 * GET /api/attachments/:id/download
 * 첨부파일 다운로드 엔드포인트
 */
router.get('/attachments/:id/download', requireAuth, async (req, res) => {
  const attachmentId = parseInt(req.params.id);

  try {
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

    // 2. 파일 경로 확인
    const filePath = path.join(process.cwd(), attachment.filePath);
    
    // 3. 파일 존재 여부 확인
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return res.status(404).json({ 
        error: '파일을 찾을 수 없습니다.',
        fileName: attachment.fileName
      });
    }

    // 4. 파일 전송
    const fileName = attachment.originalName || attachment.fileName;
    
    res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Attachment download error:', error);
    res.status(500).json({ 
      error: '파일 다운로드 중 오류가 발생했습니다.',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;