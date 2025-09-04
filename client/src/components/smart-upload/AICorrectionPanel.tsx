import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sparkles,
  Check,
  X,
  AlertCircle,
  TrendingUp,
  Filter,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Target,
  Mail,
  Building
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AISuggestion {
  id: string;
  rowIndex: number;
  field: string;
  fieldLabel: string;
  originalValue: any;
  suggestedValue: any;
  confidence: number;
  reason: string;
  category: 'vendor' | 'category' | 'email' | 'date' | 'number' | 'text';
  impact: 'high' | 'medium' | 'low';
  applied?: boolean;
}

interface AICorrectionPanelProps {
  suggestions: AISuggestion[];
  onApply: (suggestions: AISuggestion[]) => Promise<void>;
  onReject: (index: number) => void;
  onApplySingle?: (suggestion: AISuggestion) => Promise<void>;
  className?: string;
}

export const AICorrectionPanel: React.FC<AICorrectionPanelProps> = ({
  suggestions,
  onApply,
  onReject,
  onApplySingle,
  className
}) => {
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(
    new Set(suggestions.map(s => s.id))
  );
  const [isApplying, setIsApplying] = useState(false);
  const [filter, setFilter] = useState<'all' | 'vendor' | 'category' | 'email' | 'other'>('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['vendor', 'category', 'email']));

  // Group suggestions by category
  const groupedSuggestions = useMemo(() => {
    const groups: Record<string, AISuggestion[]> = {
      vendor: [],
      category: [],
      email: [],
      other: []
    };

    suggestions.forEach(suggestion => {
      if (suggestion.category === 'vendor') {
        groups.vendor.push(suggestion);
      } else if (suggestion.category === 'category') {
        groups.category.push(suggestion);
      } else if (suggestion.category === 'email') {
        groups.email.push(suggestion);
      } else {
        groups.other.push(suggestion);
      }
    });

    return groups;
  }, [suggestions]);

  // Filter suggestions
  const filteredSuggestions = useMemo(() => {
    if (filter === 'all') return suggestions;
    if (filter === 'other') {
      return suggestions.filter(s => 
        s.category !== 'vendor' && s.category !== 'category' && s.category !== 'email'
      );
    }
    return suggestions.filter(s => s.category === filter);
  }, [suggestions, filter]);

  // Statistics
  const stats = useMemo(() => {
    const total = suggestions.length;
    const selected = selectedSuggestions.size;
    const highConfidence = suggestions.filter(s => s.confidence >= 90).length;
    const mediumConfidence = suggestions.filter(s => s.confidence >= 70 && s.confidence < 90).length;
    const lowConfidence = suggestions.filter(s => s.confidence < 70).length;

    return {
      total,
      selected,
      highConfidence,
      mediumConfidence,
      lowConfidence,
      avgConfidence: Math.round(
        suggestions.reduce((sum, s) => sum + s.confidence, 0) / total
      )
    };
  }, [suggestions, selectedSuggestions]);

  const handleToggleAll = () => {
    if (selectedSuggestions.size === filteredSuggestions.length) {
      setSelectedSuggestions(new Set());
    } else {
      setSelectedSuggestions(new Set(filteredSuggestions.map(s => s.id)));
    }
  };

  const handleToggleSuggestion = (id: string) => {
    const newSet = new Set(selectedSuggestions);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedSuggestions(newSet);
  };

  const handleApplySelected = async () => {
    const toApply = suggestions.filter(s => selectedSuggestions.has(s.id));
    if (toApply.length === 0) return;

    setIsApplying(true);
    try {
      await onApply(toApply);
      // Clear applied suggestions
      setSelectedSuggestions(new Set());
    } catch (error) {
      console.error('Failed to apply suggestions:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const handleApplySingle = async (suggestion: AISuggestion) => {
    if (onApplySingle) {
      await onApplySingle(suggestion);
    } else {
      await onApply([suggestion]);
    }
    // Remove from selected
    const newSet = new Set(selectedSuggestions);
    newSet.delete(suggestion.id);
    setSelectedSuggestions(newSet);
  };

  const toggleGroup = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600 bg-green-50';
    if (confidence >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'vendor': return <Building className="h-4 w-4" />;
      case 'category': return <Target className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const renderSuggestionGroup = (groupName: string, groupSuggestions: AISuggestion[]) => {
    if (groupSuggestions.length === 0) return null;

    const isExpanded = expandedGroups.has(groupName);
    const groupLabel = {
      vendor: '거래처 수정',
      category: '카테고리 매핑',
      email: '이메일 수정',
      other: '기타 수정'
    }[groupName] || groupName;

    return (
      <div key={groupName} className="border rounded-lg overflow-hidden">
        <button
          onClick={() => toggleGroup(groupName)}
          className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-2">
            {getCategoryIcon(groupName)}
            <span className="font-medium">{groupLabel}</span>
            <Badge variant="secondary" className="ml-2">
              {groupSuggestions.length}
            </Badge>
          </div>
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {isExpanded && (
          <div className="divide-y">
            {groupSuggestions.map((suggestion, index) => (
              <div
                key={suggestion.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedSuggestions.has(suggestion.id)}
                    onCheckedChange={() => handleToggleSuggestion(suggestion.id)}
                  />
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          행 {suggestion.rowIndex + 1} - {suggestion.fieldLabel}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn('text-xs', getConfidenceColor(suggestion.confidence))}
                        >
                          {suggestion.confidence}% 확신도
                        </Badge>
                        {suggestion.impact === 'high' && (
                          <Badge variant="destructive" className="text-xs">
                            중요
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleApplySingle(suggestion)}
                          className="h-7 px-2"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onReject(index)}
                          className="h-7 px-2"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">현재 값:</span>
                        <div className="font-mono bg-red-50 text-red-700 px-2 py-1 rounded mt-1">
                          {suggestion.originalValue || '(비어있음)'}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">제안 값:</span>
                        <div className="font-mono bg-green-50 text-green-700 px-2 py-1 rounded mt-1">
                          {suggestion.suggestedValue}
                        </div>
                      </div>
                    </div>

                    {suggestion.reason && (
                      <div className="text-sm text-gray-600 flex items-start gap-1">
                        <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>{suggestion.reason}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (suggestions.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">AI 수정 제안이 없습니다.</p>
            <p className="text-sm text-gray-400 mt-1">
              모든 데이터가 정상적으로 검증되었습니다.
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
            <Sparkles className="h-5 w-5 text-blue-600" />
            AI 수정 제안
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              평균 확신도: {stats.avgConfidence}%
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Statistics Overview */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-600">전체 제안</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-700">{stats.highConfidence}</div>
            <div className="text-sm text-gray-600">높은 확신도</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-700">{stats.mediumConfidence}</div>
            <div className="text-sm text-gray-600">중간 확신도</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-700">{stats.selected}</div>
            <div className="text-sm text-gray-600">선택됨</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all" className="text-xs">
              전체 ({suggestions.length})
            </TabsTrigger>
            <TabsTrigger value="vendor" className="text-xs">
              거래처 ({groupedSuggestions.vendor.length})
            </TabsTrigger>
            <TabsTrigger value="category" className="text-xs">
              카테고리 ({groupedSuggestions.category.length})
            </TabsTrigger>
            <TabsTrigger value="email" className="text-xs">
              이메일 ({groupedSuggestions.email.length})
            </TabsTrigger>
            <TabsTrigger value="other" className="text-xs">
              기타 ({groupedSuggestions.other.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="space-y-4 mt-4">
            {/* Select All / Action Bar */}
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedSuggestions.size === filteredSuggestions.length && filteredSuggestions.length > 0}
                  onCheckedChange={handleToggleAll}
                />
                <span className="text-sm font-medium">
                  {selectedSuggestions.size > 0
                    ? `${selectedSuggestions.size}개 선택됨`
                    : '전체 선택'}
                </span>
              </div>
              <Button
                onClick={handleApplySelected}
                disabled={selectedSuggestions.size === 0 || isApplying}
                className="gap-2"
              >
                <Check className="h-4 w-4" />
                선택 항목 적용 ({selectedSuggestions.size})
              </Button>
            </div>

            {/* Suggestions List */}
            <div className="space-y-3">
              {filter === 'all' ? (
                <>
                  {renderSuggestionGroup('vendor', groupedSuggestions.vendor)}
                  {renderSuggestionGroup('category', groupedSuggestions.category)}
                  {renderSuggestionGroup('email', groupedSuggestions.email)}
                  {renderSuggestionGroup('other', groupedSuggestions.other)}
                </>
              ) : filter === 'other' ? (
                renderSuggestionGroup('other', groupedSuggestions.other)
              ) : (
                renderSuggestionGroup(filter, groupedSuggestions[filter])
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Info Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            AI가 제안한 수정 사항을 검토하고 선택적으로 적용할 수 있습니다.
            높은 확신도의 제안은 자동으로 선택되어 있습니다.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};