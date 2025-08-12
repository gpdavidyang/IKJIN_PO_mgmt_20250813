import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar, 
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  ExternalLink
} from "lucide-react";
import { TooltipProps } from "recharts";

// Enhanced tooltip data interface
export interface TooltipData {
  label: string;
  value: number | string;
  color?: string;
  name?: string;
  unit?: string;
  format?: 'number' | 'currency' | 'percentage';
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  category?: string;
  metadata?: Record<string, any>;
}

// Interactive tooltip props
interface InteractiveTooltipProps extends TooltipProps<any, any> {
  showTrend?: boolean;
  showChange?: boolean;
  showCategory?: boolean;
  showMetadata?: boolean;
  formatValue?: (value: any, name: string, unit?: string) => string;
  onItemClick?: (data: TooltipData) => void;
  onDrillDown?: (data: TooltipData) => void;
  customContent?: (payload: any[], label: string, active: boolean) => React.ReactNode;
  theme?: 'light' | 'dark';
  animate?: boolean;
}

// Format value utility
const formatValue = (
  value: number | string, 
  format: 'number' | 'currency' | 'percentage' = 'number',
  unit?: string
): string => {
  if (typeof value === 'string') return value;
  
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('ko-KR', { 
        style: 'currency', 
        currency: 'KRW' 
      }).format(value);
    case 'percentage':
      return `${value.toFixed(1)}%`;
    default:
      return `${value.toLocaleString('ko-KR')}${unit ? ` ${unit}` : ''}`;
  }
};

// Get trend icon
const getTrendIcon = (trend?: 'up' | 'down' | 'neutral', change?: number) => {
  if (change !== undefined) {
    if (change > 0) return <TrendingUp className="h-3 w-3 text-success-600" />;
    if (change < 0) return <TrendingDown className="h-3 w-3 text-error-600" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  }
  
  switch (trend) {
    case 'up':
      return <TrendingUp className="h-3 w-3 text-success-600" />;
    case 'down':
      return <TrendingDown className="h-3 w-3 text-error-600" />;
    default:
      return <Minus className="h-3 w-3 text-muted-foreground" />;
  }
};

// Get trend color class
const getTrendColorClass = (trend?: 'up' | 'down' | 'neutral', change?: number) => {
  if (change !== undefined) {
    if (change > 0) return 'text-success-600';
    if (change < 0) return 'text-error-600';
    return 'text-muted-foreground';
  }
  
  switch (trend) {
    case 'up':
      return 'text-success-600';
    case 'down':
      return 'text-error-600';
    default:
      return 'text-muted-foreground';
  }
};

// Enhanced Interactive Tooltip Component
export function InteractiveTooltip({
  active,
  payload,
  label,
  showTrend = true,
  showChange = true,
  showCategory = false,
  showMetadata = false,
  formatValue: customFormatValue,
  onItemClick,
  onDrillDown,
  customContent,
  theme = 'light',
  animate = true
}: InteractiveTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  // Use custom content if provided
  if (customContent) {
    return <>{customContent(payload, label, active)}</>;
  }

  const themeClasses = {
    light: "bg-background border-border text-foreground",
    dark: "bg-popover border-border text-popover-foreground"
  };

  return (
    <Card 
      className={cn(
        "shadow-lg min-w-[250px] max-w-[400px] z-50",
        themeClasses[theme],
        animate && "animate-in fade-in-0 zoom-in-95 duration-150"
      )}
    >
      <CardContent className="p-4">
        {/* Header with label and timestamp */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{label}</span>
          </div>
          {onDrillDown && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDrillDown({ label, value: '', name: label })}
              className="h-6 w-6 p-0"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Data items */}
        <div className="space-y-3">
          {payload.map((entry, index) => {
            const data: TooltipData = {
              label,
              value: entry.value,
              color: entry.color,
              name: entry.name || entry.dataKey,
              unit: entry.unit,
              format: entry.format,
              change: entry.change,
              trend: entry.trend,
              category: entry.category,
              metadata: entry.payload
            };

            const formattedValue = customFormatValue 
              ? customFormatValue(entry.value, entry.name || '', entry.unit)
              : formatValue(entry.value, data.format, data.unit);

            return (
              <div
                key={`tooltip-${index}`}
                className={cn(
                  "flex items-center justify-between p-2 rounded-md transition-colors",
                  onItemClick && "cursor-pointer hover:bg-accent/50"
                )}
                onClick={() => onItemClick?.(data)}
              >
                <div className="flex items-center space-x-3 flex-1">
                  {/* Color indicator */}
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  
                  {/* Name and category */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium truncate">
                        {data.name}
                      </span>
                      {showCategory && data.category && (
                        <Badge variant="outline" className="text-xs">
                          {data.category}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Metadata */}
                    {showMetadata && data.metadata && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {Object.entries(data.metadata)
                          .filter(([key]) => !['name', 'value', 'color'].includes(key))
                          .slice(0, 2)
                          .map(([key, value]) => (
                            <span key={key} className="mr-2">
                              {key}: {String(value)}
                            </span>
                          ))
                        }
                      </div>
                    )}
                  </div>
                </div>

                {/* Value and trend */}
                <div className="text-right">
                  <div className="text-sm font-semibold">
                    {formattedValue}
                  </div>
                  
                  {showTrend && (showChange ? data.change !== undefined : data.trend) && (
                    <div className="flex items-center justify-end space-x-1 mt-1">
                      {getTrendIcon(data.trend, data.change)}
                      {showChange && data.change !== undefined && (
                        <span className={cn(
                          "text-xs font-medium",
                          getTrendColorClass(data.trend, data.change)
                        )}>
                          {data.change > 0 ? '+' : ''}{data.change.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        {(onItemClick || onDrillDown) && payload.length > 1 && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>총 {payload.length}개 항목</span>
              <div className="flex items-center space-x-1">
                <Info className="h-3 w-3" />
                <span>클릭하여 자세히 보기</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact tooltip for small charts
export function CompactTooltip({
  active,
  payload,
  label,
  formatValue: customFormatValue
}: TooltipProps<any, any> & { formatValue?: (value: any, name: string) => string }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-popover border border-border rounded-md shadow-md p-2 text-xs">
      <div className="font-medium mb-1">{label}</div>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center space-x-2">
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">
            {customFormatValue 
              ? customFormatValue(entry.value, entry.name || '')
              : entry.value?.toLocaleString('ko-KR')
            }
          </span>
        </div>
      ))}
    </div>
  );
}

// Detailed tooltip with drill-down capabilities
interface DetailedTooltipProps extends TooltipProps<any, any> {
  onDrillDown?: (data: any) => void;
  onCompare?: (data: any[]) => void;
  showActions?: boolean;
}

export function DetailedTooltip({
  active,
  payload,
  label,
  onDrillDown,
  onCompare,
  showActions = true
}: DetailedTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const totalValue = payload.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);

  return (
    <Card className="w-80 shadow-xl border-2">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-semibold">{label}</h4>
            <p className="text-sm text-muted-foreground">
              총합: {totalValue.toLocaleString('ko-KR')}
            </p>
          </div>
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Data breakdown */}
        <div className="space-y-2 mb-4">
          {payload.map((entry, index) => {
            const percentage = totalValue > 0 ? (Number(entry.value) / totalValue) * 100 : 0;
            
            return (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-2 flex-1">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm">{entry.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {Number(entry.value).toLocaleString('ko-KR')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        {showActions && (onDrillDown || onCompare) && (
          <div className="flex space-x-2 pt-3 border-t border-border">
            {onDrillDown && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDrillDown({ label, data: payload })}
                className="flex-1"
              >
                <ArrowDownRight className="h-3 w-3 mr-1" />
                자세히 보기
              </Button>
            )}
            {onCompare && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCompare(payload)}
                className="flex-1"
              >
                <BarChart3 className="h-3 w-3 mr-1" />
                비교하기
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Tooltip with custom renderer for specific chart types
export function createCustomTooltip(
  chartType: 'line' | 'bar' | 'area' | 'pie',
  options: {
    showTrend?: boolean;
    showPercentage?: boolean;
    showTotal?: boolean;
    formatValue?: (value: any, name: string) => string;
    onItemClick?: (data: any) => void;
  } = {}
) {
  return function CustomTooltip(props: TooltipProps<any, any>) {
    const { active, payload, label } = props;
    
    if (!active || !payload || !payload.length) return null;

    const {
      showTrend = false,
      showPercentage = chartType === 'pie',
      showTotal = payload.length > 1,
      formatValue: customFormat,
      onItemClick
    } = options;

    const total = showTotal ? payload.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0) : 0;

    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
        {/* Label */}
        <div className="font-medium text-sm mb-2 text-popover-foreground">
          {label}
        </div>

        {/* Items */}
        <div className="space-y-1">
          {payload.map((entry, index) => {
            const value = customFormat 
              ? customFormat(entry.value, entry.name || '')
              : Number(entry.value).toLocaleString('ko-KR');
            
            const percentage = showPercentage && total > 0 
              ? (Number(entry.value) / total * 100).toFixed(1) + '%'
              : null;

            return (
              <div
                key={index}
                className={cn(
                  "flex items-center justify-between py-1",
                  onItemClick && "cursor-pointer hover:bg-accent rounded px-1"
                )}
                onClick={() => onItemClick?.(entry)}
              >
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {entry.name}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">
                    {value}
                  </span>
                  {percentage && (
                    <span className="text-xs text-muted-foreground">
                      ({percentage})
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Total */}
        {showTotal && (
          <div className="mt-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>총계</span>
              <span>{total.toLocaleString('ko-KR')}</span>
            </div>
          </div>
        )}
      </div>
    );
  };
}