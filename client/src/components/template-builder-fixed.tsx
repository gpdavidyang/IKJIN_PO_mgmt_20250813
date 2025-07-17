import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Eye, Save, Plus, Trash2, ArrowUp, ArrowDown, Grid3X3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SimpleTablePreview } from '@/components/simple-table-preview';
import { queryClient } from '@/lib/queryClient';

// 컴팩트 스타일 정의
const compactStyles = {
  card: "border border-border/50 shadow-sm",
  section: "space-y-1",
  label: "text-xs font-medium text-muted-foreground",
  input: "h-7 text-xs",
  button: "h-7 text-xs px-2",
  textarea: "min-h-[60px] text-xs resize-none",
  select: "h-7 text-xs"
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

function TemplateBuilderFixed({ templateId, onSave, onCancel }: TemplateBuilderProps) {
  const { toast } = useToast();
  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState<'general' | 'handsontable'>('handsontable');
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [handsontableConfig, setHandsontableConfig] = useState<HandsontableConfig>({
    colHeaders: ['품목명', '수량', '단가', '총액', '규격', '비고'],
    columns: [
      { data: 'itemName', title: '품목명', type: 'text', width: 150 },
      { data: 'quantity', title: '수량', type: 'numeric', width: 80 },
      { data: 'unitPrice', title: '단가', type: 'numeric', width: 100 },
      { data: 'totalAmount', title: '총액', type: 'numeric', width: 120, readOnly: true },
      { data: 'specification', title: '규격', type: 'text', width: 120 },
      { data: 'notes', title: '비고', type: 'text', width: 150 }
    ],
    rowsCount: 10,
    formulas: {},
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
      console.log('Loading template data:', templateData);
      setTemplateName(templateData.templateName || '');
      // material_extrusion과 panel_manufacturing 타입을 general로 처리
      const normalizedType = (templateData.templateType === 'material_extrusion' || 
                             templateData.templateType === 'panel_manufacturing') 
                             ? 'general' : templateData.templateType;
      setTemplateType(normalizedType || 'handsontable');
      
      // fieldsConfig 처리
      if (templateData.fieldsConfig) {
        try {
          const parsedConfig = typeof templateData.fieldsConfig === 'string' 
            ? JSON.parse(templateData.fieldsConfig) 
            : templateData.fieldsConfig;
          
          console.log('Parsed fieldsConfig:', parsedConfig);
          
          if (templateData.templateType === 'general' || 
              templateData.templateType === 'material_extrusion' || 
              templateData.templateType === 'panel_manufacturing') {
            // 일반 폼의 경우 fields 배열 로드
            if (parsedConfig.fields && Array.isArray(parsedConfig.fields)) {
              setFields(parsedConfig.fields);
              console.log('Loaded fields:', parsedConfig.fields);
            } else if (parsedConfig && Array.isArray(parsedConfig)) {
              // fieldsConfig가 직접 배열인 경우
              setFields(parsedConfig);
              console.log('Loaded fields (direct array):', parsedConfig);
            } else if (parsedConfig.item_fields || parsedConfig.basic_fields || 
                       parsedConfig.extrusion_list || parsedConfig.schedule_fields || 
                       parsedConfig.specification_fields || parsedConfig.color_breakdown ||
                       parsedConfig.material_fields || parsedConfig.panel_breakdown ||
                       parsedConfig.delivery_schedule || parsedConfig.insulation_details) {
              // 레거시 데이터 구조 변환
              const convertedFields: TemplateField[] = [];
              let sortOrder = 0;
              
              // 모든 섹션을 순회하여 필드 생성
              const sections = [
                { key: 'basic_fields', name: '기본 정보', data: parsedConfig.basic_fields },
                { key: 'item_fields', name: '품목 정보', data: parsedConfig.item_fields },
                { key: 'extrusion_list', name: '압출 목록', data: parsedConfig.extrusion_list },
                { key: 'schedule_fields', name: '일정 정보', data: parsedConfig.schedule_fields },
                { key: 'specification_fields', name: '사양 정보', data: parsedConfig.specification_fields },
                { key: 'color_breakdown', name: '색상 분류', data: parsedConfig.color_breakdown },
                { key: 'material_fields', name: '재료 정보', data: parsedConfig.material_fields },
                { key: 'panel_breakdown', name: '판넬 분류', data: parsedConfig.panel_breakdown },
                { key: 'delivery_schedule', name: '배송 일정', data: parsedConfig.delivery_schedule },
                { key: 'insulation_details', name: '단열재 상세', data: parsedConfig.insulation_details }
              ];
              
              sections.forEach(section => {
                if (section.data) {
                  Object.entries(section.data).forEach(([key, label]) => {
                    convertedFields.push({
                      id: `${section.key}_${key}`,
                      fieldType: key.includes('date') ? 'date' : 
                                key.includes('amount') || key.includes('price') || 
                                key.includes('quantity') || key.includes('count') || 
                                key.includes('weight') || key.includes('kg') || 
                                key.includes('area') || key === 'quantity' ? 'number' : 'text',
                      fieldName: key,
                      label: label as string,
                      placeholder: '',
                      required: true,
                      validation: {},
                      options: [],
                      gridPosition: { row: Math.floor(sortOrder / 3), col: sortOrder % 3, span: 1 },
                      sectionName: section.name,
                      sortOrder: sortOrder++
                    });
                  });
                }
              });
              
              setFields(convertedFields);
              console.log('Converted legacy fields:', convertedFields);
            }
          } else if (templateData.templateType === 'handsontable') {
            // Handsontable의 경우 handsontableConfig 로드
            if (parsedConfig.handsontableConfig) {
              setHandsontableConfig(parsedConfig.handsontableConfig);
            } else if (parsedConfig.columns) {
              // fieldsConfig에 직접 handsontable 설정이 있는 경우
              setHandsontableConfig(parsedConfig);
            }
          }
        } catch (error) {
          console.error('Error parsing fieldsConfig:', error);
        }
      }

      // 별도의 handsontableConfig 필드 처리
      if (templateData.handsontableConfig) {
        setHandsontableConfig(templateData.handsontableConfig);
      }
    }
  }, [templateData, templateId]);

  const addField = () => {
    const newField: TemplateField = {
      id: `field_${Date.now()}`,
      fieldType: 'text',
      fieldName: `field_${fields.length + 1}`,
      label: `필드 ${fields.length + 1}`,
      placeholder: '',
      required: false,
      validation: {},
      options: [],
      gridPosition: { row: 0, col: 0, span: 1 },
      sectionName: '기본',
      sortOrder: fields.length
    };
    setFields([...fields, newField]);
  };

  const removeField = (id: string) => {
    setFields(fields.filter(field => field.id !== id));
  };

  const updateField = (id: string, updates: Partial<TemplateField>) => {
    setFields(fields.map(field => 
      field.id === id ? { ...field, ...updates } : field
    ));
  };

  const addColumn = () => {
    const newColumn: HandsontableColumn = {
      data: `col_${handsontableConfig.columns.length}`,
      title: `컬럼 ${handsontableConfig.columns.length + 1}`,
      type: 'text',
      width: 100
    };
    
    setHandsontableConfig({
      ...handsontableConfig,
      colHeaders: [...handsontableConfig.colHeaders, newColumn.title],
      columns: [...handsontableConfig.columns, newColumn]
    });
  };

  const removeColumn = (index: number) => {
    const newColumns = handsontableConfig.columns.filter((_, i) => i !== index);
    const newHeaders = handsontableConfig.colHeaders.filter((_, i) => i !== index);
    
    setHandsontableConfig({
      ...handsontableConfig,
      colHeaders: newHeaders,
      columns: newColumns
    });
  };

  const updateColumn = (index: number, updates: Partial<HandsontableColumn>) => {
    const newColumns = handsontableConfig.columns.map((col, i) => 
      i === index ? { ...col, ...updates } : col
    );
    
    const newHeaders = handsontableConfig.colHeaders.map((header, i) => 
      i === index && updates.title ? updates.title : header
    );
    
    const newConfig = {
      ...handsontableConfig,
      colHeaders: newHeaders,
      columns: newColumns
    };
    
    console.log('updateColumn called:', { index, updates, newConfig });
    setHandsontableConfig(newConfig);
  };

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
          ? JSON.stringify({ fields }) 
          : JSON.stringify({ handsontableConfig }),
        handsontableConfig: templateType === 'handsontable' ? handsontableConfig : undefined,
        isActive: true
      };

      if (templateId) {
        await fetch(`/api/order-templates/${templateId}`, {
          method: 'PUT',
          body: JSON.stringify(templateData),
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
      } else {
        await fetch('/api/order-templates', {
          method: 'POST',
          body: JSON.stringify(templateData),
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
      }

      queryClient.invalidateQueries({ queryKey: ['/api/order-templates'] });
      
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
            {templateType === 'handsontable' ? '시트유형' : '일반폼'}
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
        (<div className="h-[calc(100vh-200px)]">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">템플릿 미리보기 - {templateName}</CardTitle>
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
                      <h3 className="text-lg font-medium">시트유형 미리보기</h3>
                      <p className="text-sm text-muted-foreground">실제 스프레드시트 구조 및 데이터 타입</p>
                    </div>
                    <SimpleTablePreview config={handsontableConfig} />
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>)
      ) : (
        // 편집 모드
        (<div className="grid grid-cols-12 gap-2 h-[calc(100vh-200px)]">
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
                    <TabsTrigger value="general" className="text-xs h-5">일반폼</TabsTrigger>
                    <TabsTrigger value="handsontable" className="text-xs h-5">시트폼</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="general" className="space-y-2 mt-2">
                    <Card className={compactStyles.card}>
                      <CardHeader className="pb-1">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xs">필드 관리</CardTitle>
                          <Button
                            size="sm"
                            onClick={addField}
                            className={compactStyles.button}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            추가
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {fields.map((field, index) => (
                          <div key={field.id} className="p-2 border rounded space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-medium">필드 {index + 1}</Label>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => removeField(field.id)}
                                className="h-6 w-6 p-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                              <div>
                                <Label className="text-xs text-muted-foreground">필드명</Label>
                                <Input
                                  value={field.fieldName}
                                  onChange={(e) => updateField(field.id, { fieldName: e.target.value })}
                                  className={compactStyles.input}
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">라벨</Label>
                                <Input
                                  value={field.label}
                                  onChange={(e) => updateField(field.id, { label: e.target.value })}
                                  className={compactStyles.input}
                                />
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">유형</Label>
                              <Select
                                value={field.fieldType}
                                onValueChange={(value: any) => updateField(field.id, { fieldType: value })}
                              >
                                <SelectTrigger className={compactStyles.input}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">텍스트</SelectItem>
                                  <SelectItem value="number">숫자</SelectItem>
                                  <SelectItem value="date">날짜</SelectItem>
                                  <SelectItem value="select">선택</SelectItem>
                                  <SelectItem value="textarea">긴텍스트</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">플레이스홀더</Label>
                              <Input
                                value={field.placeholder}
                                onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                                className={compactStyles.input}
                              />
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
                  
                  <TabsContent value="handsontable" className="space-y-2 mt-2">
                    <Card className={compactStyles.card}>
                      <CardHeader className="pb-1">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xs">컬럼 관리</CardTitle>
                          <Button
                            size="sm"
                            onClick={addColumn}
                            className={compactStyles.button}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            추가
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {handsontableConfig.columns.map((column, index) => (
                          <div key={index} className="p-2 border rounded space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-medium">컬럼 {index + 1}</Label>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => removeColumn(index)}
                                className="h-6 w-6 p-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                              <div>
                                <Label className="text-xs text-muted-foreground">제목</Label>
                                <Input
                                  value={column.title}
                                  onChange={(e) => updateColumn(index, { title: e.target.value })}
                                  className={compactStyles.input}
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">데이터</Label>
                                <Input
                                  value={column.data}
                                  onChange={(e) => updateColumn(index, { data: e.target.value })}
                                  className={compactStyles.input}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                              <div>
                                <Label className="text-xs text-muted-foreground">유형</Label>
                                <Select
                                  value={column.type}
                                  onValueChange={(value: any) => updateColumn(index, { type: value })}
                                >
                                  <SelectTrigger className={compactStyles.input}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="text">텍스트</SelectItem>
                                    <SelectItem value="numeric">숫자</SelectItem>
                                    <SelectItem value="date">날짜</SelectItem>
                                    <SelectItem value="dropdown">드롭다운</SelectItem>
                                    <SelectItem value="checkbox">체크박스</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">너비</Label>
                                <Input
                                  type="number"
                                  value={column.width || 100}
                                  onChange={(e) => updateColumn(index, { width: parseInt(e.target.value) })}
                                  className={compactStyles.input}
                                />
                              </div>
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
                      <div className="text-sm font-medium">시트유형 실시간 미리보기</div>
                      
                      {/* 간단한 테이블 미리보기 */}
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="w-8 p-1 border-r text-center font-medium">#</th>
                              {handsontableConfig.colHeaders.map((header, index) => (
                                <th key={index} className="p-1 border-r text-left font-medium" style={{ width: handsontableConfig.columns[index]?.width || 100 }}>
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from({ length: Math.min(handsontableConfig.rowsCount, 5) }, (_, rowIndex) => (
                              <tr key={rowIndex} className="border-t">
                                <td className="p-1 border-r text-center bg-gray-50 font-medium">{rowIndex + 1}</td>
                                {handsontableConfig.columns.map((column, colIndex) => (
                                  <td key={colIndex} className="p-1 border-r">
                                    <div className="text-gray-400 text-xs">
                                      {column.type === 'numeric' ? '0' : 
                                       column.type === 'checkbox' ? '☐' :
                                       column.type === 'date' ? 'YYYY-MM-DD' :
                                       column.type === 'dropdown' ? '선택▼' :
                                       column.type === 'image' ? '📷' :
                                       `${column.title} 값`}
                                    </div>
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* 설정 요약 */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-blue-50 rounded">
                          <div className="font-medium text-blue-800">컬럼 수</div>
                          <div className="text-blue-600">{handsontableConfig.columns.length}개</div>
                        </div>
                        <div className="p-2 bg-green-50 rounded">
                          <div className="font-medium text-green-800">행 수</div>
                          <div className="text-green-600">{handsontableConfig.rowsCount}행</div>
                        </div>
                      </div>
                      
                      {/* 시트유형 구성 정보 */}
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                        <h4 className="font-medium text-blue-900 mb-2">시트유형 구성 완료</h4>
                        <div className="text-sm text-blue-800 grid grid-cols-2 gap-2">
                          <div><strong>컬럼:</strong> {handsontableConfig.columns.length}개</div>
                          <div><strong>행:</strong> {handsontableConfig.rowsCount}개</div>
                          <div><strong>수식:</strong> {Object.keys(handsontableConfig.formulas).length}개</div>
                          <div><strong>검증:</strong> {Object.keys(handsontableConfig.validationRules).length}개</div>
                        </div>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>)
      )}
    </div>
  );
}

export default TemplateBuilderFixed;