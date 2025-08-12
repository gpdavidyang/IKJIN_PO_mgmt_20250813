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

type EntityType = 'vendors' | 'items' | 'projects';
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
    items: '품목',
    projects: '프로젝트'
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

  const downloadTemplate = async () => {
    try {
      const response = await fetch(`/api/template/${selectedEntity}?format=${selectedFormat}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Template download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedEntity}_template.${selectedFormat === 'csv' ? 'csv' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('템플릿 다운로드 중 오류가 발생했습니다.');
      console.error('Template download error:', err);
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
                    <SelectItem value="items">품목</SelectItem>
                    <SelectItem value="projects">프로젝트</SelectItem>
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

          <TabsContent value="import" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>데이터 유형</Label>
                <Select value={selectedEntity} onValueChange={(value) => setSelectedEntity(value as EntityType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendors">거래처</SelectItem>
                    <SelectItem value="items">품목</SelectItem>
                    <SelectItem value="projects">프로젝트</SelectItem>
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

            <div className="space-y-2">
              <Label htmlFor="import-file">파일 선택</Label>
              <Input
                id="import-file"
                type="file"
                accept={selectedFormat === 'excel' ? '.xlsx,.xls' : '.csv'}
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={downloadTemplate}
                className="flex-1"
              >
                <FileDown className="mr-2 h-4 w-4" />
                템플릿 다운로드
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={!importFile || importing}
                className="flex-1"
              >
                <Upload className="mr-2 h-4 w-4" />
                {importing ? '가져오는 중...' : '데이터 가져오기'}
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