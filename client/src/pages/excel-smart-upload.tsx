import React, { useState, useEffect, useCallback } from 'react';
import { SmartDropZone } from '@/components/smart-upload/SmartDropZone';
import { ValidationStatusPanel } from '@/components/smart-upload/ValidationStatusPanel';
import { SmartTable } from '@/components/smart-upload/SmartTable';
import { AICorrectionPanel } from '@/components/smart-upload/AICorrectionPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/use-websocket';
import { api } from '@/services/api.ts';
import { 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Sparkles, 
  Save, 
  Send,
  RefreshCw,
  Download,
  FileSpreadsheet,
  Loader2
} from 'lucide-react';

interface ValidationResult {
  rowIndex: number;
  status: 'valid' | 'warning' | 'error';
  errors?: string[];
  warnings?: string[];
  data: Record<string, any>;
  suggestions?: Record<string, any>;
}

interface SessionData {
  sessionId: string;
  fileName: string;
  totalItems: number;
  validItems: number;
  warningItems: number;
  errorItems: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results: ValidationResult[];
}

export function ExcelSmartUploadPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'validation' | 'corrections'>('upload');
  const [filter, setFilter] = useState<'all' | 'valid' | 'warning' | 'error'>('all');
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // WebSocket connection for real-time updates
  const { isConnected, lastMessage } = useWebSocket({
    onMessage: (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    },
  });

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'validation:started':
        toast({
          title: '검증 시작',
          description: `파일 "${message.fileName}" 처리를 시작했습니다.`,
        });
        break;

      case 'validation:progress':
        if (sessionData?.sessionId === message.sessionId) {
          setSessionData(prev => prev ? {
            ...prev,
            totalItems: message.totalItems,
            validItems: message.validItems,
            warningItems: message.warningItems,
            errorItems: message.errorItems,
            status: 'processing',
          } : null);
        }
        break;

      case 'validation:completed':
        if (sessionData?.sessionId === message.sessionId) {
          setSessionData(prev => prev ? {
            ...prev,
            ...message,
            status: 'completed',
          } : null);
          setActiveTab('validation');
          toast({
            title: '검증 완료',
            description: '파일 검증이 완료되었습니다.',
            variant: 'success',
          });
        }
        setIsProcessing(false);
        break;

      case 'validation:error':
        toast({
          title: '검증 오류',
          description: message.error,
          variant: 'destructive',
        });
        setIsProcessing(false);
        break;

      case 'ai:suggestions':
        if (sessionData?.sessionId === message.sessionId) {
          setAiSuggestions(message.suggestions);
          setActiveTab('corrections');
        }
        break;
    }
  };

  // File upload handler
  const handleFileUpload = async (file: File) => {
    try {
      setIsProcessing(true);
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/api/excel/upload/smart', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setSessionData({
          sessionId: response.data.sessionId,
          fileName: file.name,
          totalItems: 0,
          validItems: 0,
          warningItems: 0,
          errorItems: 0,
          status: 'processing',
          results: [],
        });

        // Fetch initial results
        fetchValidationResults(response.data.sessionId);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: '업로드 실패',
        description: error instanceof Error ? error.message : '파일 업로드에 실패했습니다.',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  // Fetch validation results
  const fetchValidationResults = async (sessionId: string) => {
    try {
      const response = await api.get(`/api/excel/validation/${sessionId}`);
      
      setSessionData(prev => prev ? {
        ...prev,
        ...response.data,
        results: response.data.results || [],
      } : null);
    } catch (error) {
      console.error('Fetch results error:', error);
    }
  };

  // Handle data corrections
  const handleDataCorrection = async (rowIndex: number, field: string, value: any) => {
    if (!sessionData) return;

    try {
      const response = await api.patch(`/api/excel/correction/${sessionData.sessionId}`, {
        corrections: [{
          rowIndex,
          field,
          value,
        }],
      });

      if (response.data.success) {
        // Update local state
        setSessionData(prev => {
          if (!prev) return null;
          const newResults = [...prev.results];
          const resultIndex = newResults.findIndex(r => r.rowIndex === rowIndex);
          if (resultIndex !== -1) {
            newResults[resultIndex].data[field] = value;
            // Revalidate status
            if (newResults[resultIndex].errors?.length === 0) {
              newResults[resultIndex].status = 'valid';
            }
          }
          return { ...prev, results: newResults };
        });

        toast({
          title: '수정 완료',
          description: '데이터가 수정되었습니다.',
          variant: 'success',
        });
      }
    } catch (error) {
      console.error('Correction error:', error);
      toast({
        title: '수정 실패',
        description: '데이터 수정에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  // Generate AI suggestions
  const generateAISuggestions = async () => {
    if (!sessionData) return;

    try {
      const response = await api.post('/api/excel/ai/suggest', {
        sessionId: sessionData.sessionId,
        includeCategories: true,
        includeVendors: true,
        includeEmails: true,
        confidenceThreshold: 80,
      });

      if (response.data.success) {
        setAiSuggestions(response.data.suggestions);
        setActiveTab('corrections');
        toast({
          title: 'AI 제안 생성 완료',
          description: `${response.data.suggestions.length}개의 제안을 생성했습니다.`,
        });
      }
    } catch (error) {
      console.error('AI suggestion error:', error);
      toast({
        title: 'AI 제안 실패',
        description: 'AI 제안 생성에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  // Apply AI suggestions
  const applyAISuggestions = async (suggestions: any[]) => {
    if (!sessionData) return;

    try {
      const corrections = suggestions.map(s => ({
        rowIndex: s.rowIndex,
        field: s.field,
        value: s.suggestedValue,
      }));

      const response = await api.patch(`/api/excel/correction/${sessionData.sessionId}`, {
        corrections,
      });

      if (response.data.success) {
        // Refresh results
        await fetchValidationResults(sessionData.sessionId);
        toast({
          title: 'AI 제안 적용 완료',
          description: `${corrections.length}개의 제안이 적용되었습니다.`,
          variant: 'success',
        });
      }
    } catch (error) {
      console.error('Apply suggestions error:', error);
      toast({
        title: '제안 적용 실패',
        description: 'AI 제안 적용에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  // Finalize and save
  const finalizeSession = async () => {
    if (!sessionData) return;

    try {
      setIsSaving(true);
      const response = await api.post(`/api/excel/finalize/${sessionData.sessionId}`);

      if (response.data.success) {
        toast({
          title: '저장 완료',
          description: `${response.data.ordersCreated}개의 발주서가 생성되었습니다.`,
          variant: 'success',
        });
        
        // Reset state
        setSessionData(null);
        setAiSuggestions([]);
        setActiveTab('upload');
      }
    } catch (error) {
      console.error('Finalize error:', error);
      toast({
        title: '저장 실패',
        description: '발주서 생성에 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel session
  const cancelSession = async () => {
    if (!sessionData) return;

    try {
      await api.delete(`/api/excel/session/${sessionData.sessionId}`);
      setSessionData(null);
      setAiSuggestions([]);
      setActiveTab('upload');
      toast({
        title: '세션 취소',
        description: '업로드 세션이 취소되었습니다.',
      });
    } catch (error) {
      console.error('Cancel session error:', error);
    }
  };

  // Filter results based on status
  const filteredResults = sessionData?.results.filter(result => {
    if (filter === 'all') return true;
    return result.status === filter;
  }) || [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">스마트 엑셀 업로드</h1>
          <p className="text-gray-600 mt-1">
            엑셀 파일을 업로드하여 발주 데이터를 자동으로 검증하고 처리합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Badge variant="outline" className="gap-1">
              <CheckCircle className="h-3 w-3 text-green-600" />
              실시간 연결
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <AlertCircle className="h-3 w-3 text-yellow-600" />
              연결 대기 중
            </Badge>
          )}
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            파일 업로드
          </TabsTrigger>
          <TabsTrigger 
            value="validation" 
            disabled={!sessionData}
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            데이터 검증
            {sessionData && sessionData.errorItems > 0 && (
              <Badge variant="destructive" className="ml-2">
                {sessionData.errorItems}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="corrections"
            disabled={!sessionData || sessionData.errorItems === 0}
            className="flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            AI 수정 제안
            {aiSuggestions.length > 0 && (
              <Badge variant="default" className="ml-2">
                {aiSuggestions.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          {!sessionData ? (
            <SmartDropZone
              onFileUpload={handleFileUpload}
              disabled={isProcessing}
              showPreview={true}
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold">파일 업로드 완료</h3>
                    <p className="text-gray-600 mt-1">{sessionData.fileName}</p>
                  </div>
                  <Button onClick={cancelSession} variant="outline">
                    새 파일 업로드
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Validation Tab */}
        <TabsContent value="validation" className="space-y-6">
          {sessionData && (
            <>
              <ValidationStatusPanel
                sessionId={sessionData.sessionId}
                totalItems={sessionData.totalItems}
                validItems={sessionData.validItems}
                warningItems={sessionData.warningItems}
                errorItems={sessionData.errorItems}
                onFilterChange={setFilter}
                isProcessing={sessionData.status === 'processing'}
              />

              {sessionData.results.length > 0 && (
                <SmartTable
                  data={filteredResults}
                  onCellEdit={handleDataCorrection}
                  selectedRows={selectedRows}
                  onRowSelectionChange={setSelectedRows}
                  isLoading={sessionData.status === 'processing'}
                />
              )}

              {sessionData.status === 'completed' && (
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    {sessionData.errorItems > 0 && (
                      <Button
                        onClick={generateAISuggestions}
                        variant="default"
                        className="gap-2"
                      >
                        <Sparkles className="h-4 w-4" />
                        AI 수정 제안 생성
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={cancelSession}
                      variant="outline"
                    >
                      취소
                    </Button>
                    <Button
                      onClick={finalizeSession}
                      variant="default"
                      disabled={sessionData.errorItems > 0 || isSaving}
                      className="gap-2"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          저장 중...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          발주서 생성
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Corrections Tab */}
        <TabsContent value="corrections" className="space-y-6">
          {aiSuggestions.length > 0 && (
            <AICorrectionPanel
              suggestions={aiSuggestions}
              onApply={applyAISuggestions}
              onReject={(index) => {
                setAiSuggestions(prev => prev.filter((_, i) => i !== index));
              }}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}