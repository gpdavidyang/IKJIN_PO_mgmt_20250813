import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Download, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FieldValidationErrorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  errors: string[];
  onRetry?: () => void;
  onDownloadTemplate?: () => void;
}

export function FieldValidationErrorDialog({
  isOpen,
  onClose,
  errors,
  onRetry,
  onDownloadTemplate,
}: FieldValidationErrorDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Excel 필드명 오류
          </DialogTitle>
          <DialogDescription>
            업로드한 파일의 필드명이 표준 형식과 일치하지 않습니다.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[300px] rounded-md border p-4 bg-red-50">
          <div className="space-y-2">
            <p className="font-medium text-sm text-red-900 mb-3">
              ❌ 잘못된 필드명:
            </p>
            {errors.map((error, index) => (
              <div key={index} className="text-sm text-red-700 ml-4">
                • {error}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="rounded-lg bg-blue-50 p-3 mt-2">
          <p className="text-sm text-blue-900 font-medium mb-2">
            ✅ 해결 방법:
          </p>
          <ol className="text-sm text-blue-700 space-y-1 ml-4">
            <li>1. 표준 템플릿을 다운로드하세요</li>
            <li>2. 템플릿의 필드명을 정확히 사용하세요</li>
            <li>3. 필드명을 수정 후 다시 업로드하세요</li>
          </ol>
        </div>

        <DialogFooter className="gap-2">
          {onDownloadTemplate && (
            <Button
              onClick={onDownloadTemplate}
              variant="outline"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              템플릿 다운로드
            </Button>
          )}
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="default"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              다시 시도
            </Button>
          )}
          <Button onClick={onClose} variant="secondary">
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}