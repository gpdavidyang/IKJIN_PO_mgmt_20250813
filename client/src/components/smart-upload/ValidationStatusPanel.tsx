import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertCircle, XCircle, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationStatusPanelProps {
  sessionId?: string;
  totalItems: number;
  validItems: number;
  warningItems: number;
  errorItems: number;
  onFilterChange?: (filter: 'all' | 'valid' | 'warning' | 'error') => void;
  autoSaveEnabled?: boolean;
  className?: string;
  isProcessing?: boolean;
}

interface StatusCardProps {
  count: number;
  label: string;
  color: 'green' | 'yellow' | 'red' | 'gray';
  icon: React.ReactNode;
  onClick?: () => void;
  isActive?: boolean;
}

const StatusCard: React.FC<StatusCardProps> = ({
  count,
  label,
  color,
  icon,
  onClick,
  isActive = false,
}) => {
  const colorClasses = {
    green: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
    red: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
    gray: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
  };

  const activeClasses = {
    green: 'ring-2 ring-green-500',
    yellow: 'ring-2 ring-yellow-500',
    red: 'ring-2 ring-red-500',
    gray: 'ring-2 ring-gray-500',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all cursor-pointer',
        colorClasses[color],
        isActive && activeClasses[color],
        onClick && 'hover:scale-105'
      )}
      onClick={onClick}
    >
      <div className="text-3xl font-bold">{count}</div>
      <div className="flex items-center gap-1 mt-1">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
    </div>
  );
};

export const ValidationStatusPanel: React.FC<ValidationStatusPanelProps> = ({
  sessionId,
  totalItems,
  validItems,
  warningItems,
  errorItems,
  onFilterChange,
  autoSaveEnabled = false,
  className,
  isProcessing = false,
}) => {
  const [activeFilter, setActiveFilter] = React.useState<'all' | 'valid' | 'warning' | 'error'>('all');
  
  const progress = totalItems > 0 ? ((validItems / totalItems) * 100) : 0;
  
  const handleFilterClick = (filter: 'all' | 'valid' | 'warning' | 'error') => {
    setActiveFilter(filter);
    onFilterChange?.(filter);
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">검증 상태</h3>
            {sessionId && (
              <Badge variant="outline" className="text-xs">
                세션: {sessionId.substring(0, 8)}...
              </Badge>
            )}
          </div>
          {autoSaveEnabled && (
            <Badge variant="outline" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              자동 저장
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatusCard
            count={validItems}
            label="완료"
            color="green"
            icon={<CheckCircle className="h-4 w-4" />}
            onClick={() => handleFilterClick('valid')}
            isActive={activeFilter === 'valid'}
          />
          <StatusCard
            count={warningItems}
            label="확인"
            color="yellow"
            icon={<AlertCircle className="h-4 w-4" />}
            onClick={() => handleFilterClick('warning')}
            isActive={activeFilter === 'warning'}
          />
          <StatusCard
            count={errorItems}
            label="수정"
            color="red"
            icon={<XCircle className="h-4 w-4" />}
            onClick={() => handleFilterClick('error')}
            isActive={activeFilter === 'error'}
          />
          <StatusCard
            count={totalItems}
            label="전체"
            color="gray"
            icon={<FileSpreadsheet className="h-4 w-4" />}
            onClick={() => handleFilterClick('all')}
            isActive={activeFilter === 'all'}
          />
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>진행률</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress 
            value={progress} 
            className={cn(
              "h-2 transition-all",
              isProcessing && "animate-pulse"
            )}
          />
          {isProcessing && (
            <p className="text-xs text-gray-500 text-center animate-pulse">
              데이터 검증 중...
            </p>
          )}
        </div>

        {/* Summary Text */}
        {totalItems > 0 && (
          <div className="pt-2 border-t">
            <p className="text-sm text-gray-600">
              총 <span className="font-semibold">{totalItems}개</span> 항목 중{' '}
              <span className="text-green-600 font-semibold">{validItems}개</span> 완료
              {warningItems > 0 && (
                <>, <span className="text-yellow-600 font-semibold">{warningItems}개</span> 확인 필요</>
              )}
              {errorItems > 0 && (
                <>, <span className="text-red-600 font-semibold">{errorItems}개</span> 수정 필요</>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};