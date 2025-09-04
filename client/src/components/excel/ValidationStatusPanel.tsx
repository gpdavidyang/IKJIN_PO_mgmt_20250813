import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertTriangle, XCircle, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationStatusPanelProps {
  validationProgress: number;
  statusCounts: {
    valid: number;
    warning: number;
    error: number;
  };
  autoSaveStatus: 'saving' | 'saved' | 'error' | null;
  totalItems: number;
}

export function ValidationStatusPanel({
  validationProgress,
  statusCounts,
  autoSaveStatus,
  totalItems
}: ValidationStatusPanelProps) {
  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-600">
          <span>검증 진행률</span>
          <span>{validationProgress}%</span>
        </div>
        <Progress value={validationProgress} className="h-1.5" />
      </div>

      {/* Status Cards - Compact Version */}
      <div className="grid grid-cols-3 gap-2">
        {/* Valid Items */}
        <div className="border border-green-200 bg-green-50/50 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">유효</p>
              <p className="text-lg font-bold text-green-600">
                {statusCounts.valid}
              </p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </div>
          <div className="text-xs text-gray-500">
            {totalItems > 0 ? Math.round((statusCounts.valid / totalItems) * 100) : 0}%
          </div>
        </div>

        {/* Warning Items */}
        <div className="border border-yellow-200 bg-yellow-50/50 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">경고</p>
              <p className="text-lg font-bold text-yellow-600">
                {statusCounts.warning}
              </p>
            </div>
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="text-xs text-gray-500">
            {totalItems > 0 ? Math.round((statusCounts.warning / totalItems) * 100) : 0}%
          </div>
        </div>

        {/* Error Items */}
        <div className="border border-red-200 bg-red-50/50 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">오류</p>
              <p className="text-lg font-bold text-red-600">
                {statusCounts.error}
              </p>
            </div>
            <XCircle className="h-5 w-5 text-red-500" />
          </div>
          <div className="text-xs text-gray-500">
            {totalItems > 0 ? Math.round((statusCounts.error / totalItems) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Auto Save Indicator */}
      {autoSaveStatus && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Save className={cn(
            "h-4 w-4",
            autoSaveStatus === 'saving' && "text-blue-500 animate-pulse",
            autoSaveStatus === 'saved' && "text-green-500",
            autoSaveStatus === 'error' && "text-red-500"
          )} />
          <span className={cn(
            autoSaveStatus === 'saving' && "text-blue-600",
            autoSaveStatus === 'saved' && "text-green-600",
            autoSaveStatus === 'error' && "text-red-600"
          )}>
            {autoSaveStatus === 'saving' && '저장 중...'}
            {autoSaveStatus === 'saved' && '자동 저장됨'}
            {autoSaveStatus === 'error' && '저장 실패'}
          </span>
        </div>
      )}
    </div>
  );
}