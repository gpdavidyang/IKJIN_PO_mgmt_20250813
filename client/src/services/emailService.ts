import { apiRequest } from "@/lib/queryClient";

export interface EmailData {
  to: string[];
  cc?: string[];
  subject: string;
  message?: string;
  attachPDF: boolean;
  attachExcel: boolean;
}

export interface EmailSendRequest {
  to: string | string[];
  cc?: string | string[];
  poData: {
    orderNumber: string;
    orderDate: string;
    siteName?: string;
    vendorName: string;
    totalAmount: number;
  };
  attachments?: Array<{
    path: string;
    filename: string;
  }>;
  subject?: string;
  additionalMessage?: string;
}

export interface EmailSendResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  mockMode?: boolean;
}

export class EmailService {
  private static readonly BASE_URL = '/api/po-template';

  /**
   * 원본 형식 유지 발주서 이메일 발송 (Input 시트만 제거)
   * 엑셀 파일의 원본 형식(테두리, 병합, 색상 등)을 그대로 유지
   */
  static async sendPurchaseOrderEmailOriginalFormat(
    filePath: string,
    emailOptions: {
      to: string | string[];
      cc?: string | string[];
      bcc?: string | string[];
      subject?: string;
      orderNumber?: string;
      vendorName?: string;
      orderDate?: string;
      dueDate?: string;
      totalAmount?: number;
      additionalMessage?: string;
    }
  ): Promise<EmailSendResponse> {
    try {
      const result = await apiRequest('POST', `${this.BASE_URL}/send-email-original-format`, {
        filePath,
        ...emailOptions,
      });
      
      return {
        success: true,
        messageId: result.data?.messageId,
      };

    } catch (error) {
      console.error('원본 형식 유지 이메일 발송 오류:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      };
    }
  }

  /**
   * [기존 방식] 발주서 이메일 발송
   * @deprecated 형식 손상 문제로 sendPurchaseOrderEmailOriginalFormat 사용 권장
   */
  static async sendPurchaseOrderEmail(
    orderData: {
      orderNumber: string;
      vendorName: string;
      orderDate: string;
      totalAmount: number;
      siteName?: string;
      filePath?: string;
    },
    emailData: EmailData
  ): Promise<EmailSendResponse> {
    const emailRequest: EmailSendRequest = {
      to: emailData.to,
      cc: emailData.cc,
      subject: emailData.subject,
      additionalMessage: emailData.message,
      poData: {
        orderNumber: orderData.orderNumber,
        orderDate: orderData.orderDate,
        siteName: orderData.siteName,
        vendorName: orderData.vendorName,
        totalAmount: orderData.totalAmount,
      }
    };

    // 첨부파일 경로가 있는 경우 추가
    if (orderData.filePath) {
      emailRequest.attachments = [];
      
      if (emailData.attachExcel) {
        emailRequest.attachments.push({
          path: orderData.filePath,
          filename: `발주서_${orderData.orderNumber}.xlsx`
        });
      }
      
      if (emailData.attachPDF) {
        // PDF 파일 경로는 Excel 파일 경로에서 확장자만 변경
        const pdfPath = orderData.filePath.replace('.xlsx', '.pdf');
        emailRequest.attachments.push({
          path: pdfPath,
          filename: `발주서_${orderData.orderNumber}.pdf`
        });
      }
    }

    try {
      return await apiRequest('POST', `${this.BASE_URL}/send-email`, emailRequest);
    } catch (error) {
      console.error('Email send error:', error);
      throw new Error('이메일 발송 중 오류가 발생했습니다.');
    }
  }

  /**
   * 이메일 연결 테스트
   */
  static async testEmailConnection(): Promise<{ success: boolean; message: string }> {
    try {
      return await apiRequest('GET', `${this.BASE_URL}/test-email`);
    } catch (error) {
      console.error('Email connection test error:', error);
      return {
        success: false,
        message: '이메일 서버 연결 테스트 실패'
      };
    }
  }

  /**
   * 갑지/을지 시트 추출
   */
  static async extractSheets(
    filePath: string, 
    sheets: string[] = ['갑지', '을지']
  ): Promise<{ success: boolean; extractedPath?: string; error?: string }> {
    try {
      return await apiRequest('POST', `${this.BASE_URL}/extract-sheets`, {
        filePath,
        sheets
      });
    } catch (error) {
      console.error('Sheet extraction error:', error);
      throw new Error('시트 추출 중 오류가 발생했습니다.');
    }
  }

  /**
   * Excel을 PDF로 변환
   */
  static async convertToPDF(
    excelPath: string,
    sheets?: string[]
  ): Promise<{ success: boolean; pdfPath?: string; error?: string }> {
    try {
      return await apiRequest('POST', `${this.BASE_URL}/convert-to-pdf`, {
        excelPath,
        sheets
      });
    } catch (error) {
      console.error('PDF conversion error:', error);
      throw new Error('PDF 변환 중 오류가 발생했습니다.');
    }
  }

  /**
   * 통합 처리 (업로드 → 추출 → PDF변환 → 이메일발송)
   */
  static async processComplete(
    file: File,
    options: {
      validateData?: boolean;
      saveToDatabase?: boolean;
      extractSheets?: boolean;
      sheets?: string[];
      generatePDF?: boolean;
      sendEmail?: boolean;
      emailTo?: string;
    }
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    // 옵션들을 FormData에 추가
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          formData.append(key, value.join(','));
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    try {
      return await apiRequest('POST', `${this.BASE_URL}/process-complete`, formData);
    } catch (error) {
      console.error('Complete process error:', error);
      throw new Error('통합 처리 중 오류가 발생했습니다.');
    }
  }
}