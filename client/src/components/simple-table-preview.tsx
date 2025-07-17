import { Card } from '@/components/ui/card';

interface HandsontableColumn {
  data: string;
  title: string;
  type: 'text' | 'numeric' | 'dropdown' | 'date' | 'checkbox' | 'image';
  width?: number;
  readOnly?: boolean;
}

interface HandsontableConfig {
  colHeaders: string[];
  columns: HandsontableColumn[];
  rowsCount: number;
}

interface SimpleTablePreviewProps {
  config: HandsontableConfig;
  data?: any[][];
}

export function SimpleTablePreview({ config, data = [] }: SimpleTablePreviewProps) {
  // 기본 데이터 생성
  const defaultData = data.length > 0 ? data : Array.from({ length: Math.min(config.rowsCount, 10) }, (_, rowIndex) => 
    Array.from({ length: config.columns.length }, (_, colIndex) => {
      const column = config.columns[colIndex];
      if (column.data === 'no') return rowIndex + 1;
      if (column.type === 'numeric') return 0;
      if (column.type === 'checkbox') return false;
      if (column.type === 'image') return '';
      return '';
    })
  );

  const getCellDisplay = (value: any, column: HandsontableColumn) => {
    if (column.type === 'numeric') {
      return typeof value === 'number' ? value.toLocaleString() : (value || '0');
    }
    if (column.type === 'checkbox') {
      return value ? '☑' : '☐';
    }
    if (column.type === 'image') {
      return value ? '📷' : '';
    }
    if (column.type === 'date') {
      return value || 'YYYY-MM-DD';
    }
    return value || '';
  };

  return (
    <Card className="p-1">
      <div className="border rounded-lg overflow-auto max-h-96">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="w-12 p-2 border border-gray-300 text-center font-medium bg-gray-100">#</th>
              {config.colHeaders.map((header, index) => (
                <th 
                  key={index} 
                  className="p-2 border border-gray-300 text-left font-medium bg-gray-50" 
                  style={{ 
                    width: config.columns[index]?.width || 100,
                    minWidth: config.columns[index]?.width || 100 
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{header}</span>
                    <span className="text-xs text-gray-500 font-normal">
                      {config.columns[index]?.type || 'text'}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {defaultData.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b hover:bg-gray-50">
                <td className="w-12 p-2 border border-gray-300 text-center text-gray-500 bg-gray-50 font-medium">
                  {rowIndex + 1}
                </td>
                {config.columns.map((column, colIndex) => (
                  <td 
                    key={colIndex} 
                    className={`p-2 border border-gray-300 ${
                      column.readOnly ? 'bg-gray-50' : 'bg-white'
                    } ${
                      column.type === 'numeric' ? 'text-right' : 'text-left'
                    }`}
                    style={{ 
                      width: column.width || 100,
                      minWidth: column.width || 100 
                    }}
                  >
                    <div className="truncate">
                      {getCellDisplay(row[colIndex], column)}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* 테이블 정보 */}
      <div className="mt-2 p-2 bg-blue-50 border-t text-xs text-blue-800">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="font-medium">총 컬럼:</span> {config.columns.length}개
          </div>
          <div>
            <span className="font-medium">총 행:</span> {config.rowsCount}개
          </div>
          <div>
            <span className="font-medium">표시:</span> {Math.min(config.rowsCount, 10)}행
          </div>
        </div>
        <div className="mt-1 text-blue-600">
          💡 실제 스프레드시트에서는 수식, 이미지, 드롭다운 등 모든 기능이 지원됩니다
        </div>
      </div>
    </Card>
  );
}