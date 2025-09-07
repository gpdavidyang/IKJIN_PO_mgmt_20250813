/**
 * Excel 첨부파일 처리 서비스
 * Input 시트가 제거된 Excel 파일을 attachments 테이블에 저장
 */

import { db } from '../db';
import { attachments } from '@shared/schema';
import fs from 'fs';
import path from 'path';

export interface ExcelAttachmentResult {
  success: boolean;
  attachmentId?: number;
  error?: string;
}

export class ExcelAttachmentService {
  
  /**
   * 처리된 Excel 파일을 attachments 테이블에 저장
   * @param orderId 발주서 ID
   * @param processedExcelPath 처리된 Excel 파일 경로 (Input 시트 제거됨)
   * @param originalFileName 원본 파일명
   * @param uploadedBy 업로드한 사용자 ID
   * @param orderNumber 발주서 번호 (파일명 생성용)
   */
  static async saveProcessedExcelFile(
    orderId: number,
    processedExcelPath: string,
    originalFileName: string,
    uploadedBy: string,
    orderNumber?: string
  ): Promise<ExcelAttachmentResult> {
    
    try {
      console.log(`📎 Excel 첨부파일 저장 시작: ${processedExcelPath}`);
      
      // 파일 존재 확인
      if (!fs.existsSync(processedExcelPath)) {
        return {
          success: false,
          error: `처리된 Excel 파일을 찾을 수 없습니다: ${processedExcelPath}`
        };
      }
      
      // 파일 정보 수집
      const stats = fs.statSync(processedExcelPath);
      
      // 표준화된 파일명 생성: IKJIN_[PO번호]_[YYYYMMDD].xlsx
      let standardizedFileName: string;
      if (orderNumber) {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
        standardizedFileName = `IKJIN_${orderNumber}_${dateStr}.xlsx`;
      } else {
        // orderNumber가 없으면 원본 파일명 사용
        standardizedFileName = originalFileName;
      }
      
      console.log(`📝 표준화된 Excel 파일명: ${standardizedFileName}`);
      
      // Base64로 파일 내용 읽기 (Vercel 환경 대응)
      const fileBuffer = fs.readFileSync(processedExcelPath);
      const base64Data = fileBuffer.toString('base64');
      
      // DB에 첨부파일 정보 저장
      const [attachment] = await db.insert(attachments).values({
        orderId,
        originalName: standardizedFileName, // 표준화된 파일명 사용
        storedName: standardizedFileName,
        filePath: `db://${standardizedFileName}`, // Base64 저장 표시
        fileSize: stats.size,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        uploadedBy,
        uploadedAt: new Date(),
        fileData: base64Data // Base64 데이터 저장
      }).returning({ id: attachments.id });
      
      console.log(`✅ Excel 첨부파일 저장 완료: ID ${attachment.id}, 크기: ${Math.round(stats.size / 1024)}KB`);
      
      return {
        success: true,
        attachmentId: attachment.id
      };
      
    } catch (error) {
      console.error('❌ Excel 첨부파일 저장 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * 원본 Excel 파일도 첨부파일로 저장 (필요시)
   */
  static async saveOriginalExcelFile(
    orderId: number,
    originalExcelPath: string,
    originalFileName: string,
    uploadedBy: string
  ): Promise<ExcelAttachmentResult> {
    
    try {
      console.log(`📎 원본 Excel 첨부파일 저장 시작: ${originalExcelPath}`);
      
      // 파일 존재 확인
      if (!fs.existsSync(originalExcelPath)) {
        return {
          success: false,
          error: `원본 Excel 파일을 찾을 수 없습니다: ${originalExcelPath}`
        };
      }
      
      // 파일 정보 수집
      const stats = fs.statSync(originalExcelPath);
      const fileName = `original_${path.basename(originalExcelPath)}`;
      
      // Base64로 파일 내용 읽기
      const fileBuffer = fs.readFileSync(originalExcelPath);
      const base64Data = fileBuffer.toString('base64');
      
      // DB에 첨부파일 정보 저장
      const [attachment] = await db.insert(attachments).values({
        orderId,
        originalName: `[원본] ${originalFileName}`,
        storedName: fileName,
        filePath: `db://${fileName}`,
        fileSize: stats.size,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        uploadedBy,
        uploadedAt: new Date(),
        fileData: base64Data
      }).returning({ id: attachments.id });
      
      console.log(`✅ 원본 Excel 첨부파일 저장 완료: ID ${attachment.id}`);
      
      return {
        success: true,
        attachmentId: attachment.id
      };
      
    } catch (error) {
      console.error('❌ 원본 Excel 첨부파일 저장 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}