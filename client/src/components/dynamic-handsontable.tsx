import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calculator, Save, Download, Upload, Image, Sigma, Plus } from 'lucide-react';

// 컴팩트한 한국어 UI를 위한 스타일링
const compactStyles = {
  input: "h-6 text-xs px-1.5 py-1",
  label: "text-xs font-medium",
  button: "h-6 px-2 text-xs",
  card: "p-2 space-y-1.5",
};

interface HandsontableColumn {
  data: string;
  title: string;
  type: 'text' | 'numeric' | 'dropdown' | 'date' | 'checkbox' | 'image';
  width?: number;
  readOnly?: boolean;
  source?: string[];
  validator?: string;
  renderer?: string;
  allowHTML?: boolean;
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

interface DynamicHandsontableProps {
  config: HandsontableConfig;
  data?: any[][];
  onChange?: (data: any[][], changes: any[]) => void;
  onSave?: (data: any[][]) => void;
  readOnly?: boolean;
  projectId?: number;
  vendorId?: number;
}

export function DynamicHandsontable({ 
  config, 
  data = [], 
  onChange, 
  onSave, 
  readOnly = false,
  projectId,
  vendorId 
}: DynamicHandsontableProps) {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const hotRef = useRef<any>(null);
  const [tableData, setTableData] = useState<any[][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formulaInput, setFormulaInput] = useState('');
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);

  // Handsontable 초기화
  useEffect(() => {
    console.log('DynamicHandsontable useEffect triggered, config:', config);
    
    let retryCount = 0;
    const maxRetries = 10;

    const initializeWithRetry = () => {
      if (!containerRef.current && retryCount < maxRetries) {
        retryCount++;
        console.log(`Waiting for container, retry ${retryCount}/${maxRetries}`);
        setTimeout(initializeWithRetry, 100);
        return;
      }

      if (!containerRef.current) {
        console.error('Container not found after retries');
        setIsLoading(false);
        return;
      }

      loadHandsontable();
    };

    // 동적으로 Handsontable 로드 (CDN 사용)
    const loadHandsontable = async () => {
      setIsLoading(true);
      
      if (!(window as any).Handsontable) {
        try {
          // CSS 로드
          if (!document.querySelector('link[href*="handsontable"]')) {
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = 'https://cdn.jsdelivr.net/npm/handsontable@13.1.0/dist/handsontable.full.min.css';
            document.head.appendChild(cssLink);
          }

          // JS 로드
          if (!document.querySelector('script[src*="handsontable"]')) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/handsontable@13.1.0/dist/handsontable.full.min.js';
            document.head.appendChild(script);

            await new Promise((resolve, reject) => { 
              script.onload = resolve; 
              script.onerror = reject;
            });
          }

          // HyperFormula 로드
          if (!document.querySelector('script[src*="hyperformula"]')) {
            const formulasScript = document.createElement('script');
            formulasScript.src = 'https://cdn.jsdelivr.net/npm/hyperformula@2.6.2/dist/hyperformula.full.min.js';
            document.head.appendChild(formulasScript);

            await new Promise((resolve, reject) => { 
              formulasScript.onload = resolve; 
              formulasScript.onerror = reject;
            });
          }
          
          console.log('Handsontable scripts loaded successfully');
        } catch (error) {
          console.error('Failed to load Handsontable scripts:', error);
          setIsLoading(false);
          return;
        }
      }

      // 직접 초기화 실행
      setTimeout(initializeHandsontable, 200);
    };

    const initializeHandsontable = () => {
      console.log('initializeHandsontable called', { 
        containerExists: !!containerRef.current, 
        handsontableExists: !!(window as any).Handsontable,
        config 
      });
      
      if (!containerRef.current || !(window as any).Handsontable) {
        console.warn('Cannot initialize: missing container or Handsontable library');
        // 재시도 로직 추가
        setTimeout(() => {
          if (containerRef.current && (window as any).Handsontable) {
            initializeHandsontable();
          } else {
            // 최종 실패시 로딩 상태 해제
            console.error('Failed to initialize Handsontable after retries');
            setIsLoading(false);
          }
        }, 500);
        return;
      }

      // 이미지 렌더러 정의
      const imageRenderer = function(instance: any, td: any, row: any, col: any, prop: any, value: any, cellProperties: any) {
        if (value && typeof value === 'string' && (value.startsWith('http') || value.startsWith('data:image'))) {
          td.innerHTML = `<img src="${value}" style="max-width: 60px; max-height: 40px; object-fit: cover;" alt="이미지" />`;
        } else if (value) {
          td.innerHTML = `<span style="color: #666; font-size: 11px;">📷 ${value}</span>`;
        } else {
          td.innerHTML = '<span style="color: #ccc; font-size: 11px;">이미지 없음</span>';
        }
        return td;
      };

      // 기본 데이터 생성
      const defaultData = data.length > 0 ? data : Array.from({ length: config.rowsCount }, (_, rowIndex) => 
        Array.from({ length: config.columns.length }, (_, colIndex) => {
          const column = config.columns[colIndex];
          if (column.data === 'no') return rowIndex + 1;
          if (column.type === 'numeric') return 0;
          if (column.type === 'checkbox') return false;
          if (column.type === 'image') return '';
          return '';
        })
      );

      setTableData(defaultData);

      // HyperFormula 엔진 초기화 (고급 수식 지원)
      let formulaEngine;
      if ((window as any).HyperFormula) {
        formulaEngine = (window as any).HyperFormula.buildEmpty({
          licenseKey: 'gpl-v3',
          language: 'koKR'
        });
      }

      // Handsontable 설정
      const hotSettings = {
        data: defaultData,
        colHeaders: config.colHeaders,
        columns: config.columns.map(col => ({
          ...col,
          validator: col.validator ? new Function('value', 'callback', col.validator) : undefined,
          renderer: col.type === 'image' ? imageRenderer : 
                   col.renderer ? new Function('instance', 'td', 'row', 'col', 'prop', 'value', 'cellProperties', col.renderer) : undefined,
        })),
        rowHeaders: true,
        width: '100%',
        height: 'auto',
        maxRows: config.rowsCount + 10,
        stretchH: 'all',
        manualRowResize: true,
        manualColumnResize: true,
        contextMenu: !readOnly ? [
          'row_above', 'row_below', 'remove_row', 'separator',
          'col_left', 'col_right', 'remove_col', 'separator',
          'copy', 'cut', 'paste', 'separator',
          'undo', 'redo', 'separator',
          {
            key: 'insert_image',
            name: '이미지 삽입',
            callback: function() {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = function(e: any) {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = function(event: any) {
                    const selected = hotRef.current.getSelected()[0];
                    if (selected) {
                      hotRef.current.setDataAtCell(selected[0], selected[1], event.target.result);
                    }
                  };
                  reader.readAsDataURL(file);
                }
              };
              input.click();
            }
          }
        ] : false,
        readOnly: readOnly,
        licenseKey: 'non-commercial-and-evaluation',
        language: 'ko-KR',
        formulas: formulaEngine ? {
          engine: formulaEngine,
          sheetName: 'Sheet1'
        } : false,
        ...config.settings,
        afterSelection: (row: number, col: number) => {
          setSelectedCell({ row, col });
          const cellValue = hotRef.current.getDataAtCell(row, col);
          if (typeof cellValue === 'string' && cellValue.startsWith('=')) {
            setFormulaInput(cellValue);
          } else {
            setFormulaInput('');
          }
        },
        afterChange: (changes: any[], source: string) => {
          if (!changes || source === 'loadData') return;
          
          const newData = [...hotRef.current.getData()];
          setTableData(newData);
          
          if (onChange) {
            onChange(newData, changes);
          }
        },
      };

      // Handsontable 인스턴스 생성
      try {
        console.log('Creating Handsontable instance with settings:', hotSettings);
        hotRef.current = new (window as any).Handsontable(containerRef.current, hotSettings);
        console.log('Handsontable instance created successfully');
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to create Handsontable instance:', error);
        setIsLoading(false);
      }
    };

    // 컨테이너가 준비될 때까지 대기
    initializeWithRetry();

    return () => {
      console.log('DynamicHandsontable cleanup, destroying instance');
      if (hotRef.current) {
        hotRef.current.destroy();
        hotRef.current = null;
      }
    };
  }, [JSON.stringify(config), readOnly]);

  // 수식 적용
  const applyFormula = () => {
    if (!hotRef.current || !selectedCell || !formulaInput) return;
    
    hotRef.current.setDataAtCell(selectedCell.row, selectedCell.col, formulaInput);
    toast({
      title: "수식 적용",
      description: `셀 (${selectedCell.row + 1}, ${selectedCell.col + 1})에 수식이 적용되었습니다.`,
    });
  };

  // 이미지 업로드
  const handleImageUpload = () => {
    if (!selectedCell) {
      toast({
        title: "셀 선택 필요",
        description: "먼저 이미지를 삽입할 셀을 선택해주세요.",
        variant: "destructive"
      });
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(e: any) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(event: any) {
          if (hotRef.current && selectedCell) {
            hotRef.current.setDataAtCell(selectedCell.row, selectedCell.col, event.target.result);
            toast({
              title: "이미지 삽입 완료",
              description: "선택한 셀에 이미지가 삽입되었습니다.",
            });
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  // 데이터 저장
  const handleSave = () => {
    if (!hotRef.current) return;
    
    const currentData = hotRef.current.getData();
    setTableData(currentData);
    
    if (onSave) {
      onSave(currentData);
    }
    
    toast({
      title: "저장 완료",
      description: "데이터가 성공적으로 저장되었습니다.",
    });
  };

  // 엑셀 내보내기
  const handleExport = () => {
    if (!hotRef.current) return;

    try {
      const plugin = hotRef.current.getPlugin('exportFile');
      plugin.downloadFile('csv', {
        bom: false,
        columnDelimiter: ',',
        columnHeaders: true,
        exportHiddenColumns: true,
        exportHiddenRows: true,
        fileExtension: 'csv',
        filename: `handsontable_export_${new Date().toISOString().split('T')[0]}`,
        mimeType: 'text/csv',
        rowDelimiter: '\r\n',
        rowHeaders: true
      });
    } catch (error) {
      // CSV 수동 생성
      const csvContent = generateCSV();
      downloadCSV(csvContent, 'handsontable_export.csv');
    }
  };

  // CSV 생성
  const generateCSV = () => {
    const headers = config.colHeaders.join(',');
    const rows = tableData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    return `${headers}\n${rows}`;
  };

  // CSV 다운로드
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 총계 계산
  const calculateTotals = () => {
    if (!tableData.length) return {};

    const totals: Record<string, number> = {};
    
    config.columns.forEach((column, colIndex) => {
      if (column.type === 'numeric') {
        const sum = tableData.reduce((acc, row) => {
          const value = parseFloat(row[colIndex]) || 0;
          return acc + value;
        }, 0);
        totals[column.data] = sum;
      }
    });

    return totals;
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-2">
      {/* 테이블 헤더 */}
      <Card className={compactStyles.card}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-medium">동적 스프레드시트</h3>
            <div className="text-xs text-muted-foreground">
              {config.columns.length}개 컬럼 × {config.rowsCount}행
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {!readOnly && (
              <Button
                onClick={handleSave}
                disabled={isLoading}
                size="sm"
                className={compactStyles.button}
              >
                <Save className="w-3 h-3 mr-1" />
                저장
              </Button>
            )}
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              className={compactStyles.button}
            >
              <Download className="w-3 h-3 mr-1" />
              내보내기
            </Button>
            {!readOnly && (
              <Button
                onClick={handleImageUpload}
                variant="outline"
                size="sm"
                className={compactStyles.button}
              >
                <Image className="w-3 h-3 mr-1" />
                이미지
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* 수식 입력 컨트롤 */}
      {selectedCell && !readOnly && (
        <Card className={compactStyles.card}>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs flex items-center">
              <Sigma className="w-3 h-3 mr-1" />
              수식 입력 (행 {selectedCell.row + 1}, 열 {selectedCell.col + 1})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex gap-1">
              <Input
                placeholder="=SUM(A1:A10), =AVERAGE(B1:B5), =IF(C1>10,'큼','작음') 등"
                value={formulaInput}
                onChange={(e) => setFormulaInput(e.target.value)}
                className={compactStyles.input}
              />
              <Button 
                onClick={applyFormula}
                className={compactStyles.button}
                disabled={!formulaInput}
              >
                <Plus className="w-3 h-3" />
                적용
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Excel 수식 지원: SUM, AVERAGE, COUNT, IF, CONCATENATE, ROUND, MAX, MIN 등
            </div>
          </CardContent>
        </Card>
      )}

      {/* Handsontable 컨테이너 */}
      <Card className="p-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
            스프레드시트 로딩 중...
          </div>
        ) : (
          <>
            <div 
              ref={containerRef}
              className="w-full"
              style={{ fontSize: '12px', minHeight: '300px' }}
            />
            {/* Handsontable가 로드되지 않은 경우 대체 테이블 표시 */}
            {!hotRef.current && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-8 p-2 border-r text-center font-medium">#</th>
                      {config.colHeaders.map((header, index) => (
                        <th key={index} className="p-2 border-r text-left font-medium" style={{ width: config.columns[index]?.width || 100 }}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: Math.min(config.rowsCount, 10) }, (_, rowIndex) => (
                      <tr key={rowIndex} className="border-b hover:bg-gray-50">
                        <td className="w-8 p-2 border-r text-center text-gray-500 bg-gray-50">{rowIndex + 1}</td>
                        {config.columns.map((column, colIndex) => (
                          <td key={colIndex} className="p-2 border-r">
                            {column.type === 'numeric' ? '0' : 
                             column.type === 'checkbox' ? '☐' :
                             column.type === 'image' ? '📷' : ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-2 text-xs text-muted-foreground bg-yellow-50 border-t">
                  ⚠️ 스프레드시트 라이브러리 로딩 실패 - 기본 테이블로 표시됨
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* 총계 및 통계 */}
      {Object.keys(totals).length > 0 && (
        <Card className={compactStyles.card}>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs flex items-center">
              <Calculator className="w-3 h-3 mr-1" />
              합계
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {Object.entries(totals).map(([key, value]) => {
                const column = config.columns.find(col => col.data === key);
                return (
                  <div key={key} className="text-center">
                    <div className="font-medium">{column?.title || key}</div>
                    <div className="text-blue-600">
                      {typeof value === 'number' ? value.toLocaleString() : value}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 수식 정보 */}
      {Object.keys(config.formulas).length > 0 && (
        <Card className={compactStyles.card}>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs">적용된 수식</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-xs">
              {Object.entries(config.formulas).map(([colIndex, formula]) => {
                const column = config.columns[parseInt(colIndex)];
                return (
                  <div key={colIndex} className="flex items-center justify-between">
                    <span className="font-medium">{column?.title}</span>
                    <span className="text-muted-foreground font-mono">{formula}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}