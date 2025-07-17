import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import TemplateBuilderFixed from '@/components/template-builder-fixed';
import { Plus, Edit, Copy, Trash2, FileSpreadsheet, Grid3X3, Settings, LayoutGrid, List, Power, PowerOff, FileText, Clock, Calendar, Hash, Layers } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { apiRequest } from '@/lib/queryClient';
import { useTermValue } from '@/hooks/use-ui-terms';

// Remove compact styles since we're using standard UI

interface Template {
  id: number;
  templateName: string;
  templateType: string;
  fieldsConfig: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function TemplateManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  
  // Get soft-coded terminology
  const templateTypeLabel = useTermValue('template_type_label', '시트폼');

  // 템플릿 목록 조회
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['/api/order-templates'],
    queryFn: () => fetch('/api/order-templates', { credentials: 'include' }).then(res => res.json()),
  });

  // 템플릿 생성
  const createTemplateMutation = useMutation({
    mutationFn: (templateData: any) => fetch('/api/order-templates', {
      method: 'POST',
      body: JSON.stringify(templateData),
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/order-templates'] });
      setShowBuilder(false);
      toast({
        title: "성공",
        description: "템플릿이 생성되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "템플릿 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 템플릿 업데이트
  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, templateData }: { id: number; templateData: any }) => 
      fetch(`/api/order-templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(templateData),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/order-templates'] });
      setShowBuilder(false);
      setIsEditing(false);
      setSelectedTemplate(null);
      toast({
        title: "성공",
        description: "템플릿이 수정되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "템플릿 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 템플릿 삭제
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/order-templates/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete template');
      }
      
      return { id }; // Return the deleted ID for optimistic updates
    },
    onSuccess: (data) => {
      // Remove the deleted template from cache immediately
      queryClient.setQueryData(['/api/order-templates'], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.filter((template: any) => template.id !== data.id);
      });
      
      // Force complete cache refresh with new timestamp
      const timestamp = Date.now();
      queryClient.removeQueries({ queryKey: ['/api/order-templates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/order-templates'] });
      queryClient.refetchQueries({ 
        queryKey: ['/api/order-templates'], 
        type: 'active',
        exact: true
      });
      
      toast({
        title: "성공",
        description: "템플릿이 삭제되었습니다.",
      });
    },
    onError: (error) => {
      console.error('Delete template error:', error);
      toast({
        title: "오류",
        description: "템플릿 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 템플릿 활성화/비활성화 토글
  const toggleTemplateMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => 
      fetch(`/api/order-templates/${id}/toggle-status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      }).then(res => res.json()),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/order-templates'] });
      toast({
        title: "성공",
        description: `템플릿이 ${variables.isActive ? '활성화' : '비활성화'}되었습니다.`,
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "템플릿 상태 변경 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 필터링된 템플릿
  const filteredTemplates = templates.filter((template: Template) =>
    template.templateName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 템플릿 타입별 아이콘 (카테고리 기반)
  const getTemplateIcon = (templateType: string) => {
    const category = getTemplateCategory(templateType);
    return category === 'sheet' 
      ? <FileSpreadsheet className="w-4 h-4" />
      : <Grid3X3 className="w-4 h-4" />;
  };

  // 템플릿 타입별 배지 색상 (카테고리 기반)
  const getTemplateTypeColor = (templateType: string) => {
    const category = getTemplateCategory(templateType);
    return category === 'sheet'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-purple-100 text-purple-800';
  };

  // 템플릿 타입 분류 함수
  const getTemplateCategory = (templateType: string) => {
    // 시트폼: handsontable, excel_like
    const sheetTypes = ['handsontable', 'excel_like'];
    // 일반폼: 나머지 모든 타입
    return sheetTypes.includes(templateType) ? 'sheet' : 'general';
  };

  // 템플릿 타입별 라벨
  const getTemplateTypeLabel = (templateType: string) => {
    const category = getTemplateCategory(templateType);
    return category === 'sheet' ? templateTypeLabel : '일반폼';
  };

  // 템플릿 저장 핸들러
  const handleSaveTemplate = (templateData: any) => {
    if (isEditing && selectedTemplate) {
      updateTemplateMutation.mutate({ id: selectedTemplate.id, templateData });
    } else {
      createTemplateMutation.mutate(templateData);
    }
  };

  // 템플릿 편집 시작
  const handleEditTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setIsEditing(true);
    setShowBuilder(true);
  };

  // 템플릿 복사
  const handleCopyTemplate = (template: Template) => {
    const copiedTemplate = {
      ...template,
      templateName: `${template.templateName} (복사본)`,
    };
    const { id, ...templateWithoutId } = copiedTemplate;
    createTemplateMutation.mutate(templateWithoutId);
  };

  // 새 템플릿 생성 시작
  const handleNewTemplate = () => {
    setSelectedTemplate(null);
    setIsEditing(false);
    setShowBuilder(true);
  };

  if (showBuilder) {
    return (
      <TemplateBuilderFixed
        templateId={selectedTemplate?.id}
        onSave={handleSaveTemplate}
        onCancel={() => {
          setShowBuilder(false);
          setIsEditing(false);
          setSelectedTemplate(null);
        }}
      />
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">템플릿 관리</h1>
              <p className="text-sm text-gray-600 mt-1">
                발주서 템플릿을 생성하고 관리합니다
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm">
              총 {filteredTemplates.length}개
            </Badge>
            <Button onClick={handleNewTemplate} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              새 템플릿
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-md">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="템플릿 이름으로 검색..."
              className="h-10"
            />
          </div>
          
          <div className="flex items-center gap-6">
            {/* Statistics */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <span>시트 {templates.filter((t: Template) => getTemplateCategory(t.templateType) === 'sheet').length}</span>
              </div>
              <div className="flex items-center gap-1">
                <Grid3X3 className="w-4 h-4 text-green-600" />
                <span>폼 {templates.filter((t: Template) => getTemplateCategory(t.templateType) === 'general').length}</span>
              </div>
              <div className="flex items-center gap-1">
                <Power className="w-4 h-4 text-emerald-600" />
                <span>활성 {templates.filter((t: Template) => t.isActive).length}</span>
              </div>
            </div>

            {/* View Toggle - Standardized */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 w-8 p-0"
                title="목록 보기"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'card' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('card')}
                className="h-8 w-8 p-0"
                title="카드 보기"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      {/* 템플릿 목록 */}
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
                  <div className="h-2 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-2 bg-gray-200 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))
          ) : filteredTemplates.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-gray-600">
                {searchTerm ? '검색 결과가 없습니다' : '등록된 템플릿이 없습니다'}
              </div>
              {!searchTerm && (
                <Button
                  onClick={handleNewTemplate}
                  variant="outline"
                  className="mt-4"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  첫 템플릿 만들기
                </Button>
              )}
            </div>
          ) : (
            filteredTemplates.map((template: Template) => (
              <Card key={template.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  {/* Header Section - Standardized */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600 truncate" 
                          onClick={() => handleEditTemplate(template)}>
                        {template.templateName}
                      </h3>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ml-2 flex-shrink-0 ${getTemplateTypeColor(template.templateType)}`}
                    >
                      {getTemplateTypeLabel(template.templateType)}
                    </Badge>
                  </div>

                  {/* Content Section - Standardized */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center text-sm text-gray-600 gap-2">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">생성:</span>
                      <span>{new Date(template.createdAt).toLocaleDateString('ko-KR')}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 gap-2">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">수정:</span>
                      <span>{new Date(template.updatedAt).toLocaleDateString('ko-KR')}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 gap-2">
                      <Hash className="h-4 w-4" />
                      <span className="font-medium">구성:</span>
                      {template.templateType === 'handsontable' && template.fieldsConfig?.handsontable ? (
                        <span className="text-blue-600">
                          컬럼 {template.fieldsConfig.handsontable.columns?.length || 0}개
                        </span>
                      ) : template.fieldsConfig?.fields ? (
                        <span className="text-green-600">
                          필드 {template.fieldsConfig.fields.length || 0}개
                        </span>
                      ) : (
                        <span className="text-gray-500">
                          기본 템플릿
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons - Standardized */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center -space-x-1">
                      <Button
                        onClick={() => handleEditTemplate(template)}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="수정"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={() => handleCopyTemplate(template)}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="복사"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={deleteTemplateMutation.isPending}
                            title="삭제"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>템플릿 삭제</AlertDialogTitle>
                            <AlertDialogDescription>
                              '{template.templateName}' 템플릿을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteTemplateMutation.mutate(template.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              삭제
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        {template.isActive ? '활성' : '비활성'}
                      </span>
                      <Switch
                        checked={template.isActive}
                        onCheckedChange={(checked) => 
                          toggleTemplateMutation.mutate({ id: template.id, isActive: checked })
                        }
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">타입</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">템플릿명</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">생성일</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">수정일</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">구성</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">상태</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">액션</th>
                </tr>
              </thead>
                <tbody className="divide-y divide-gray-200">
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, index) => (
                      <tr key={index} className="animate-pulse">
                        <td className="py-2 px-4">
                          <div className="h-4 bg-gray-200 rounded w-16"></div>
                        </td>
                        <td className="py-2 px-4">
                          <div className="h-4 bg-gray-200 rounded w-32"></div>
                        </td>
                        <td className="py-2 px-4">
                          <div className="h-4 bg-gray-200 rounded w-20"></div>
                        </td>
                        <td className="py-2 px-4">
                          <div className="h-4 bg-gray-200 rounded w-20"></div>
                        </td>
                        <td className="py-2 px-4">
                          <div className="h-4 bg-gray-200 rounded w-16"></div>
                        </td>
                        <td className="py-2 px-4">
                          <div className="h-4 bg-gray-200 rounded w-12"></div>
                        </td>
                        <td className="py-2 px-4">
                          <div className="h-4 bg-gray-200 rounded w-20"></div>
                        </td>
                      </tr>
                    ))
                  ) : filteredTemplates.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12">
                        <div className="text-gray-600">
                          {searchTerm ? '검색 결과가 없습니다' : '등록된 템플릿이 없습니다'}
                        </div>
                        {!searchTerm && (
                          <Button
                            onClick={handleNewTemplate}
                            variant="outline"
                            className="mt-4"
                            size="sm"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            첫 템플릿 만들기
                          </Button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredTemplates.map((template: Template) => (
                      <tr key={template.id} className="hover:bg-gray-50">
                        <td className="py-2 px-4">
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getTemplateTypeColor(template.templateType)}`}
                          >
                            {getTemplateTypeLabel(template.templateType)}
                          </Badge>
                        </td>
                        <td className="py-2 px-4">
                          <button 
                            onClick={() => handleEditTemplate(template)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 text-left"
                          >
                            {template.templateName}
                          </button>
                        </td>
                        <td className="py-2 px-4 text-sm text-gray-600">
                          {new Date(template.createdAt).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="py-2 px-4 text-sm text-gray-600">
                          {new Date(template.updatedAt).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="py-2 px-4 text-sm">
                          {template.templateType === 'handsontable' && template.fieldsConfig?.handsontable ? (
                            <span className="text-blue-600">
                              컬럼 {template.fieldsConfig.handsontable.columns?.length || 0}개
                            </span>
                          ) : template.fieldsConfig?.fields ? (
                            <span className="text-green-600">
                              필드 {template.fieldsConfig.fields.length || 0}개
                            </span>
                          ) : (
                            <span className="text-gray-500">기본</span>
                          )}
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">
                              {template.isActive ? '활성' : '비활성'}
                            </span>
                            <Switch
                              checked={template.isActive}
                              onCheckedChange={(checked) => 
                                toggleTemplateMutation.mutate({ id: template.id, isActive: checked })
                              }
                            />
                          </div>
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex items-center -space-x-1">
                            <Button
                              onClick={() => handleEditTemplate(template)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                              title="수정"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => handleCopyTemplate(template)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                              title="복사"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                                  disabled={deleteTemplateMutation.isPending}
                                  title="삭제"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>템플릿 삭제</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    '{template.templateName}' 템플릿을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>취소</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteTemplateMutation.mutate(template.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    삭제
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
        </div>
      )}
    </div>
  );
}