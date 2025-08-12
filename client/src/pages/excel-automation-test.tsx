import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface ParseResult {
  success: boolean;
  data?: {
    rows: any[];
    validation: {
      isValid: boolean;
      errors: string[];
      warnings: string[];
      totalRows: number;
    };
    meta: {
      uploadedBy: string;
      uploadedAt: string;
      filename: string;
    };
    vendorValidation?: {
      vendorValidations: Array<{
        vendorName: string;
        exists: boolean;
        exactMatch?: {
          id: number;
          name: string;
          email: string;
          phone?: string | null;
          contactPerson: string;
        };
        suggestions: Array<{
          id: number;
          name: string;
          email: string;
          phone?: string | null;
          contactPerson: string;
          similarity: number;
          distance: number;
        }>;
      }>;
      deliveryValidations: Array<{
        vendorName: string;
        exists: boolean;
        exactMatch?: {
          id: number;
          name: string;
          email: string;
          phone?: string | null;
          contactPerson: string;
        };
        suggestions: Array<{
          id: number;
          name: string;
          email: string;
          phone?: string | null;
          contactPerson: string;
          similarity: number;
          distance: number;
        }>;
      }>;
      emailConflicts: Array<{
        type: 'conflict' | 'no_conflict';
        excelEmail: string;
        dbEmail?: string;
        vendorId?: number;
        vendorName?: string;
      }>;
    };
  };
  error?: string;
}

export default function ExcelAutomationTest() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('파일을 선택해주세요.');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('excel', file);

      const response = await fetch('/api/excel-automation/parse-input-sheet', {
        method: 'POST',
        body: formData,
      });

      const data: ParseResult = await response.json();
      setResult(data);

    } catch (error) {
      console.error('업로드 오류:', error);
      setResult({
        success: false,
        error: '파일 업로드 중 오류가 발생했습니다.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDebug = async () => {
    if (!file) {
      alert('파일을 선택해주세요.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('excel', file);

      const response = await fetch('/api/excel-automation/debug-excel', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      console.log('디버그 결과:', data);
      alert('디버그 정보가 콘솔에 출력되었습니다. 서버 로그를 확인해보세요.');

    } catch (error) {
      console.error('디버그 오류:', error);
      alert('디버그 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimpleParse = async () => {
    if (!file) {
      alert('파일을 선택해주세요.');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('excel', file);

      const response = await fetch('/api/excel-automation/simple-parse', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      console.log('간단 파싱 결과:', data);
      
      // 간단 파싱 결과를 결과창에 표시
      setResult({
        success: data.success,
        data: data.success ? {
          rows: data.data.sampleData || [],
          validation: {
            isValid: true,
            errors: [],
            warnings: [],
            totalRows: data.data.totalRows || 0
          },
          meta: {
            uploadedBy: 'test',
            uploadedAt: new Date().toISOString(),
            filename: file.name
          }
        } : undefined,
        error: data.error
      });

    } catch (error) {
      console.error('간단 파싱 오류:', error);
      setResult({
        success: false,
        error: '간단 파싱 중 오류가 발생했습니다.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleParseAndValidate = async () => {
    if (!file) {
      alert('파일을 선택해주세요.');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('excel', file);

      const response = await fetch('/api/excel-automation/parse-and-validate', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      console.log('파싱+검증 결과:', data);
      
      // 결과를 UI에 표시
      if (data.success) {
        setResult({
          success: true,
          data: {
            rows: data.data.parsing.data || [],
            validation: {
              isValid: true,
              errors: [],
              warnings: [],
              totalRows: data.data.parsing.totalRows || 0
            },
            meta: {
              uploadedBy: 'test',
              uploadedAt: data.data.meta.uploadedAt,
              filename: data.data.meta.filename
            },
            // 거래처 검증 결과 추가
            vendorValidation: data.data.validation
          },
          error: undefined
        });
      } else {
        setResult({
          success: false,
          error: data.error || '파싱 및 검증 중 오류가 발생했습니다.'
        });
      }

    } catch (error) {
      console.error('파싱+검증 오류:', error);
      setResult({
        success: false,
        error: '파싱 및 검증 중 오류가 발생했습니다.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-[1366px]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">엑셀 템플릿 자동화 테스트</h1>
        <p className="text-muted-foreground">
          Input 시트의 A:P 열을 파싱하여 JSON으로 변환하는 기능을 테스트합니다.
        </p>
      </div>

      {/* 파일 업로드 섹션 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>1단계: 엑셀 파일 업로드</CardTitle>
          <CardDescription>
            'Input' 시트가 포함된 Excel 파일을 업로드하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="flex-1"
            />
            <Button 
              onClick={handleUpload} 
              disabled={!file || loading}
              className="min-w-24"
            >
              {loading ? '파싱중...' : '파싱하기'}
            </Button>
            <Button 
              onClick={handleSimpleParse} 
              disabled={!file || loading}
              variant="secondary"
              className="min-w-24"
            >
              📊 간단파싱
            </Button>
            <Button 
              onClick={handleParseAndValidate} 
              disabled={!file || loading}
              variant="default"
              className="min-w-32 bg-blue-600 hover:bg-blue-700"
            >
              🔍 파싱+검증
            </Button>
            <Button 
              onClick={handleDebug} 
              disabled={!file || loading}
              variant="outline"
              className="min-w-24"
            >
              🐛 디버그
            </Button>
          </div>
          
          <div className="text-center">
            <Button 
              variant="outline" 
              onClick={() => window.open('/api/excel-automation/sample-excel', '_blank')}
              className="w-auto"
            >
              📥 샘플 Excel 파일 다운로드
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              테스트용 샘플 파일을 다운로드하여 기능을 확인해보세요.
            </p>
          </div>
          
          {file && (
            <div className="text-sm text-muted-foreground">
              선택된 파일: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}
        </CardContent>
      </Card>

      {/* 결과 표시 섹션 */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              파싱 결과
              <Badge variant={result.success ? 'default' : 'destructive'}>
                {result.success ? '성공' : '실패'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.success && result.data ? (
              <>
                {/* 메타 정보 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <div className="text-sm font-medium">총 행 수</div>
                    <div className="text-lg">{result.data.validation.totalRows}개</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">오류</div>
                    <div className="text-lg text-red-600">{result.data.validation.errors.length}개</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">경고</div>
                    <div className="text-lg text-yellow-600">{result.data.validation.warnings.length}개</div>
                  </div>
                </div>

                {/* 검증 결과 */}
                {result.data.validation.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      <div className="font-medium mb-2">오류 목록:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {result.data.validation.errors.map((error, index) => (
                          <li key={index} className="text-sm">{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {result.data.validation.warnings.length > 0 && (
                  <Alert variant="default">
                    <AlertDescription>
                      <div className="font-medium mb-2">경고 목록:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {result.data.validation.warnings.map((warning, index) => (
                          <li key={index} className="text-sm">{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* 거래처 검증 결과 */}
                {result.data.vendorValidation && (
                  <div className="space-y-4">
                    <div className="font-medium text-lg">🔍 거래처 검증 결과 (Phase 2)</div>
                    
                    {/* 거래처 검증 통계 */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium">거래처 검증</div>
                        <div className="text-lg text-blue-600">
                          {result.data.vendorValidation.vendorValidations.filter(v => v.exists).length} / {result.data.vendorValidation.vendorValidations.length}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">납품처 검증</div>
                        <div className="text-lg text-blue-600">
                          {result.data.vendorValidation.deliveryValidations.filter(v => v.exists).length} / {result.data.vendorValidation.deliveryValidations.length}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">이메일 충돌</div>
                        <div className="text-lg text-red-600">
                          {result.data.vendorValidation.emailConflicts.filter(e => e.type === 'conflict').length}개
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">추천 업체</div>
                        <div className="text-lg text-green-600">
                          {result.data.vendorValidation.vendorValidations.reduce((sum, v) => sum + v.suggestions.length, 0)}개
                        </div>
                      </div>
                    </div>

                    {/* 거래처명 검증 상세 */}
                    {result.data.vendorValidation.vendorValidations.length > 0 && (
                      <div>
                        <div className="font-medium mb-2">거래처명 검증 상세:</div>
                        
                        {/* Check if running in fallback mode */}
                        {result.data.vendorValidation.vendorValidations.some(v => !v.exists && v.suggestions.length > 0 && v.suggestions[0].phone === '02-0000-0000') && (
                          <Alert variant="default" className="mb-4">
                            <AlertDescription>
                              ⚠️ <strong>폴백 모드</strong>: 데이터베이스 연결 문제로 인해 샘플 추천 데이터를 표시합니다.
                            </AlertDescription>
                          </Alert>
                        )}
                        
                        <div className="space-y-2">
                          {result.data.vendorValidation.vendorValidations.map((vendor, index) => (
                            <div key={index} className="border rounded p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium">{vendor.vendorName}</span>
                                <Badge variant={vendor.exists ? 'default' : 'secondary'}>
                                  {vendor.exists ? '✅ 존재' : '❌ 없음'}
                                </Badge>
                                {/* Show fallback indicator */}
                                {!vendor.exists && vendor.suggestions.length > 0 && vendor.suggestions[0].phone === '02-0000-0000' && (
                                  <Badge variant="outline" className="text-xs">
                                    🔄 폴백
                                  </Badge>
                                )}
                              </div>
                              {vendor.exactMatch && (
                                <div className="text-sm text-green-700 mb-2">
                                  📍 매칭: {vendor.exactMatch.name} (담당자: {vendor.exactMatch.contactPerson})
                                </div>
                              )}
                              {vendor.suggestions.length > 0 && (
                                <div className="text-sm">
                                  <div className="font-medium mb-1">💡 유사 업체 추천:</div>
                                  {vendor.suggestions.slice(0, 3).map((suggestion, idx) => (
                                    <div key={idx} className="text-xs text-gray-600 ml-2">
                                      • {suggestion.name} (유사도: {(suggestion.similarity * 100).toFixed(1)}%)
                                      {suggestion.phone === '02-0000-0000' && (
                                        <span className="text-orange-500 ml-1">[샘플]</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 이메일 충돌 상세 */}
                    {result.data.vendorValidation.emailConflicts.filter(e => e.type === 'conflict').length > 0 && (
                      <Alert variant="destructive">
                        <AlertDescription>
                          <div className="font-medium mb-2">📧 이메일 충돌 발견:</div>
                          {result.data.vendorValidation.emailConflicts
                            .filter(e => e.type === 'conflict')
                            .map((conflict, index) => (
                              <div key={index} className="text-sm mb-2">
                                <div className="font-medium">{conflict.vendorName}:</div>
                                <div>Excel: {conflict.excelEmail}</div>
                                <div>DB: {conflict.dbEmail}</div>
                              </div>
                            ))}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {/* 파싱된 데이터 */}
                <div>
                  <div className="font-medium mb-2">파싱된 데이터 (JSON):</div>
                  <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                    <pre className="text-sm whitespace-pre-wrap">
                      {JSON.stringify(result.data.rows, null, 2)}
                    </pre>
                  </div>
                </div>
              </>
            ) : (
              <Alert variant="destructive">
                <AlertDescription>
                  {result.error || '알 수 없는 오류가 발생했습니다.'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}