import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, TrendingUp, Package, Wrench, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface StandardTemplatesProps {
  onTemplateSelect: (templateData: any) => void;
}

const StandardTemplates: React.FC<StandardTemplatesProps> = ({ onTemplateSelect }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // 템플릿 목록 조회
  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const response = await fetch('/api/admin/templates?type=purchase_order', {
        credentials: 'include' // 인증 쿠키 포함
      });
      return response.json();
    }
  });

  // 자주 사용하는 템플릿 조회
  const { data: frequentTemplates } = useQuery({
    queryKey: ['frequent-templates'],
    queryFn: async () => {
      const response = await fetch('/api/admin/templates/frequent', {
        credentials: 'include' // 인증 쿠키 포함
      });
      return response.json();
    }
  });

  const templateIcons: { [key: string]: React.ReactNode } = {
    standard: <FileText className="w-8 h-8" />,
    materials: <Package className="w-8 h-8" />,
    extrusion: <Wrench className="w-8 h-8" />,
    panel: <Zap className="w-8 h-8" />,
    accessories: <Package className="w-8 h-8" />
  };

  const handleTemplateClick = async (templateId: string) => {
    setSelectedTemplate(templateId);
    
    // 템플릿 상세 데이터 로드
    try {
      const response = await fetch(`/api/admin/templates/${templateId}`, {
        credentials: 'include' // 인증 쿠키 포함
      });
      const templateData = await response.json();
      
      // 템플릿 데이터를 발주서 데이터로 변환
      const orderData = {
        orderNumber: `PO-${new Date().getTime()}`,
        orderDate: new Date(),
        templateId: templateId,
        ...templateData.defaultValues
      };
      
      onTemplateSelect(orderData);
    } catch (error) {
      console.error('Template loading error:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* 자주 사용하는 템플릿 */}
      {frequentTemplates && frequentTemplates.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold">자주 사용하는 템플릿</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {frequentTemplates.slice(0, 4).map((template: any) => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedTemplate === template.id 
                    ? 'ring-2 ring-blue-500 bg-blue-50' 
                    : 'hover:border-gray-400'
                }`}
                onClick={() => handleTemplateClick(template.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{template.name}</h4>
                      <p className="text-xs text-gray-600 mt-1">
                        {template.lastUsed} 사용
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {template.useCount}회
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 전체 템플릿 목록 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">표준 템플릿</h3>
        </div>
        
        <div className="space-y-3">
          {templates?.map((template: any) => (
            <Card
              key={template.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedTemplate === template.id 
                  ? 'ring-2 ring-blue-500 bg-blue-50' 
                  : 'hover:border-gray-400'
              }`}
              onClick={() => handleTemplateClick(template.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gray-100 rounded-lg">
                    {templateIcons[template.type] || templateIcons.standard}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-semibold">{template.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {template.description}
                    </p>
                    
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span>{template.fieldCount}개 필드</span>
                      <span>•</span>
                      <span>{template.category}</span>
                      {template.tags && template.tags.length > 0 && (
                        <>
                          <span>•</span>
                          <div className="flex gap-1">
                            {template.tags.map((tag: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {selectedTemplate === template.id && (
                    <div className="flex items-center">
                      <Badge className="bg-blue-600">선택됨</Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 선택 확인 버튼 */}
      {selectedTemplate && (
        <div className="sticky bottom-0 bg-white border-t pt-4">
          <Button className="w-full" size="lg">
            선택한 템플릿으로 시작
          </Button>
        </div>
      )}
    </div>
  );
};

export default StandardTemplates;