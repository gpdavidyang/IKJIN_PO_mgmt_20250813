/**
 * CreateOrderExcel 컴포넌트 테스트
 * Excel 업로드 및 처리 UI 테스트
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CreateOrderExcel from './create-order-excel';

// useAuth hook 모킹
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      username: 'testuser',
      role: 'project_manager'
    }
  })
}));

// fetch API 모킹
global.fetch = jest.fn();

describe('CreateOrderExcel Component', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('초기 렌더링', () => {
    it('should render upload area and instructions', () => {
      render(<CreateOrderExcel />);
      
      expect(screen.getByText('엑셀 발주서 처리')).toBeInTheDocument();
      expect(screen.getByText('엑셀 발주서 업로드')).toBeInTheDocument();
      expect(screen.getByText('엑셀 파일을 드래그하거나 클릭하여 업로드하세요')).toBeInTheDocument();
      expect(screen.getByText('사용법 안내')).toBeInTheDocument();
    });

    it('should show processing steps', () => {
      render(<CreateOrderExcel />);
      
      expect(screen.getByText('파일 업로드')).toBeInTheDocument();
      expect(screen.getByText('Input 시트 파싱')).toBeInTheDocument();
      expect(screen.getByText('데이터베이스 저장')).toBeInTheDocument();
      expect(screen.getByText('갑지/을지 추출')).toBeInTheDocument();
    });
  });

  describe('파일 업로드', () => {
    it('should handle file selection', async () => {
      const user = userEvent.setup();
      render(<CreateOrderExcel />);
      
      const fileInput = screen.getByLabelText('파일 선택') as HTMLInputElement;
      const testFile = new File(['test content'], 'test-po.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      await user.upload(fileInput, testFile);

      expect(screen.getByText('test-po.xlsx')).toBeInTheDocument();
      expect(screen.getByText('파일 준비 완료')).toBeInTheDocument();
      expect(screen.getByText('업로드 및 처리 시작')).toBeInTheDocument();
    });

    it('should validate file type', async () => {
      const user = userEvent.setup();
      render(<CreateOrderExcel />);
      
      // 텍스트 파일 업로드 시도
      const fileInput = screen.getByLabelText('파일 선택') as HTMLInputElement;
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });

      // 파일 선택 이벤트 시뮬레이션
      Object.defineProperty(fileInput, 'files', {
        value: [invalidFile],
        configurable: true,
      });

      // alert 모킹
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      fireEvent.change(fileInput);

      // Excel 파일이 아닌 경우 파일이 설정되지 않아야 함
      expect(screen.queryByText('test.txt')).not.toBeInTheDocument();
      
      alertSpy.mockRestore();
    });
  });

  describe('드래그 앤 드롭', () => {
    it('should handle drag and drop events', async () => {
      render(<CreateOrderExcel />);
      
      const dropZone = screen.getByText('엑셀 파일을 드래그하거나 클릭하여 업로드하세요').closest('div');
      
      // 드래그 오버 이벤트
      fireEvent.dragOver(dropZone!);
      expect(dropZone).toHaveClass('border-blue-500');

      // 드래그 리브 이벤트
      fireEvent.dragLeave(dropZone!);
      expect(dropZone).not.toHaveClass('border-blue-500');

      // 드롭 이벤트
      const testFile = new File(['test'], 'test-po.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.drop(dropZone!, {
        dataTransfer: {
          files: [testFile]
        }
      });

      await waitFor(() => {
        expect(screen.getByText('test-po.xlsx')).toBeInTheDocument();
      });
    });
  });

  describe('파일 처리', () => {
    it('should process uploaded file successfully', async () => {
      const user = userEvent.setup();
      
      // Mock successful API responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              fileName: 'test-po.xlsx',
              filePath: '/uploads/test-po.xlsx',
              totalOrders: 2,
              totalItems: 5,
              orders: [
                {
                  orderNumber: 'PO-20250115-001',
                  vendorName: '테스트거래처',
                  deliveryName: '테스트납품처',
                  siteName: '테스트현장',
                  orderDate: '2025-01-15',
                  dueDate: '2025-01-20',
                  totalAmount: 1500000,
                  items: [
                    {
                      itemName: '철근 D13',
                      specification: 'φ13mm×12m',
                      majorCategory: '철근',
                      middleCategory: '이형철근',
                      minorCategory: 'SD400',
                      quantity: 100,
                      unitPrice: 15000,
                      totalAmount: 1500000,
                      vendorName: '테스트거래처'
                    }
                  ]
                }
              ]
            }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { savedOrders: 2 }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { extractedSheets: ['갑지', '을지'] }
          })
        });

      render(<CreateOrderExcel />);
      
      // 파일 업로드
      const fileInput = screen.getByLabelText('파일 선택') as HTMLInputElement;
      const testFile = new File(['test'], 'test-po.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      await user.upload(fileInput, testFile);

      // 처리 시작
      const uploadButton = screen.getByText('업로드 및 처리 시작');
      await user.click(uploadButton);

      // 처리 중 상태 확인
      await waitFor(() => {
        expect(screen.getByText('처리 중...')).toBeInTheDocument();
      });

      // 완료 후 결과 확인
      await waitFor(() => {
        expect(screen.getByText('처리 결과')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument(); // 생성된 발주서 수
        expect(screen.getByText('5')).toBeInTheDocument(); // 처리된 아이템 수
      });
    });

    it('should display processing steps progress', async () => {
      const user = userEvent.setup();
      
      // Mock API responses with delays
      mockFetch
        .mockImplementationOnce(() => 
          new Promise(resolve => 
            setTimeout(() => resolve({
              ok: true,
              json: async () => ({
                success: true,
                data: {
                  fileName: 'test-po.xlsx',
                  filePath: '/uploads/test-po.xlsx',
                  totalOrders: 1,
                  totalItems: 2,
                  orders: []
                }
              })
            }), 100)
          )
        );

      render(<CreateOrderExcel />);
      
      // 파일 업로드
      const fileInput = screen.getByLabelText('파일 선택') as HTMLInputElement;
      const testFile = new File(['test'], 'test-po.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      await user.upload(fileInput, testFile);

      const uploadButton = screen.getByText('업로드 및 처리 시작');
      await user.click(uploadButton);

      // 진행률 표시 확인
      await waitFor(() => {
        expect(screen.getByText('처리 진행 상황')).toBeInTheDocument();
      });
    });
  });

  describe('발주서 미리보기', () => {
    it('should display order preview with item categories', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            fileName: 'test-po.xlsx',
            totalOrders: 1,
            totalItems: 1,
            orders: [
              {
                orderNumber: 'PO-20250115-001',
                vendorName: '테스트거래처',
                deliveryName: '테스트납품처',
                siteName: '테스트현장',
                orderDate: '2025-01-15',
                dueDate: '2025-01-20',
                totalAmount: 1500000,
                items: [
                  {
                    itemName: '철근 D13',
                    specification: 'φ13mm×12m',
                    quantity: 100,
                    unitPrice: 15000,
                    totalAmount: 1500000,
                    vendorName: '테스트거래처',
                    deliveryName: '테스트납품처'
                  }
                ]
              }
            ]
          }
        })
      });

      render(<CreateOrderExcel />);
      
      // 파일 업로드 및 처리
      const fileInput = screen.getByLabelText('파일 선택') as HTMLInputElement;
      const testFile = new File(['test'], 'test-po.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      await user.upload(fileInput, testFile);
      const uploadButton = screen.getByText('업로드 및 처리 시작');
      await user.click(uploadButton);

      // 미리보기 확인
      await waitFor(() => {
        expect(screen.getByText('발주서 데이터 미리보기')).toBeInTheDocument();
        expect(screen.getByText('PO-20250115-001')).toBeInTheDocument();
        expect(screen.getByText('철근 D13')).toBeInTheDocument();
        expect(screen.getByText('φ13mm×12m')).toBeInTheDocument();
        expect(screen.getByText('₩1,500,000')).toBeInTheDocument();
      });
    });
  });

  describe('에러 처리', () => {
    it('should handle upload errors', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: '파일 유효성 검사 실패'
        })
      });

      render(<CreateOrderExcel />);
      
      const fileInput = screen.getByLabelText('파일 선택') as HTMLInputElement;
      const testFile = new File(['test'], 'test-po.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      await user.upload(fileInput, testFile);
      const uploadButton = screen.getByText('업로드 및 처리 시작');
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText('파일 업로드 실패')).toBeInTheDocument();
      });
    });

    it('should handle network errors', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<CreateOrderExcel />);
      
      const fileInput = screen.getByLabelText('파일 선택') as HTMLInputElement;
      const testFile = new File(['test'], 'test-po.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      await user.upload(fileInput, testFile);
      const uploadButton = screen.getByText('업로드 및 처리 시작');
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText('처리 중 오류가 발생했습니다.')).toBeInTheDocument();
      });
    });
  });

  describe('접근성', () => {
    it('should have proper ARIA labels', () => {
      render(<CreateOrderExcel />);
      
      const fileInput = screen.getByLabelText('파일 선택');
      expect(fileInput).toHaveAttribute('accept', '.xlsx,.xls');
      
      const uploadButton = screen.getByRole('button', { name: /업로드 및 처리 시작/ });
      expect(uploadButton).toBeDisabled(); // 파일이 없을 때는 비활성화
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<CreateOrderExcel />);
      
      // Tab 키로 네비게이션 테스트
      await user.tab();
      expect(document.activeElement).toHaveAttribute('id', 'file-upload');
    });
  });

  describe('반응형 디자인', () => {
    it('should render properly on mobile', () => {
      // 모바일 뷰포트 시뮬레이션
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(max-width: 768px)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<CreateOrderExcel />);
      
      // 모바일에서도 주요 요소들이 렌더링되는지 확인
      expect(screen.getByText('엑셀 발주서 처리')).toBeInTheDocument();
      expect(screen.getByText('파일 선택')).toBeInTheDocument();
    });
  });
});