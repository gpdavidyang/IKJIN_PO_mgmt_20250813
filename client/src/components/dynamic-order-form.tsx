import { useState, useEffect } from "react";
import { OrderForm } from "./order-form";
import { ExcelLikeOrderForm } from "./excel-like-order-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DynamicOrderFormProps {
  orderId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function DynamicOrderForm({ orderId, onSuccess, onCancel }: DynamicOrderFormProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedTemplateType, setSelectedTemplateType] = useState<string | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

  // Load templates on component mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setIsLoadingTemplates(true);
        const response = await fetch('/api/templates', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setTemplates(data || []);
        }
      } catch (error) {
        console.error('Failed to load templates:', error);
        setTemplates([]);
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    loadTemplates();
  }, []);

  const handleTemplateChange = (value: string) => {
    const templateId = parseInt(value);
    const template = templates.find(t => t.id === templateId);
    
    setSelectedTemplateId(templateId);
    setSelectedTemplateType(template?.templateType || null);
  };

  // Show template selection if no template is selected
  if (!selectedTemplateId || !selectedTemplateType) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">발주서 작성</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="templateId">발주서 템플릿 선택 *</Label>
                <Select 
                  onValueChange={handleTemplateChange}
                  disabled={isLoadingTemplates}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingTemplates ? "로딩 중..." : "템플릿을 선택하세요"} />
                  </SelectTrigger>
                  <SelectContent className="z-[100] dropdown-high-priority" style={{ position: 'fixed', zIndex: 9999 }}>
                    {templates && templates.length > 0 ? (
                      templates.map((template: any) => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          {template.templateName}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-templates" disabled>
                        템플릿이 없습니다
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render appropriate form based on template type
  if (selectedTemplateType === 'excel_like' || selectedTemplateType === 'handsontable') {
    return (
      <ExcelLikeOrderForm 
        key={`excel-${selectedTemplateId}`}
        orderId={orderId}
        onSuccess={onSuccess}
        onCancel={() => {
          setSelectedTemplateId(null);
          setSelectedTemplateType(null);
          onCancel?.();
        }}
        preselectedTemplateId={selectedTemplateId}
      />
    );
  }

  return (
    <OrderForm 
      key={`general-${selectedTemplateId}`}
      orderId={orderId}
      onSuccess={onSuccess}
      onCancel={() => {
        setSelectedTemplateId(null);
        setSelectedTemplateType(null);
        onCancel?.();
      }}
      preselectedTemplateId={selectedTemplateId}
    />
  );
}