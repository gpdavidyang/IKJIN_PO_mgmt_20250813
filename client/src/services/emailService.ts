import { apiRequest } from "@/lib/queryClient";

export interface EmailData {
  to: string[];
  cc?: string[];
  subject: string;
  message?: string;
  selectedAttachmentIds: number[];
  customFiles?: File[]; // 사용자가 업로드한 파일들
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
  warning?: string; // PDF 생성 실패 등 경고 메시지
}

export class EmailService {
  private static readonly BASE_URL = '/api/po-template';
  
  /**
   * PDF 생성 실패 시 사용자 확인 다이얼로그 표시
   */
  private static async showPdfGenerationFailureDialog(): Promise<boolean> {
    return new Promise((resolve) => {
      const message = `PDF 파일 생성에 실패했습니다.\n\nPDF 없이 이메일을 발송하시겠습니까?\n(Excel 파일과 기타 첨부파일은 포함됩니다)`;
      
      // 브라우저 기본 confirm 다이얼로그 사용
      // 실제 구현에서는 더 나은 UI 컴포넌트 사용 가능
      const result = window.confirm(message);
      resolve(result);
    });
  }

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
      orderId?: number | string; // Add orderId for email history recording
      orderNumber: string;
      vendorName: string;
      orderDate: string;
      totalAmount: number;
      siteName?: string;
      filePath?: string;
      attachmentUrls?: string[];
    },
    emailData: EmailData
  ): Promise<EmailSendResponse> {
    // filePath가 있으면 기존 방식 사용
    if (orderData.filePath) {
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

      emailRequest.attachments = [];
      
      if (orderData.attachmentUrls && orderData.attachmentUrls.length > 0) {
        emailRequest.attachments = orderData.attachmentUrls.map((url, index) => ({
          path: url,
          filename: `첨부파일_${orderData.orderNumber}_${index + 1}`
        }));
      }

      try {
        return await apiRequest('POST', `${this.BASE_URL}/send-email`, emailRequest);
      } catch (error) {
        console.error('Email send error:', error);
        throw new Error('이메일 발송 중 오류가 발생했습니다.');
      }
    } 
    
    // filePath가 없으면 orders 엔드포인트 사용 (첨부파일 포함 이메일 발송)
    try {
      // 사용자 업로드 파일이 있으면 FormData 사용, 없으면 JSON 사용
      if (emailData.customFiles && emailData.customFiles.length > 0) {
        console.log('📎 사용자 업로드 파일 포함:', emailData.customFiles.length);
        
        // FormData로 전송 (파일 포함)
        const formData = new FormData();
        
        // 기본 데이터 추가
        formData.append('orderData', JSON.stringify({
          orderId: orderData.orderId,
          orderNumber: orderData.orderNumber,
          vendorName: orderData.vendorName,
          orderDate: orderData.orderDate,
          totalAmount: orderData.totalAmount,
          siteName: orderData.siteName
        }));
        
        formData.append('to', JSON.stringify(emailData.to));
        if (emailData.cc && emailData.cc.length > 0) {
          formData.append('cc', JSON.stringify(emailData.cc));
        }
        formData.append('subject', emailData.subject);
        if (emailData.message) {
          formData.append('message', emailData.message);
        }
        formData.append('selectedAttachmentIds', JSON.stringify(emailData.selectedAttachmentIds));
        
        // 첨부파일 URL 추가
        if (orderData.attachmentUrls && orderData.attachmentUrls.length > 0) {
          formData.append('attachmentUrls', JSON.stringify(orderData.attachmentUrls));
          console.log('📎 첨부파일 URL 추가:', orderData.attachmentUrls);
        }
        
        // 사용자 업로드 파일 추가
        emailData.customFiles.forEach((file, index) => {
          formData.append(`customFiles`, file);
          console.log(`📎 사용자 파일 추가: ${file.name} (${file.size} bytes)`);
        });
        
        // FormData로 API 요청 (apiRequest 대신 fetch 직접 사용)
        const response = await fetch('/api/orders/send-email-with-files', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        return {
          success: true,
          messageId: result.messageId
        };
      } else {
        // JSON으로 전송 (기존 방식)
        const requestData: any = {
          orderData: {
            orderId: orderData.orderId, // Include orderId for email history recording
            orderNumber: orderData.orderNumber,
            vendorName: orderData.vendorName,
            orderDate: orderData.orderDate,
            totalAmount: orderData.totalAmount,
            siteName: orderData.siteName
          },
          to: emailData.to,
          cc: emailData.cc,
          subject: emailData.subject,
          message: emailData.message,
          selectedAttachmentIds: emailData.selectedAttachmentIds,
          attachmentUrls: orderData.attachmentUrls,
          emailSettings: {
            subject: emailData.subject,
            message: emailData.message,
            cc: emailData.cc
          }
        };
        
        // 상세 로깅 추가
        console.log('📧 [CLIENT DEBUG] 이메일 API 요청 데이터 검증:');
        console.log('  ├─ orderData.orderId:', orderData.orderId);
        console.log('  ├─ orderData.orderNumber:', orderData.orderNumber);
        console.log('  ├─ emailData.to:', emailData.to);
        console.log('  ├─ emailData.selectedAttachmentIds:', emailData.selectedAttachmentIds);
        console.log('  ├─ selectedAttachmentIds 길이:', emailData.selectedAttachmentIds?.length || 0);
        console.log('  ├─ selectedAttachmentIds 타입:', typeof emailData.selectedAttachmentIds);
        console.log('  ├─ selectedAttachmentIds 상세:', JSON.stringify(emailData.selectedAttachmentIds));
        
        // Excel 파일 ID 확인
        if (emailData.selectedAttachmentIds && emailData.selectedAttachmentIds.length > 0) {
          console.log('📊 [CLIENT DEBUG] Excel 파일 첨부 체크:');
          emailData.selectedAttachmentIds.forEach((id, index) => {
            console.log(`  ├─ 첨부파일 [${index}]: ID = ${id} (타입: ${typeof id})`);
          });
        } else {
          console.warn('⚠️ [CLIENT DEBUG] selectedAttachmentIds가 비어있음!');
        }
        
        // 첨부파일 URL이 있으면 로그 출력
        if (orderData.attachmentUrls && orderData.attachmentUrls.length > 0) {
          console.log('📎 [CLIENT DEBUG] 첨부파일 URL 추가:', orderData.attachmentUrls);
        }
        
        console.log('📧 [CLIENT DEBUG] 최종 API 요청 데이터:', requestData);
        const response = await apiRequest('POST', '/api/orders/send-email', requestData);
        
        return {
          success: true,
          messageId: response.messageId
        };
      }
    } catch (error: any) {
      console.error('Email send error:', error);
      
      // PDF 생성 실패 오류인지 확인
      if (error.message?.includes('첨부할 파일이 생성되지 않았습니다') || 
          error.message?.includes('PDF 생성')) {
        // PDF 생성 실패 시 사용자에게 확인 요청
        const userConfirmed = await this.showPdfGenerationFailureDialog();
        
        if (userConfirmed) {
          // PDF 없이 이메일 발송 재시도
          console.log('📧 PDF 없이 이메일 발송 재시도');
          
          const requestData: any = {
            orderData: {
              orderId: orderData.orderId,
              orderNumber: orderData.orderNumber,
              vendorName: orderData.vendorName,
              orderDate: orderData.orderDate,
              totalAmount: orderData.totalAmount,
              siteName: orderData.siteName
            },
            to: emailData.to,
            cc: emailData.cc,
            subject: emailData.subject,
            message: emailData.message,
            selectedAttachmentIds: emailData.selectedAttachmentIds,
            attachmentUrls: orderData.attachmentUrls,
            skipPdfGeneration: true, // PDF 생성 건너뛰기 플래그
            emailSettings: {
              subject: emailData.subject,
              message: emailData.message,
              cc: emailData.cc
            }
          };
          
          try {
            const response = await apiRequest('POST', '/api/orders/send-email', requestData);
            return {
              success: true,
              messageId: response.messageId,
              warning: 'PDF 파일 없이 이메일이 발송되었습니다.'
            };
          } catch (retryError) {
            console.error('Email send retry error:', retryError);
            throw new Error('PDF 없이 이메일 발송을 시도했으나 실패했습니다.');
          }
        } else {
          throw new Error('PDF 생성 실패로 이메일 발송이 취소되었습니다.');
        }
      }
      
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