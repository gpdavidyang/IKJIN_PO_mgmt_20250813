import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Copy, 
  GitMerge, 
  SkipForward, 
  Plus, 
  Replace,
  AlertCircle,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DuplicateInfo, TableRow } from './SmartTable';

interface DuplicateMergePanelProps {
  duplicates: Array<{
    original: TableRow;
    matches: TableRow[];
    strategy: DuplicateInfo['mergeStrategy'];
  }>;
  onMerge: (
    originalIndex: number,
    matchIndices: number[],
    strategy: 'skip' | 'replace' | 'merge' | 'create_new'
  ) => Promise<void>;
  onSkip: (index: number) => void;
  className?: string;
}

export const DuplicateMergePanel: React.FC<DuplicateMergePanelProps> = ({
  duplicates,
  onMerge,
  onSkip,
  className
}) => {
  const [selectedStrategies, setSelectedStrategies] = useState<Record<number, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedIndices, setProcessedIndices] = useState<Set<number>>(new Set());

  const handleStrategyChange = (index: number, strategy: string) => {
    setSelectedStrategies(prev => ({
      ...prev,
      [index]: strategy
    }));
  };

  const handleApplyStrategy = async (duplicateGroup: any, index: number) => {
    const strategy = selectedStrategies[index] || duplicateGroup.strategy?.action || 'skip';
    
    setIsProcessing(true);
    try {
      await onMerge(
        duplicateGroup.original.rowIndex,
        duplicateGroup.matches.map((m: TableRow) => m.rowIndex),
        strategy as any
      );
      
      setProcessedIndices(prev => new Set([...prev, index]));
    } catch (error) {
      console.error('Failed to apply merge strategy:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyAll = async () => {
    setIsProcessing(true);
    try {
      for (let i = 0; i < duplicates.length; i++) {
        if (!processedIndices.has(i)) {
          const duplicateGroup = duplicates[i];
          const strategy = selectedStrategies[i] || duplicateGroup.strategy?.action || 'skip';
          
          await onMerge(
            duplicateGroup.original.rowIndex,
            duplicateGroup.matches.map(m => m.rowIndex),
            strategy as any
          );
          
          setProcessedIndices(prev => new Set([...prev, i]));
        }
      }
    } catch (error) {
      console.error('Failed to apply all strategies:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStrategyIcon = (strategy: string) => {
    switch (strategy) {
      case 'skip': return <SkipForward className="h-4 w-4" />;
      case 'replace': return <Replace className="h-4 w-4" />;
      case 'merge': return <GitMerge className="h-4 w-4" />;
      case 'create_new': return <Plus className="h-4 w-4" />;
      default: return null;
    }
  };

  const renderFieldComparison = (original: TableRow, match: TableRow) => {
    const fields = [
      { key: 'itemName', label: '품목명' },
      { key: 'specification', label: '규격' },
      { key: 'quantity', label: '수량' },
      { key: 'unitPrice', label: '단가' },
      { key: 'vendorName', label: '거래처' },
    ];

    return (
      <div className="space-y-2 mt-3">
        {fields.map(field => {
          const originalValue = original[field.key as keyof TableRow];
          const matchValue = match[field.key as keyof TableRow];
          const isDifferent = originalValue !== matchValue;

          return (
            <div key={field.key} className="grid grid-cols-3 gap-2 text-sm">
              <div className="text-gray-500">{field.label}</div>
              <div className={cn(
                "px-2 py-1 rounded",
                isDifferent && "bg-red-50"
              )}>
                {originalValue || '-'}
              </div>
              <div className={cn(
                "px-2 py-1 rounded",
                isDifferent && "bg-green-50"
              )}>
                {matchValue || '-'}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (duplicates.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600">중복 항목이 없습니다.</p>
            <p className="text-sm text-gray-400 mt-1">
              모든 항목이 고유합니다.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-blue-600" />
            중복 항목 처리
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {processedIndices.size} / {duplicates.length} 처리됨
            </Badge>
            <Button
              size="sm"
              onClick={handleApplyAll}
              disabled={isProcessing || processedIndices.size === duplicates.length}
            >
              모두 적용
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {duplicates.map((duplicateGroup, index) => {
          const isProcessed = processedIndices.has(index);
          const currentStrategy = selectedStrategies[index] || duplicateGroup.strategy?.action || 'skip';
          
          return (
            <div
              key={index}
              className={cn(
                "border rounded-lg p-4 space-y-4",
                isProcessed && "bg-gray-50 opacity-75"
              )}
            >
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={duplicateGroup.original.duplicate?.duplicateType === 'exact' ? 'destructive' : 'default'}>
                      {duplicateGroup.original.duplicate?.duplicateType === 'exact' ? '완전 중복' : '유사 항목'}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      행 {duplicateGroup.original.rowIndex} ↔ 행 {duplicateGroup.matches.map(m => m.rowIndex).join(', ')}
                    </span>
                  </div>
                  {duplicateGroup.strategy?.reason && (
                    <p className="text-sm text-gray-500 mt-1">{duplicateGroup.strategy.reason}</p>
                  )}
                </div>
                {isProcessed && (
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    처리됨
                  </Badge>
                )}
              </div>

              {/* Comparison */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                  <span>원본 (행 {duplicateGroup.original.rowIndex})</span>
                  <ArrowRight className="h-4 w-4" />
                  <span>일치 항목 (행 {duplicateGroup.matches[0].rowIndex})</span>
                </div>
                {renderFieldComparison(duplicateGroup.original, duplicateGroup.matches[0])}
              </div>

              {/* Strategy Selection */}
              {!isProcessed && (
                <RadioGroup
                  value={currentStrategy}
                  onValueChange={(value) => handleStrategyChange(index, value)}
                >
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="skip" id={`skip-${index}`} />
                      <Label htmlFor={`skip-${index}`} className="flex items-center gap-2 cursor-pointer">
                        <SkipForward className="h-4 w-4" />
                        건너뛰기 - 중복 항목 제외
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="replace" id={`replace-${index}`} />
                      <Label htmlFor={`replace-${index}`} className="flex items-center gap-2 cursor-pointer">
                        <Replace className="h-4 w-4" />
                        대체 - 기존 항목을 새 항목으로 교체
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="merge" id={`merge-${index}`} />
                      <Label htmlFor={`merge-${index}`} className="flex items-center gap-2 cursor-pointer">
                        <GitMerge className="h-4 w-4" />
                        병합 - 수량 합산 및 정보 통합
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="create_new" id={`create-${index}`} />
                      <Label htmlFor={`create-${index}`} className="flex items-center gap-2 cursor-pointer">
                        <Plus className="h-4 w-4" />
                        새로 생성 - 별개 항목으로 추가
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              )}

              {/* Actions */}
              {!isProcessed && (
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSkip(index)}
                  >
                    나중에
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApplyStrategy(duplicateGroup, index)}
                    disabled={isProcessing}
                    className="gap-1"
                  >
                    {getStrategyIcon(currentStrategy)}
                    적용
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {/* Summary Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{duplicates.length}개</strong>의 중복 그룹이 발견되었습니다.
            각 그룹에 대해 적절한 처리 방법을 선택하세요.
            자동 추천된 전략을 검토하고 필요시 변경할 수 있습니다.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};