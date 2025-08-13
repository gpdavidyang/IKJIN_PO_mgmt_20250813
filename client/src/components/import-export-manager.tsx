import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Download, Upload, FileDown, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

type EntityType = 'vendors' | 'projects' | 'purchase_orders';
type FormatType = 'excel' | 'csv';

interface ImportResult {
  imported: number;
  errors: any[];
  totalRows: number;
}

export function ImportExportManager() {
  const { user } = useAuth();
  const [selectedEntity, setSelectedEntity] = useState<EntityType>('vendors');
  const [selectedFormat, setSelectedFormat] = useState<FormatType>('excel');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const entityLabels = {
    vendors: '거래처',
    projects: '현장',
    purchase_orders: '발주서'
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/export/${selectedEntity}?format=${selectedFormat}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedEntity}_${new Date().toISOString().split('T')[0]}.${selectedFormat === 'csv' ? 'csv' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('내보내기 중 오류가 발생했습니다.');
      console.error('Export error:', err);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      setError('파일을 선택해 주세요.');
      return;
    }

    setImporting(true);
    setError(null);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const response = await fetch(`/api/import/${selectedEntity}`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const result = await response.json();
      setImportResult(result);
      setImportFile(null);
    } catch (err) {
      setError('가져오기 중 오류가 발생했습니다.');
      console.error('Import error:', err);
    } finally {
      setImporting(false);
    }
  };


  return (
    <Card className="w-full max-w-4xl mx-auto shadow-sm">
      <CardHeader>
        <CardTitle>데이터 가져오기/내보내기</CardTitle>
        <CardDescription>
          엑셀 또는 CSV 파일을 사용하여 데이터를 일괄로 가져오거나 내보낼 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="export" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">내보내기</TabsTrigger>
            <TabsTrigger value="import">가져오기</TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>데이터 유형</Label>
                <Select value={selectedEntity} onValueChange={(value) => setSelectedEntity(value as EntityType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendors">거래처</SelectItem>
                    <SelectItem value="projects">현장</SelectItem>
                    <SelectItem value="purchase_orders">발주서</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>파일 형식</Label>
                <Select value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as FormatType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                    <SelectItem value="csv">CSV (.csv)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleExport} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              {entityLabels[selectedEntity]} 데이터 내보내기
            </Button>
          </TabsContent>

          <TabsContent value="import" className="space-y-6">
            {/* 단계 1: 데이터 유형 선택 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 text-white text-sm font-medium rounded-full flex items-center justify-center">1</div>
                <Label className="text-base font-medium">데이터 유형 선택</Label>
              </div>
              <Select value={selectedEntity} onValueChange={(value) => setSelectedEntity(value as EntityType)}>
                <SelectTrigger className="max-w-sm">
                  <SelectValue placeholder="가져올 데이터 유형을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendors">거래처</SelectItem>
                  <SelectItem value="projects">현장</SelectItem>
                  <SelectItem value="purchase_orders">발주서</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 단계 2: 템플릿 안내 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 text-white text-sm font-medium rounded-full flex items-center justify-center">2</div>
                <Label className="text-base font-medium">템플릿 확인 및 데이터 준비</Label>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm text-amber-800 font-medium">
                      {entityLabels[selectedEntity]} 데이터를 가져오기 전에 올바른 형식을 확인하세요
                    </p>
                    <div className="flex gap-2">
                      <a 
                        href={`/templates/${selectedEntity}_template.xlsx`} 
                        download 
                        className="inline-flex items-center gap-1 text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 px-2 py-1 rounded transition-colors"
                      >
                        <FileDown className="h-3 w-3" />
                        Excel 템플릿
                      </a>
                      <a 
                        href={`/templates/${selectedEntity}_template.csv`} 
                        download 
                        className="inline-flex items-center gap-1 text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 px-2 py-1 rounded transition-colors"
                      >
                        <FileDown className="h-3 w-3" />
                        CSV 템플릿
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 단계 3: 파일 업로드 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 text-white text-sm font-medium rounded-full flex items-center justify-center">3</div>
                <Label className="text-base font-medium">파일 업로드</Label>
              </div>
              <div className="max-w-md">
                <Input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="cursor-pointer"
                />
                {importFile && (
                  <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    선택된 파일: {importFile.name}
                  </p>
                )}
              </div>
            </div>

            {/* 단계 4: 데이터 가져오기 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 text-white text-sm font-medium rounded-full flex items-center justify-center">4</div>
                <Label className="text-base font-medium">데이터 가져오기</Label>
              </div>
              <Button 
                onClick={handleImport} 
                disabled={!importFile || importing}
                className="bg-green-600 hover:bg-green-700 text-white px-8"
              >
                <Upload className="mr-2 h-4 w-4" />
                {importing ? '가져오는 중...' : `${entityLabels[selectedEntity]} 데이터 가져오기`}
              </Button>
            </div>

            {importResult && (
              <Alert className={importResult.errors.length > 0 ? 'border-yellow-500' : 'border-green-500'}>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p>
                      전체 {importResult.totalRows}개 중 {importResult.imported}개 가져오기 완료
                    </p>
                    {importResult.errors.length > 0 && (
                      <details>
                        <summary className="cursor-pointer text-sm text-muted-foreground">
                          {importResult.errors.length}개 오류 (클릭하여 자세히 보기)
                        </summary>
                        <div className="mt-2 space-y-1 text-sm">
                          {importResult.errors.map((error, index) => (
                            <div key={index} className="text-red-600">
                              행 {error.row}: {error.error}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}