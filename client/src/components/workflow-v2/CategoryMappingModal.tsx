import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertTriangle, 
  CheckCircle, 
  X, 
  ArrowRight, 
  Loader2, 
  Search,
  Lightbulb,
  Target,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryMappingResult {
  excel: {
    major?: string;
    middle?: string;
    minor?: string;
  };
  db: {
    majorId?: number;
    middleId?: number;
    minorId?: number;
    majorName?: string;
    middleName?: string;
    minorName?: string;
  };
  status: 'exact_match' | 'partial_match' | 'no_match' | 'invalid_hierarchy';
  suggestions: CategorySuggestion[];
  confidence: number;
}

interface CategorySuggestion {
  id: number;
  name: string;
  type: 'major' | 'middle' | 'minor';
  similarity: number;
  parentId?: number;
  parentName?: string;
}

interface CategoryMappingItem {
  itemName: string;
  rowIndex: number;
  originalCategories: {
    major?: string;
    middle?: string;
    minor?: string;
  };
  mappingResult: CategoryMappingResult;
  userSelection?: {
    majorId?: number;
    middleId?: number;
    minorId?: number;
  };
}

interface CategoryMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mappingItems: CategoryMappingItem[];
  onApplyMappings: (mappings: CategoryMappingItem[]) => void;
}

const CategoryMappingModal: React.FC<CategoryMappingModalProps> = ({
  isOpen,
  onClose,
  mappingItems,
  onApplyMappings
}) => {
  const [items, setItems] = useState<CategoryMappingItem[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Category data states
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [majorCategories, setMajorCategories] = useState<any[]>([]);
  const [middleCategories, setMiddleCategories] = useState<any[]>([]);
  const [minorCategories, setMinorCategories] = useState<any[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  useEffect(() => {
    setItems([...mappingItems]);
    setCurrentItemIndex(0);
  }, [mappingItems]);

  // Load all categories when modal opens
  useEffect(() => {
    if (isOpen && allCategories.length === 0) {
      loadAllCategories();
    }
  }, [isOpen]);

  const loadAllCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const response = await fetch('/api/categories', {
        credentials: 'include' // 인증 쿠키 포함
      });
      if (response.ok) {
        const result = await response.json();
        const flatCategories = result.flatCategories || [];
        
        setAllCategories(flatCategories);
        setMajorCategories(flatCategories.filter((c: any) => c.categoryType === 'major'));
        setMiddleCategories(flatCategories.filter((c: any) => c.categoryType === 'middle'));
        setMinorCategories(flatCategories.filter((c: any) => c.categoryType === 'minor'));
        
        console.log('📋 전체 분류 로드 완료:', {
          total: flatCategories.length,
          major: flatCategories.filter((c: any) => c.categoryType === 'major').length,
          middle: flatCategories.filter((c: any) => c.categoryType === 'middle').length,
          minor: flatCategories.filter((c: any) => c.categoryType === 'minor').length
        });
      } else {
        console.error('❌ 분류 데이터 로드 실패:', response.status);
      }
    } catch (error) {
      console.error('❌ 분류 데이터 로드 오류:', error);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const currentItem = items[currentItemIndex];
  
  // Debug current item structure
  console.log('🔍 Current item data:', currentItem);
  console.log('🔍 Mapping result DB data:', currentItem?.mappingResult?.db);
  
  const stats = {
    total: items.length,
    resolved: items.filter(item => 
      item.userSelection || item.mappingResult.status === 'exact_match'
    ).length,
    needsAttention: items.filter(item => 
      !item.userSelection && item.mappingResult.status !== 'exact_match'
    ).length
  };

  const handleUserSelection = (type: 'major' | 'middle' | 'minor', categoryId: number) => {
    const updatedItems = [...items];
    const item = updatedItems[currentItemIndex];
    
    if (!item.userSelection) {
      item.userSelection = {};
    }
    
    item.userSelection[`${type}Id`] = categoryId;
    
    // 계층 구조 검증: 상위 분류가 변경되면 하위 분류 초기화
    if (type === 'major') {
      item.userSelection.middleId = undefined;
      item.userSelection.minorId = undefined;
    } else if (type === 'middle') {
      item.userSelection.minorId = undefined;
    }
    
    setItems(updatedItems);
  };

  // Get the currently selected major/middle IDs (from user selection or auto-mapping)
  const getCurrentMajorId = () => {
    const userMajorId = currentItem?.userSelection?.majorId;
    const autoMajorId = currentItem?.mappingResult?.db?.majorId;
    console.log('🔍 getCurrentMajorId:', { userMajorId, autoMajorId, result: userMajorId || autoMajorId });
    return userMajorId || autoMajorId;
  };

  const getCurrentMiddleId = () => {
    const userMiddleId = currentItem?.userSelection?.middleId;
    const autoMiddleId = currentItem?.mappingResult?.db?.middleId;
    console.log('🔍 getCurrentMiddleId:', { userMiddleId, autoMiddleId, result: userMiddleId || autoMiddleId });
    return userMiddleId || autoMiddleId;
  };

  // Get filtered categories based on hierarchy
  const getAvailableMiddleCategories = (majorId?: number) => {
    if (!majorId) return [];
    return middleCategories.filter(c => c.parentId === majorId);
  };

  const getAvailableMinorCategories = (middleId?: number) => {
    if (!middleId) return [];
    return minorCategories.filter(c => c.parentId === middleId);
  };

  // Get suggestions combined with full category list, prioritizing suggestions
  const getCombinedOptions = (type: 'major' | 'middle' | 'minor', parentId?: number) => {
    const suggestions = currentItem?.mappingResult?.suggestions?.filter((s: any) => s.type === type) || [];
    
    let allOptions: any[] = [];
    if (type === 'major') {
      allOptions = majorCategories;
    } else if (type === 'middle') {
      allOptions = getAvailableMiddleCategories(parentId);
    } else if (type === 'minor') {
      allOptions = getAvailableMinorCategories(parentId);
    }
    
    // Create a combined list with suggestions first (with similarity info), then other options
    const suggestionIds = suggestions.map((s: any) => s.id);
    const otherOptions = allOptions.filter(opt => !suggestionIds.includes(opt.id));
    
    return [
      ...suggestions.map((s: any) => ({ ...s, isSuggestion: true })),
      ...otherOptions.map((opt: any) => ({ 
        ...opt, 
        name: opt.categoryName, 
        type: opt.categoryType,
        similarity: 0,
        isSuggestion: false 
      }))
    ];
  };

  const handleSkipItem = () => {
    if (currentItemIndex < items.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    } else {
      handleFinish();
    }
  };

  const handleNextItem = () => {
    if (currentItemIndex < items.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    } else {
      handleFinish();
    }
  };

  const handlePreviousItem = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
    }
  };

  const handleFinish = async () => {
    setIsProcessing(true);
    try {
      await onApplyMappings(items);
      onClose();
    } catch (error) {
      console.error('매핑 적용 실패:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'exact_match':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'partial_match':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'no_match':
        return <X className="w-4 h-4 text-red-600" />;
      default:
        return <Search className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'exact_match':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'partial_match':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'no_match':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!currentItem && !isLoadingCategories) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            분류 매핑 검증 및 수정
            {isLoadingCategories && (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            )}
          </DialogTitle>
        </DialogHeader>

        {/* 진행률 표시 */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              진행률: {currentItemIndex + 1} / {items.length}
            </span>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-600" />
                <span>해결됨: {stats.resolved}</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-yellow-600" />
                <span>검토 필요: {stats.needsAttention}</span>
              </div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentItemIndex + 1) / items.length) * 100}%` }}
            />
          </div>
        </div>

        {/* 현재 품목 정보 */}
        {isLoadingCategories && !currentItem ? (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-blue-600" />
                  <p className="text-sm text-gray-600">분류 데이터를 불러오는 중...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : currentItem ? (
          <Card className="mb-6">
            <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg text-gray-900">
                {currentItem.itemName}
              </h3>
              <div className="flex items-center gap-2">
                {getStatusIcon(currentItem.mappingResult.status)}
                <Badge className={getStatusColor(currentItem.mappingResult.status)}>
                  {currentItem.mappingResult.status === 'exact_match' && '완전 매칭'}
                  {currentItem.mappingResult.status === 'partial_match' && '부분 매칭'}
                  {currentItem.mappingResult.status === 'no_match' && '매칭 없음'}
                  {currentItem.mappingResult.status === 'invalid_hierarchy' && '계층 오류'}
                </Badge>
                <Badge variant="outline" className={cn(
                  "text-xs",
                  getConfidenceColor(currentItem.mappingResult.confidence)
                )}>
                  <TrendingUp className="w-3 h-3 mr-1" />
                  신뢰도: {currentItem.mappingResult.confidence}%
                </Badge>
              </div>
            </div>

            {/* 엑셀 원본 분류 */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">엑셀 대분류</label>
                <div className="p-2 bg-blue-50 rounded text-sm text-blue-800 min-h-[32px] flex items-center">
                  {currentItem.originalCategories.major || '없음'}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">엑셀 중분류</label>
                <div className="p-2 bg-blue-50 rounded text-sm text-blue-800 min-h-[32px] flex items-center">
                  {currentItem.originalCategories.middle || '없음'}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">엑셀 소분류</label>
                <div className="p-2 bg-blue-50 rounded text-sm text-blue-800 min-h-[32px] flex items-center">
                  {currentItem.originalCategories.minor || '없음'}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center py-2">
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>

            {/* DB 매핑 결과 또는 사용자 선택 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">시스템 대분류</label>
                <Select 
                  value={currentItem.userSelection?.majorId?.toString() || currentItem.mappingResult.db.majorId?.toString() || ''}
                  onValueChange={(value) => handleUserSelection('major', parseInt(value))}
                  disabled={isLoadingCategories}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder={isLoadingCategories ? "로딩 중..." : "대분류 선택"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getCombinedOptions('major').map(option => (
                      <SelectItem key={option.id} value={option.id.toString()}>
                        <div className="flex items-center justify-between w-full">
                          <span className={option.isSuggestion ? "font-medium text-blue-600" : ""}>
                            {option.name}
                          </span>
                          {option.isSuggestion && option.similarity > 0 && (
                            <Badge variant="outline" className="ml-2 text-xs bg-blue-50 text-blue-600 border-blue-200">
                              {option.similarity}%
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">시스템 중분류</label>
                <Select 
                  value={currentItem.userSelection?.middleId?.toString() || currentItem.mappingResult.db.middleId?.toString() || ''}
                  onValueChange={(value) => handleUserSelection('middle', parseInt(value))}
                  disabled={isLoadingCategories || !getCurrentMajorId()}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder={
                      isLoadingCategories ? "로딩 중..." :
                      !getCurrentMajorId() ? "먼저 대분류를 선택하세요" :
                      "중분류 선택"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {getCombinedOptions('middle', getCurrentMajorId()).map(option => (
                      <SelectItem key={option.id} value={option.id.toString()}>
                        <div className="flex items-center justify-between w-full">
                          <span className={option.isSuggestion ? "font-medium text-blue-600" : ""}>
                            {option.name}
                          </span>
                          {option.isSuggestion && option.similarity > 0 && (
                            <Badge variant="outline" className="ml-2 text-xs bg-blue-50 text-blue-600 border-blue-200">
                              {option.similarity}%
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">시스템 소분류</label>
                <Select 
                  value={currentItem.userSelection?.minorId?.toString() || currentItem.mappingResult.db.minorId?.toString() || ''}
                  onValueChange={(value) => handleUserSelection('minor', parseInt(value))}
                  disabled={isLoadingCategories || !getCurrentMiddleId()}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder={
                      isLoadingCategories ? "로딩 중..." :
                      !getCurrentMiddleId() ? "먼저 중분류를 선택하세요" :
                      "소분류 선택"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {getCombinedOptions('minor', getCurrentMiddleId()).map(option => (
                      <SelectItem key={option.id} value={option.id.toString()}>
                        <div className="flex items-center justify-between w-full">
                          <span className={option.isSuggestion ? "font-medium text-blue-600" : ""}>
                            {option.name}
                          </span>
                          {option.isSuggestion && option.similarity > 0 && (
                            <Badge variant="outline" className="ml-2 text-xs bg-blue-50 text-blue-600 border-blue-200">
                              {option.similarity}%
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        ) : null}

        {/* 추천 사항 */}
        {currentItem && currentItem.mappingResult.suggestions.length > 0 && (
          <Alert className="mb-6">
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-2">💡 추천 매핑:</div>
              <div className="text-sm space-y-1">
                {currentItem.mappingResult.suggestions.slice(0, 3).map((suggestion, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span>
                      {suggestion.type === 'major' && '대분류: '}
                      {suggestion.type === 'middle' && '중분류: '}
                      {suggestion.type === 'minor' && '소분류: '}
                      {suggestion.name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      유사도 {suggestion.similarity}%
                    </Badge>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handlePreviousItem}
              disabled={currentItemIndex === 0 || isLoadingCategories}
              size="sm"
            >
              이전
            </Button>
            <Button
              variant="outline"
              onClick={handleSkipItem}
              disabled={isLoadingCategories}
              size="sm"
            >
              건너뛰기
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
            >
              취소
            </Button>
            {!isLoadingCategories && currentItem && (
              currentItemIndex < items.length - 1 ? (
                <Button
                  onClick={handleNextItem}
                  disabled={isProcessing}
                >
                  다음
                </Button>
              ) : (
                <Button
                  onClick={handleFinish}
                  disabled={isProcessing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      적용 중...
                    </>
                  ) : (
                    '매핑 적용'
                  )}
                </Button>
              )
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryMappingModal;