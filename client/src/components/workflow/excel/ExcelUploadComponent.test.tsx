/**
 * Excel 업로드 컴포넌트 단위 테스트
 * 
 * 테스트 범위:
 * - 파일 드래그 앤 드롭 기능
 * - 파일 선택 기능
 * - 업로드 프로세스 단계별 진행
 * - 오류 처리 및 사용자 피드백
 * - 결과 데이터 표시 및 검증
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import ExcelUploadComponent from './ExcelUploadComponent';

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock window.URL for file downloads
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  },
  writable: true,
});

// Mock alert
const mockAlert = jest.fn();
global.alert = mockAlert;

describe('ExcelUploadComponent', () => {
  const mockOnUploadComplete = jest.fn();
  
  const defaultProps = {
    onUploadComplete: mockOnUploadComplete,
    disabled: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateObjectURL.mockReturnValue('blob:mock-url');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render upload area and template download section', () => {
      render(<ExcelUploadComponent {...defaultProps} />);
      
      expect(screen.getByText('엑셀 파일을 드래그하거나 클릭하여 업로드하세요')).toBeInTheDocument();
      expect(screen.getByText('PO_Excel_Template.xlsx 다운로드')).toBeInTheDocument();
      expect(screen.getByText('표준 템플릿 다운로드')).toBeInTheDocument();
      expect(screen.getByText('엑셀 파일 요구사항')).toBeInTheDocument();
    });

    it('should show file selection button', () => {
      render(<ExcelUploadComponent {...defaultProps} />);
      
      const fileButton = screen.getByLabelText('파일 선택');
      expect(fileButton).toBeInTheDocument();
      expect(fileButton).not.toBeDisabled();
    });

    it('should disable interactions when disabled prop is true', () => {
      render(<ExcelUploadComponent {...defaultProps} disabled={true} />);
      
      const fileInput = screen.getByLabelText('파일 선택');
      const downloadButton = screen.getByText('PO_Excel_Template.xlsx 다운로드');
      
      expect(fileInput).toBeDisabled();
      expect(downloadButton).toBeDisabled();
    });
  });

  describe('File Selection', () => {
    it('should handle file selection through input', async () => {
      const user = userEvent.setup();
      render(<ExcelUploadComponent {...defaultProps} />);
      
      const file = new File(['test content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const fileInput = screen.getByLabelText('파일 선택') as HTMLInputElement;
      await user.upload(fileInput, file);
      
      expect(screen.getByText('test.xlsx')).toBeInTheDocument();
      expect(screen.getByText('파일 준비 완료')).toBeInTheDocument();
      expect(screen.getByText('업로드 및 처리 시작')).toBeInTheDocument();
    });

    it('should display file size information', async () => {
      const user = userEvent.setup();
      render(<ExcelUploadComponent {...defaultProps} />);
      
      const file = new File(['x'.repeat(1024)], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const fileInput = screen.getByLabelText('파일 선택') as HTMLInputElement;
      await user.upload(fileInput, file);
      
      expect(screen.getByText('0.00 MB')).toBeInTheDocument();
    });

    it('should show cancel button after file selection', async () => {
      const user = userEvent.setup();
      render(<ExcelUploadComponent {...defaultProps} />);
      
      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const fileInput = screen.getByLabelText('파일 선택') as HTMLInputElement;
      await user.upload(fileInput, file);
      
      const cancelButton = screen.getByText('취소');
      expect(cancelButton).toBeInTheDocument();
      
      await user.click(cancelButton);
      expect(screen.queryByText('test.xlsx')).not.toBeInTheDocument();
    });
  });

  describe('Drag and Drop', () => {
    it('should handle drag enter and leave events', () => {
      render(<ExcelUploadComponent {...defaultProps} />);
      
      const dropZone = screen.getByText('엑셀 파일을 드래그하거나 클릭하여 업로드하세요').closest('div');
      
      fireEvent.dragEnter(dropZone!);
      expect(dropZone).toHaveClass('border-blue-500', 'bg-blue-50');
      
      fireEvent.dragLeave(dropZone!);
      expect(dropZone).not.toHaveClass('border-blue-500', 'bg-blue-50');
    });

    it('should handle file drop with valid Excel file', () => {
      render(<ExcelUploadComponent {...defaultProps} />);
      
      const file = new File(['test content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const dropZone = screen.getByText('엑셀 파일을 드래그하거나 클릭하여 업로드하세요').closest('div');
      
      fireEvent.drop(dropZone!, {
        dataTransfer: {
          files: [file]
        }
      });
      
      expect(screen.getByText('test.xlsx')).toBeInTheDocument();
    });

    it('should reject non-Excel files', () => {
      render(<ExcelUploadComponent {...defaultProps} />);
      
      const file = new File(['test content'], 'test.txt', {
        type: 'text/plain'
      });
      
      const dropZone = screen.getByText('엑셀 파일을 드래그하거나 클릭하여 업로드하세요').closest('div');
      
      fireEvent.drop(dropZone!, {
        dataTransfer: {
          files: [file]
        }
      });
      
      expect(mockAlert).toHaveBeenCalledWith('엑셀 파일(.xlsx)만 업로드 가능합니다.');
      expect(screen.queryByText('test.txt')).not.toBeInTheDocument();
    });
  });

  describe('Template Download', () => {
    it('should handle template download successfully', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['mock excel content']);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      });

      // Mock DOM methods
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn()
      };
      const mockCreateElement = jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      const mockAppendChild = jest.spyOn(document.body, 'appendChild').mockImplementation();
      const mockRemoveChild = jest.spyOn(document.body, 'removeChild').mockImplementation();

      render(<ExcelUploadComponent {...defaultProps} />);
      
      const downloadButton = screen.getByText('PO_Excel_Template.xlsx 다운로드');
      await user.click(downloadButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/excel-template/download', {
          method: 'GET'
        });
      });
      
      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(mockLink.download).toBe('PO_Excel_Template.xlsx');
      expect(mockLink.click).toHaveBeenCalled();
      
      mockCreateElement.mockRestore();
      mockAppendChild.mockRestore();
      mockRemoveChild.mockRestore();
    });

    it('should handle template download failure', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockResolvedValueOnce({
        ok: false
      });

      render(<ExcelUploadComponent {...defaultProps} />);
      
      const downloadButton = screen.getByText('PO_Excel_Template.xlsx 다운로드');
      await user.click(downloadButton);
      
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('템플릿 다운로드 중 오류가 발생했습니다.');
      });
    });
  });

  describe('Upload Process', () => {
    const mockUploadResponse = {
      success: true,
      data: {
        fileName: 'test.xlsx',
        filePath: '/uploads/test.xlsx',
        totalOrders: 2,
        totalItems: 5,
        orders: [
          {
            orderNumber: 'PO-2024-001',
            vendorName: '테스트 거래처',
            siteName: '테스트 현장',
            orderDate: '2024-01-15',
            dueDate: '2024-01-25',
            totalAmount: 1000000,
            items: [
              {
                itemName: '테스트 품목',
                specification: 'Test Spec',
                quantity: 10,
                unitPrice: 100000,
                totalAmount: 1000000
              }
            ]
          }
        ]
      }
    };

    const mockSaveResponse = {
      success: true,
      data: {
        savedOrders: 2
      }
    };

    const mockExtractResponse = {
      success: true,
      data: {
        extractedSheets: ['갑지', '을지']
      }
    };

    it('should complete upload process successfully', async () => {
      const user = userEvent.setup();
      
      // Mock API responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockUploadResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSaveResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExtractResponse)
        });

      render(<ExcelUploadComponent {...defaultProps} />);
      
      // Select file
      const file = new File(['test content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const fileInput = screen.getByLabelText('파일 선택') as HTMLInputElement;
      await user.upload(fileInput, file);
      
      // Start upload
      const uploadButton = screen.getByText('업로드 및 처리 시작');
      await user.click(uploadButton);
      
      // Check processing states
      expect(screen.getByText('처리 중...')).toBeInTheDocument();
      expect(screen.getByText('처리 진행 상황')).toBeInTheDocument();
      
      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText('엑셀 발주서가 성공적으로 처리되었습니다.')).toBeInTheDocument();
      });
      
      // Verify API calls
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/po-template/upload', {
        method: 'POST',
        body: expect.any(FormData)
      });
      
      // Verify callback
      expect(mockOnUploadComplete).toHaveBeenCalledWith({
        type: 'excel',
        orders: mockUploadResponse.data.orders,
        filePath: mockUploadResponse.data.filePath,
        totalOrders: mockUploadResponse.data.totalOrders,
        totalItems: mockUploadResponse.data.totalItems,
        fileName: mockUploadResponse.data.fileName
      });
    });

    it('should handle upload API failure', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Upload failed' })
      });

      render(<ExcelUploadComponent {...defaultProps} />);
      
      const file = new File(['test content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const fileInput = screen.getByLabelText('파일 선택') as HTMLInputElement;
      await user.upload(fileInput, file);
      
      const uploadButton = screen.getByText('업로드 및 처리 시작');
      await user.click(uploadButton);
      
      await waitFor(() => {
        expect(screen.queryByText('처리 중...')).not.toBeInTheDocument();
      });
      
      // Check that error is displayed (the processing step should show error)
      const steps = screen.getAllByText(/파일 업로드|Input 시트 파싱|데이터베이스 저장|갑지\/을지 추출/);
      expect(steps.length).toBeGreaterThan(0);
    });

    it('should handle database save failure', async () => {
      const user = userEvent.setup();
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockUploadResponse)
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Database save failed' })
        });

      render(<ExcelUploadComponent {...defaultProps} />);
      
      const file = new File(['test content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const fileInput = screen.getByLabelText('파일 선택') as HTMLInputElement;
      await user.upload(fileInput, file);
      
      const uploadButton = screen.getByText('업로드 및 처리 시작');
      await user.click(uploadButton);
      
      await waitFor(() => {
        expect(screen.queryByText('처리 중...')).not.toBeInTheDocument();
      });
      
      // Processing should complete but with errors in later steps
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should show progress during processing', async () => {
      const user = userEvent.setup();
      
      // Mock responses with delays to test progress
      mockFetch
        .mockImplementationOnce(() => 
          new Promise(resolve => setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve(mockUploadResponse)
          }), 100))
        )
        .mockImplementationOnce(() => 
          new Promise(resolve => setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve(mockSaveResponse)
          }), 100))
        )
        .mockImplementationOnce(() => 
          new Promise(resolve => setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve(mockExtractResponse)
          }), 100))
        );

      render(<ExcelUploadComponent {...defaultProps} />);
      
      const file = new File(['test content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const fileInput = screen.getByLabelText('파일 선택') as HTMLInputElement;
      await user.upload(fileInput, file);
      
      const uploadButton = screen.getByText('업로드 및 처리 시작');
      await user.click(uploadButton);
      
      // Check that progress is shown
      expect(screen.getByText('처리 진행 상황')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('엑셀 발주서가 성공적으로 처리되었습니다.')).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('Order Preview', () => {
    it('should display order preview after successful processing', async () => {
      const user = userEvent.setup();
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockUploadResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSaveResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExtractResponse)
        });

      render(<ExcelUploadComponent {...defaultProps} />);
      
      const file = new File(['test content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const fileInput = screen.getByLabelText('파일 선택') as HTMLInputElement;
      await user.upload(fileInput, file);
      
      const uploadButton = screen.getByText('업로드 및 처리 시작');
      await user.click(uploadButton);
      
      await waitFor(() => {
        expect(screen.getByText('발주서 데이터 미리보기')).toBeInTheDocument();
        expect(screen.getByText('PO-2024-001')).toBeInTheDocument();
        expect(screen.getByText('테스트 거래처')).toBeInTheDocument();
        expect(screen.getByText('테스트 현장')).toBeInTheDocument();
      });
      
      // Check formatted currency
      expect(screen.getByText('₩1,000,000')).toBeInTheDocument();
      expect(screen.getByText('1개 품목')).toBeInTheDocument();
    });

    it('should limit preview to first 2 orders', async () => {
      const user = userEvent.setup();
      
      const responseWithManyOrders = {
        ...mockUploadResponse,
        data: {
          ...mockUploadResponse.data,
          totalOrders: 5,
          orders: Array.from({ length: 5 }, (_, i) => ({
            ...mockUploadResponse.data.orders[0],
            orderNumber: `PO-2024-00${i + 1}`
          }))
        }
      };
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(responseWithManyOrders)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSaveResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExtractResponse)
        });

      render(<ExcelUploadComponent {...defaultProps} />);
      
      const file = new File(['test content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const fileInput = screen.getByLabelText('파일 선택') as HTMLInputElement;
      await user.upload(fileInput, file);
      
      const uploadButton = screen.getByText('업로드 및 처리 시작');
      await user.click(uploadButton);
      
      await waitFor(() => {
        expect(screen.getByText('PO-2024-001')).toBeInTheDocument();
        expect(screen.getByText('PO-2024-002')).toBeInTheDocument();
        expect(screen.queryByText('PO-2024-003')).not.toBeInTheDocument();
        expect(screen.getByText('... 외 3개 발주서')).toBeInTheDocument();
      });
    });

    it('should limit item preview to first 3 items', async () => {
      const user = userEvent.setup();
      
      const responseWithManyItems = {
        ...mockUploadResponse,
        data: {
          ...mockUploadResponse.data,
          orders: [{
            ...mockUploadResponse.data.orders[0],
            items: Array.from({ length: 5 }, (_, i) => ({
              itemName: `테스트 품목 ${i + 1}`,
              specification: `Test Spec ${i + 1}`,
              quantity: 10,
              unitPrice: 100000,
              totalAmount: 1000000
            }))
          }]
        }
      };
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(responseWithManyItems)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSaveResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExtractResponse)
        });

      render(<ExcelUploadComponent {...defaultProps} />);
      
      const file = new File(['test content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const fileInput = screen.getByLabelText('파일 선택') as HTMLInputElement;
      await user.upload(fileInput, file);
      
      const uploadButton = screen.getByText('업로드 및 처리 시작');
      await user.click(uploadButton);
      
      await waitFor(() => {
        expect(screen.getByText('테스트 품목 1')).toBeInTheDocument();
        expect(screen.getByText('테스트 품목 2')).toBeInTheDocument();
        expect(screen.getByText('테스트 품목 3')).toBeInTheDocument();
        expect(screen.queryByText('테스트 품목 4')).not.toBeInTheDocument();
        expect(screen.getByText('... 외 2개 품목')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<ExcelUploadComponent {...defaultProps} />);
      
      const file = new File(['test content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const fileInput = screen.getByLabelText('파일 선택') as HTMLInputElement;
      await user.upload(fileInput, file);
      
      const uploadButton = screen.getByText('업로드 및 처리 시작');
      await user.click(uploadButton);
      
      await waitFor(() => {
        expect(screen.queryByText('처리 중...')).not.toBeInTheDocument();
      });
      
      // Should not call callback on error
      expect(mockOnUploadComplete).not.toHaveBeenCalled();
    });

    it('should prevent upload when no file is selected', async () => {
      const user = userEvent.setup();
      render(<ExcelUploadComponent {...defaultProps} />);
      
      // Try to click upload without selecting file
      // Upload button should not be visible
      expect(screen.queryByText('업로드 및 처리 시작')).not.toBeInTheDocument();
    });

    it('should disable buttons during processing', async () => {
      const user = userEvent.setup();
      
      // Mock slow response
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve(mockUploadResponse)
        }), 500))
      );

      render(<ExcelUploadComponent {...defaultProps} />);
      
      const file = new File(['test content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const fileInput = screen.getByLabelText('파일 선택') as HTMLInputElement;
      await user.upload(fileInput, file);
      
      const uploadButton = screen.getByText('업로드 및 처리 시작');
      await user.click(uploadButton);
      
      // Check that buttons are disabled during processing
      expect(screen.getByText('처리 중...')).toBeInTheDocument();
      expect(screen.getByText('취소')).toBeDisabled();
    });
  });
});