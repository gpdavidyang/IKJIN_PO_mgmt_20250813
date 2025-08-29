/**
 * Client-side PDF Generator
 * 브라우저에서 직접 PDF를 생성하여 서버리스 환경과 호환성 보장
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface ClientPdfOptions {
  filename?: string;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'a3' | 'letter';
  quality?: number; // 0-1
  scale?: number; // 1-5
}

export class ClientPdfGenerator {
  /**
   * HTML 요소를 PDF로 변환
   */
  static async generateFromElement(
    element: HTMLElement,
    options: ClientPdfOptions = {}
  ): Promise<{ success: boolean; blob?: Blob; error?: string }> {
    try {
      const {
        filename = 'document.pdf',
        orientation = 'portrait',
        format = 'a4',
        quality = 0.95,
        scale = 2
      } = options;

      console.log('📄 클라이언트 PDF 생성 시작...');

      // HTML을 캔버스로 변환
      const canvas = await html2canvas(element, {
        scale: scale,
        useCORS: true,
        logging: false,
        letterRendering: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // 캔버스를 이미지로 변환
      const imgData = canvas.toDataURL('image/png', quality);
      
      // PDF 생성
      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: format
      });

      // 페이지 크기 계산
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // 이미지 크기 계산
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // 첫 페이지에 이미지 추가
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // 여러 페이지가 필요한 경우
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Blob으로 변환
      const blob = pdf.output('blob');
      
      console.log('✅ PDF 생성 완료');
      
      return {
        success: true,
        blob
      };

    } catch (error) {
      console.error('❌ 클라이언트 PDF 생성 오류:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  }

  /**
   * PDF 다운로드
   */
  static downloadPdf(blob: Blob, filename: string = 'document.pdf') {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * PDF 미리보기 (새 탭)
   */
  static previewPdf(blob: Blob) {
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
    
    // 10초 후 URL 해제
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 10000);
  }

  /**
   * 서버에서 받은 HTML 문자열을 PDF로 변환
   */
  static async generateFromHtml(
    htmlString: string,
    options: ClientPdfOptions = {}
  ): Promise<{ success: boolean; blob?: Blob; error?: string }> {
    try {
      // 임시 컨테이너 생성
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.width = '210mm'; // A4 width
      container.innerHTML = htmlString;
      
      document.body.appendChild(container);
      
      // PDF 생성
      const result = await this.generateFromElement(container, options);
      
      // 컨테이너 제거
      document.body.removeChild(container);
      
      return result;
      
    } catch (error) {
      console.error('❌ HTML PDF 변환 오류:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  }

  /**
   * 발주서 전용 PDF 생성
   */
  static async generateOrderPdf(
    orderData: any,
    options: ClientPdfOptions = {}
  ): Promise<{ success: boolean; blob?: Blob; error?: string }> {
    try {
      // 발주서 HTML 템플릿 생성
      const html = `
        <div style="font-family: 'Malgun Gothic', sans-serif; padding: 20px;">
          <h1 style="text-align: center; color: #2563eb;">구매 발주서</h1>
          <div style="margin: 20px 0;">
            <h2>발주 정보</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px; background: #f3f4f6;">발주 번호</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${orderData.orderNumber || ''}</td>
                <td style="border: 1px solid #ddd; padding: 8px; background: #f3f4f6;">발주 일자</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${orderData.orderDate || ''}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px; background: #f3f4f6;">프로젝트</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${orderData.projectName || ''}</td>
                <td style="border: 1px solid #ddd; padding: 8px; background: #f3f4f6;">거래처</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${orderData.vendorName || ''}</td>
              </tr>
            </table>
          </div>
          ${orderData.items ? `
            <div style="margin: 20px 0;">
              <h2>발주 품목</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #f3f4f6;">
                    <th style="border: 1px solid #ddd; padding: 8px;">품목명</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">규격</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">수량</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">단가</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">금액</th>
                  </tr>
                </thead>
                <tbody>
                  ${orderData.items.map((item: any) => `
                    <tr>
                      <td style="border: 1px solid #ddd; padding: 8px;">${item.name || ''}</td>
                      <td style="border: 1px solid #ddd; padding: 8px;">${item.specification || ''}</td>
                      <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.quantity || 0}</td>
                      <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.unitPrice?.toLocaleString() || 0}</td>
                      <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.totalPrice?.toLocaleString() || 0}</td>
                    </tr>
                  `).join('')}
                </tbody>
                <tfoot>
                  <tr style="background: #eff6ff;">
                    <td colspan="4" style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">총 금액</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">
                      ${orderData.totalAmount?.toLocaleString() || 0} 원
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ` : ''}
        </div>
      `;

      return await this.generateFromHtml(html, {
        ...options,
        filename: `PO_${orderData.orderNumber || 'draft'}.pdf`
      });

    } catch (error) {
      console.error('❌ 발주서 PDF 생성 오류:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  }
}