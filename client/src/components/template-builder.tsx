import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Save, Eye, Settings, Grid3X3, FileSpreadsheet, ArrowUp, ArrowDown } from 'lucide-react';
import { DynamicHandsontable } from './dynamic-handsontable';

// 컴팩트한 한국어 UI를 위한 타이트한 스타일링
const compactStyles = {
  input: "h-6 text-xs px-1.5 py-1",
  label: "text-xs font-medium",
  button: "h-6 px-2 text-xs",
  card: "p-2 space-y-1.5",
  section: "space-y-1",
};

interface TemplateField {
  id: string;
  fieldType: 'text' | 'number' | 'select' | 'date' | 'textarea';
  fieldName: string;
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: any;
  options?: string[];
  gridPosition: { row: number; col: number; span: number };
  sectionName: string;
  sortOrder: number;
}

interface HandsontableColumn {
  data: string;
  title: string;
  type: 'text' | 'numeric' | 'dropdown' | 'date' | 'checkbox';
  width?: number;
  readOnly?: boolean;
  source?: string[];
  validator?: string;
  renderer?: string;
}

interface HandsontableConfig {
  colHeaders: string[];
  columns: HandsontableColumn[];
  rowsCount: number;
  formulas: Record<string, string>;
  validationRules: Record<string, any>;
  customStyles: Record<string, any>;
  settings: Record<string, any>;
}

interface TemplateBuilderProps {
  templateId?: number;
  onSave?: (templateData: any) => void;
  onCancel?: () => void;
}

export function TemplateBuilder({ templateId, onSave, onCancel }: TemplateBuilderProps) {
  const { toast } = useToast();
  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState<'general' | 'handsontable'>('general');
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [handsontableConfig, setHandsontableConfig] = useState<HandsontableConfig>({
    colHeaders: ['NO', '품명', '규격', '단위', '수량', '단가', '금액', '비고'],
    columns: [
      { data: 'no', title: 'NO', type: 'text', width: 50, readOnly: true },
      { data: 'itemName', title: '품명', type: 'text', width: 120 },
      { data: 'specification', title: '규격', type: 'text', width: 100 },
      { data: 'unit', title: '단위', type: 'text', width: 60 },
      { data: 'quantity', title: '수량', type: 'numeric', width: 80 },
      { data: 'unitPrice', title: '단가', type: 'numeric', width: 100 },
      { data: 'totalAmount', title: '금액', type: 'numeric', width: 120, readOnly: true },
      { data: 'notes', title: '비고', type: 'text', width: 100 },
    ],
    rowsCount: 10,
    formulas: { 6: 'quantity * unitPrice' },
    validationRules: {},
    customStyles: {},
    settings: {}
  });
  const [previewMode, setPreviewMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 기존 템플릿 데이터 로드
  const { data: templateData } = useQuery({
    queryKey: ['/api/order-templates', templateId],
    queryFn: () => fetch(`/api/order-templates/${templateId}`, { credentials: 'include' }).then(res => res.json()),
    enabled: !!templateId,
  });

  // 템플릿 데이터 로드시 폼 필드 설정
  useEffect(() => {
    if (templateData && templateId) {
      setTemplateName(templateData.templateName || '');
      setTemplateType(templateData.templateType === 'handsontable' ? 'handsontable' : 'general');
      
      // 기존 템플릿의 fieldsConfig를 fields로 변환
      if (templateData.fieldsConfig) {
        const convertedFields: TemplateField[] = [];
        let fieldIndex = 0;
        
        // fieldsConfig의 각 섹션을 순회하며 필드 생성
        Object.entries(templateData.fieldsConfig).forEach(([sectionName, sectionFields]: [string, any]) => {
          if (typeof sectionFields === 'object' && sectionFields !== null) {
            Object.entries(sectionFields).forEach(([fieldName, label]: [string, any]) => {
              if (typeof label === 'string') {
                convertedFields.push({
                  id: `field_${fieldIndex++}`,
                  fieldType: 'text',
                  fieldName,
                  label,
                  placeholder: '',
                  required: false,
                  gridPosition: { row: Math.floor(fieldIndex / 3) + 1, col: (fieldIndex % 3) + 1, span: 1 },
                  sectionName,
                  sortOrder: fieldIndex,
                });
              }
            });
          }
        });
        
        setFields(convertedFields);
      }

      // Handsontable 설정이 있는 경우 로드
      if (templateData.handsontableConfig) {
        setHandsontableConfig(templateData.handsontableConfig);
      }
    }
  }, [templateData, templateId]);

  // 새 필드 추가
  const addField = () => {
    const newField: TemplateField = {
      id: `field_${Date.now()}`,
      fieldType: 'text',
      fieldName: '',
      label: '',
      placeholder: '',
      required: false,
      gridPosition: { row: 1, col: 1, span: 1 },
      sectionName: '기본정보',
      sortOrder: fields.length,
    };
    setFields([...fields, newField]);
  };

  // 필드 업데이트
  const updateField = (id: string, updates: Partial<TemplateField>) => {
    setFields(fields.map(field => 
      field.id === id ? { ...field, ...updates } : field
    ));
  };

  // 필드 삭제
  const removeField = (id: string) => {
    setFields(fields.filter(field => field.id !== id));
  };

  // 필드 순서 변경
  const moveField = (id: string, direction: 'up' | 'down') => {
    const index = fields.findIndex(field => field.id === id);
    if (index === -1) return;
    
    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newFields.length) {
      [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
      setFields(newFields);
    }
  };

  // Handsontable 컬럼 추가
  const addColumn = () => {
    const newColumn: HandsontableColumn = {
      data: `col_${handsontableConfig.columns.length}`,
      title: '새 컬럼',
      type: 'text',
      width: 100,
    };
    setHandsontableConfig({
      ...handsontableConfig,
      colHeaders: [...handsontableConfig.colHeaders, '새 컬럼'],
      columns: [...handsontableConfig.columns, newColumn],
    });
  };

  // Handsontable 컬럼 업데이트
  const updateColumn = (index: number, updates: Partial<HandsontableColumn>) => {
    const newColumns = [...handsontableConfig.columns];
    newColumns[index] = { ...newColumns[index], ...updates };
    
    const newHeaders = [...handsontableConfig.colHeaders];
    if (updates.title) {
      newHeaders[index] = updates.title;
    }
    
    setHandsontableConfig({
      ...handsontableConfig,
      columns: newColumns,
      colHeaders: newHeaders,
    });
  };

  // Handsontable 컬럼 삭제
  const removeColumn = (index: number) => {
    const newColumns = handsontableConfig.columns.filter((_, i) => i !== index);
    const newHeaders = handsontableConfig.colHeaders.filter((_, i) => i !== index);
    
    setHandsontableConfig({
      ...handsontableConfig,
      columns: newColumns,
      colHeaders: newHeaders,
    });
  };

  // 템플릿 저장
  const saveTemplate = async () => {
    if (!templateName.trim()) {
      toast({
        title: "오류",
        description: "템플릿 이름을 입력하세요.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const templateData = {
        templateName,
        templateType,
        fieldsConfig: templateType === 'general' 
          ? { fields: fields }
          : { handsontable: handsontableConfig },
      };

      if (onSave) {
        onSave(templateData);
      }

      toast({
        title: "성공",
        description: "템플릿이 저장되었습니다.",
      });
    } catch (error) {
      console.error('Template save error:', error);
      toast({
        title: "오류",
        description: "템플릿 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center space-x-2">
          <h2 className="text-sm font-semibold">템플릿 빌더</h2>
          <Badge variant={templateType === 'handsontable' ? 'default' : 'secondary'} className="text-xs">
            {templateType === 'handsontable' ? 'Handsontable' : '일반폼'}
          </Badge>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
            className={compactStyles.button}
          >
            <Eye className="w-3 h-3 mr-1" />
            미리보기
          </Button>
          <Button
            onClick={saveTemplate}
            disabled={isLoading}
            size="sm"
            className={compactStyles.button}
          >
            <Save className="w-3 h-3 mr-1" />
            저장
          </Button>
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              size="sm"
              className={compactStyles.button}
            >
              취소
            </Button>
          )}
        </div>
      </div>

      {previewMode ? (
        // 전체 화면 미리보기 모드
        <div className="h-[calc(100vh-200px)]">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">템플릿 미리보기</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-280px)]">
                {templateType === 'general' ? (
                  <div className="space-y-4">
                    {fields.length === 0 ? (
                      <div className="text-center text-muted-foreground text-sm py-8">
                        필드를 추가하여 폼을 구성하세요
                      </div>
                    ) : (
                      <div className="max-w-4xl mx-auto">
                        <div className="grid grid-cols-3 gap-4">
                          {fields.map((field) => (
                            <div key={field.id} className="space-y-2">
                              <Label className="text-sm font-medium">
                                {field.label || field.fieldName}
                                {field.required && <span className="text-red-500">*</span>}
                              </Label>
                              {field.fieldType === 'textarea' ? (
                                <Textarea 
                                  placeholder={field.placeholder}
                                  className="h-20"
                                  disabled
                                />
                              ) : field.fieldType === 'select' ? (
                                <Select disabled>
                                  <SelectTrigger>
                                    <SelectValue placeholder={field.placeholder} />
                                  </SelectTrigger>
                                </Select>
                              ) : (
                                <Input
                                  type={field.fieldType === 'number' ? 'number' : field.fieldType === 'date' ? 'date' : 'text'}
                                  placeholder={field.placeholder}
                                  disabled
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="text-lg font-medium">Handsontable 미리보기</h3>
                      <p className="text-sm text-muted-foreground">실제 스프레드시트 인터페이스</p>
                    </div>
                    <DynamicHandsontable
                      config={handsontableConfig}
                      readOnly={false}
                      onChange={(data, changes) => {
                        console.log('Preview data changed:', data, changes);
                      }}
                    />
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-2 h-[calc(100vh-200px)]">
          {/* 설정 패널 */}
          <div className="col-span-4 border-r pr-2">
            <ScrollArea className="h-full">
              <div className="space-y-2">
              {/* 기본 설정 */}
              <Card className={compactStyles.card}>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs">기본 설정</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  <div className={compactStyles.section}>
                    <Label className={compactStyles.label}>템플릿 이름</Label>
                    <Input
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="템플릿 이름 입력"
                      className={compactStyles.input}
                    />
                  </div>
                  <div className={compactStyles.section}>
                    <Label className={compactStyles.label}>템플릿 유형</Label>
                    <Select value={templateType} onValueChange={(value: any) => setTemplateType(value)}>
                      <SelectTrigger className={compactStyles.input}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">일반폼</SelectItem>
                        <SelectItem value="handsontable">시트폼</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* 템플릿 타입별 설정 */}
              <Tabs value={templateType} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-7">
                  <TabsTrigger value="general" className="text-xs h-5">
                    <Grid3X3 className="w-3 h-3 mr-1" />
                    폼
                  </TabsTrigger>
                  <TabsTrigger value="handsontable" className="text-xs h-5">
                    <FileSpreadsheet className="w-3 h-3 mr-1" />
                    표
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="mt-2">
                  <Card className={compactStyles.card}>
                    <CardHeader className="pb-1">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs">폼 필드</CardTitle>
                        <Button
                          onClick={addField}
                          size="sm"
                          variant="outline"
                          className="h-5 px-1.5 text-xs"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {fields.map((field) => (
                        <div key={field.id} className="border rounded p-1.5 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1">
                              <Button
                                onClick={() => moveField(field.id, 'up')}
                                size="sm"
                                variant="ghost"
                                className="h-4 w-4 p-0"
                              >
                                <ArrowUp className="w-2 h-2" />
                              </Button>
                              <Button
                                onClick={() => moveField(field.id, 'down')}
                                size="sm"
                                variant="ghost"
                                className="h-4 w-4 p-0"
                              >
                                <ArrowDown className="w-2 h-2" />
                              </Button>
                            </div>
                            <Button
                              onClick={() => removeField(field.id)}
                              size="sm"
                              variant="ghost"
                              className="h-4 w-4 p-0 text-red-500"
                            >
                              <Trash2 className="w-2 h-2" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-1">
                            <div>
                              <Label className="text-xs">필드명</Label>
                              <Input
                                value={field.fieldName}
                                onChange={(e) => updateField(field.id, { fieldName: e.target.value })}
                                className="h-5 text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">라벨</Label>
                              <Input
                                value={field.label}
                                onChange={(e) => updateField(field.id, { label: e.target.value })}
                                className="h-5 text-xs"
                              />
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs">타입</Label>
                            <Select
                              value={field.fieldType}
                              onValueChange={(value: any) => updateField(field.id, { fieldType: value })}
                            >
                              <SelectTrigger className="h-5 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">텍스트</SelectItem>
                                <SelectItem value="number">숫자</SelectItem>
                                <SelectItem value="select">선택</SelectItem>
                                <SelectItem value="date">날짜</SelectItem>
                                <SelectItem value="textarea">긴 텍스트</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={field.required}
                              onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                            />
                            <Label className="text-xs">필수</Label>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="handsontable" className="mt-2">
                  <Card className={compactStyles.card}>
                    <CardHeader className="pb-1">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs">테이블 컬럼</CardTitle>
                        <Button
                          onClick={addColumn}
                          size="sm"
                          variant="outline"
                          className="h-5 px-1.5 text-xs"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {handsontableConfig.columns.map((column, index) => (
                        <div key={index} className="border rounded p-1.5 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">컬럼 {index + 1}</span>
                            <Button
                              onClick={() => removeColumn(index)}
                              size="sm"
                              variant="ghost"
                              className="h-4 w-4 p-0 text-red-500"
                            >
                              <Trash2 className="w-2 h-2" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-1">
                            <div>
                              <Label className="text-xs">제목</Label>
                              <Input
                                value={column.title}
                                onChange={(e) => updateColumn(index, { title: e.target.value })}
                                className="h-5 text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">너비</Label>
                              <Input
                                type="number"
                                value={column.width || 100}
                                onChange={(e) => updateColumn(index, { width: parseInt(e.target.value) })}
                                className="h-5 text-xs"
                              />
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs">데이터 타입</Label>
                            <Select
                              value={column.type}
                              onValueChange={(value: any) => updateColumn(index, { type: value })}
                            >
                              <SelectTrigger className="h-5 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">텍스트</SelectItem>
                                <SelectItem value="numeric">숫자</SelectItem>
                                <SelectItem value="dropdown">드롭다운</SelectItem>
                                <SelectItem value="date">날짜</SelectItem>
                                <SelectItem value="checkbox">체크박스</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={column.readOnly || false}
                              onCheckedChange={(checked) => updateColumn(index, { readOnly: checked })}
                            />
                            <Label className="text-xs">읽기전용</Label>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </div>

        {/* 미리보기 패널 */}
        <div className="col-span-8">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">미리보기</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-300px)]">
                {templateType === 'general' ? (
                  <div className="space-y-2">
                    {fields.length === 0 ? (
                      <div className="text-center text-muted-foreground text-sm py-8">
                        필드를 추가하여 폼을 구성하세요
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {fields.map((field) => (
                          <div key={field.id} className="space-y-1">
                            <Label className={compactStyles.label}>
                              {field.label || field.fieldName}
                              {field.required && <span className="text-red-500">*</span>}
                            </Label>
                            {field.fieldType === 'textarea' ? (
                              <Textarea 
                                placeholder={field.placeholder}
                                className="h-16 text-xs"
                                disabled
                              />
                            ) : field.fieldType === 'select' ? (
                              <Select disabled>
                                <SelectTrigger className={compactStyles.input}>
                                  <SelectValue placeholder={field.placeholder} />
                                </SelectTrigger>
                              </Select>
                            ) : (
                              <Input
                                type={field.fieldType === 'number' ? 'number' : field.fieldType === 'date' ? 'date' : 'text'}
                                placeholder={field.placeholder}
                                className={compactStyles.input}
                                disabled
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Handsontable 실시간 미리보기</div>
                    <DynamicHandsontable
                      config={handsontableConfig}
                      readOnly={true}
                      onChange={(data, changes) => {
                        console.log('Preview data changed:', data, changes);
                      }}
                    />
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
        </div>
      )}
    </div>
  );
}