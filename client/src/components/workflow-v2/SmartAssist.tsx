import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Info,
  RefreshCw,
  ArrowRight
} from 'lucide-react';

interface SmartAssistProps {
  orderData: any;
  onSuggestionApply: (data: any) => void;
}

interface Suggestion {
  id: string;
  type: 'info' | 'warning' | 'recommendation' | 'autofill';
  title: string;
  description: string;
  action?: {
    label: string;
    data: any;
  };
  priority: 'high' | 'medium' | 'low';
}

const SmartAssist: React.FC<SmartAssistProps> = ({ orderData, onSuggestionApply }) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    analyzeSuggestions();
  }, [orderData]);

  const analyzeSuggestions = () => {
    setIsAnalyzing(true);
    const newSuggestions: Suggestion[] = [];

    // 자동 완성 제안
    if (orderData.vendorName && !orderData.vendorEmail) {
      newSuggestions.push({
        id: 'vendor-email',
        type: 'autofill',
        title: '거래처 이메일 자동 완성',
        description: '등록된 거래처 정보에서 이메일을 가져올 수 있습니다.',
        action: {
          label: '이메일 자동 입력',
          data: { vendorEmail: 'vendor@example.com' } // 실제로는 DB에서 조회
        },
        priority: 'high'
      });
    }

    // 납기일 확인
    if (orderData.deliveryDate) {
      const deliveryDate = new Date(orderData.deliveryDate);
      const today = new Date();
      const diffDays = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 3) {
        newSuggestions.push({
          id: 'delivery-urgent',
          type: 'warning',
          title: '긴급 납기',
          description: `납기일이 ${diffDays}일 남았습니다. 긴급 처리가 필요합니다.`,
          priority: 'high'
        });
      }
    }

    // 프로젝트별 기본값 제안
    if (orderData.projectName && !orderData.notes) {
      newSuggestions.push({
        id: 'project-defaults',
        type: 'recommendation',
        title: '프로젝트 기본 설정',
        description: '이전 발주서를 참고하여 자주 사용하는 설정을 적용할 수 있습니다.',
        action: {
          label: '기본값 적용',
          data: { 
            notes: '상차 후 연락 요망',
            deliveryLocation: '현장 직납'
          }
        },
        priority: 'medium'
      });
    }

    // 금액 검증
    if (orderData.totalAmount > 10000000) {
      newSuggestions.push({
        id: 'amount-check',
        type: 'info',
        title: '고액 발주서',
        description: '1천만원 이상의 발주서입니다. 결재 승인이 필요할 수 있습니다.',
        priority: 'medium'
      });
    }

    // 유사 거래처 추천
    if (orderData.vendorName && orderData.vendorName.length > 2) {
      // 실제로는 DB에서 유사 거래처 검색
      const similarVendors = ['(주)ABC건설', '(주)ABC종합건설'];
      if (similarVendors.length > 0) {
        newSuggestions.push({
          id: 'similar-vendors',
          type: 'recommendation',
          title: '유사 거래처 발견',
          description: `'${orderData.vendorName}'와 유사한 거래처가 있습니다. 확인해보세요.`,
          priority: 'low'
        });
      }
    }

    setSuggestions(newSuggestions.filter(s => !dismissedSuggestions.has(s.id)));
    setIsAnalyzing(false);
  };

  const applySuggestion = (suggestion: Suggestion) => {
    if (suggestion.action) {
      onSuggestionApply(suggestion.action.data);
      dismissSuggestion(suggestion.id);
    }
  };

  const dismissSuggestion = (id: string) => {
    setDismissedSuggestions(prev => new Set(prev).add(id));
    setSuggestions(prev => prev.filter(s => s.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
      case 'recommendation':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'autofill':
        return <Lightbulb className="w-5 h-5 text-purple-600" />;
      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      case 'recommendation':
        return 'bg-green-50 border-green-200';
      case 'autofill':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (suggestions.length === 0 && !isAnalyzing) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            스마트 어시스트
          </CardTitle>
          {isAnalyzing && (
            <RefreshCw className="w-4 h-4 text-gray-500 animate-spin" />
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {suggestions
          .sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          })
          .map(suggestion => (
            <Alert 
              key={suggestion.id}
              className={`${getBgColor(suggestion.type)} border`}
            >
              <div className="flex items-start gap-3">
                {getIcon(suggestion.type)}
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{suggestion.title}</p>
                    {suggestion.priority === 'high' && (
                      <Badge variant="destructive" className="text-xs">중요</Badge>
                    )}
                  </div>
                  <AlertDescription className="text-xs">
                    {suggestion.description}
                  </AlertDescription>
                  
                  {suggestion.action && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => applySuggestion(suggestion)}
                    >
                      {suggestion.action.label}
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
                
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-gray-400 hover:text-gray-600 h-6 w-6 p-0"
                  onClick={() => dismissSuggestion(suggestion.id)}
                >
                  ×
                </Button>
              </div>
            </Alert>
          ))}
        
        {suggestions.length === 0 && !isAnalyzing && (
          <div className="text-center py-4 text-sm text-gray-500">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            모든 항목이 올바르게 입력되었습니다
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SmartAssist;