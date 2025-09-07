import { apiRequest } from "@/lib/queryClient";

/**
 * PDF 생성 서비스 - 다양한 PDF 생성 옵션 제공
 */
export class PDFService {
  private static readonly BASE_URL = '/api/orders';

  /**
   * 기본 PDF 생성 (Professional PDF로 리다이렉트)
   */
  static async generateBasicPDF(orderData: any) {
    console.log(`📄 [PDFService] 기본 PDF 생성 요청 - Professional PDF로 전환`);
    
    // 이제 모든 PDF 생성은 Professional PDF를 사용
    return apiRequest(`${this.BASE_URL}/generate-pdf`, {
      method: 'POST',
      body: JSON.stringify(orderData),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * 특정 발주서의 PDF 재생성 (Professional PDF 사용)
   */
  static async regeneratePDF(orderId: string | number) {
    console.log(`📄 [PDFService] PDF 재생성 요청 - Professional PDF 사용: Order ID ${orderId}`);
    
    return apiRequest(`${this.BASE_URL}/${orderId}/regenerate-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * 전문적 PDF 생성 (NEW - 향상된 레이아웃)
   * 데이터베이스의 포괄적인 정보를 활용하여 전문적인 발주서 생성
   */
  static async generateProfessionalPDF(orderId: string | number) {
    console.log(`📄 [PDFService] 전문적 PDF 생성 요청: Order ID ${orderId}`);
    
    try {
      const response = await apiRequest(`${this.BASE_URL}/${orderId}/generate-professional-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`✅ [PDFService] 전문적 PDF 생성 성공:`, response);
      return response;
    } catch (error) {
      console.error(`❌ [PDFService] 전문적 PDF 생성 실패:`, error);
      throw error;
    }
  }

  /**
   * 테스트용 전문적 PDF 생성 (개발 환경 전용)
   */
  static async testProfessionalPDF(orderId?: string | number, userId?: string) {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('테스트 엔드포인트는 개발 환경에서만 사용 가능합니다.');
    }

    console.log(`🧪 [PDFService] 테스트 전문적 PDF 생성 요청`);
    
    try {
      const response = await apiRequest(`${this.BASE_URL}/test-professional-pdf`, {
        method: 'POST',
        body: JSON.stringify({ orderId, userId }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`✅ [PDFService] 테스트 PDF 생성 성공:`, response);
      return response;
    } catch (error) {
      console.error(`❌ [PDFService] 테스트 PDF 생성 실패:`, error);
      throw error;
    }
  }

  /**
   * PDF 다운로드 URL 생성
   */
  static getDownloadUrl(timestamp: string, download = true) {
    return `${this.BASE_URL}/download-pdf/${timestamp}${download ? '?download=true' : ''}`;
  }

  /**
   * 첨부파일로 저장된 PDF 다운로드 URL
   */
  static getAttachmentDownloadUrl(attachmentId: string | number, download = true) {
    return `/api/attachments/${attachmentId}${download ? '?download=true' : ''}`;
  }

  /**
   * PDF 타입별 생성 옵션
   */
  static readonly PDFTypes = {
    BASIC: 'basic',
    ENHANCED: 'enhanced', 
    PROFESSIONAL: 'professional'
  } as const;

  /**
   * PDF 생성 상태 확인
   */
  static async checkPDFStatus(attachmentId: string | number) {
    try {
      const response = await apiRequest(`/api/attachments/${attachmentId}`);
      return {
        exists: true,
        fileSize: response.fileSize,
        createdAt: response.uploadedAt,
        fileName: response.originalName
      };
    } catch (error) {
      return {
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 여러 PDF 타입 동시 생성 (개발/테스트용)
   */
  static async generateAllPDFTypes(orderId: string | number) {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('다중 PDF 생성은 개발 환경에서만 지원됩니다.');
    }

    console.log(`📄 [PDFService] 모든 타입 PDF 생성 시작: Order ID ${orderId}`);
    
    const results = {
      basic: null as any,
      professional: null as any,
      errors: [] as string[]
    };

    // 기본 PDF 재생성
    try {
      results.basic = await this.regeneratePDF(orderId);
      console.log('✅ 기본 PDF 생성 완료');
    } catch (error) {
      const errorMsg = `기본 PDF 생성 실패: ${error instanceof Error ? error.message : 'Unknown error'}`;
      results.errors.push(errorMsg);
      console.error('❌', errorMsg);
    }

    // 전문적 PDF 생성
    try {
      results.professional = await this.generateProfessionalPDF(orderId);
      console.log('✅ 전문적 PDF 생성 완료');
    } catch (error) {
      const errorMsg = `전문적 PDF 생성 실패: ${error instanceof Error ? error.message : 'Unknown error'}`;
      results.errors.push(errorMsg);
      console.error('❌', errorMsg);
    }

    console.log(`📊 [PDFService] PDF 생성 결과:`, results);
    return results;
  }
}

export default PDFService;