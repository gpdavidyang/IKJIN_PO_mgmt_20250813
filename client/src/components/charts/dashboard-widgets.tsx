import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  ArrowUpRight, 
  ArrowDownRight,
  MoreVertical,
  RefreshCw,
  Maximize2,
  Eye,
  EyeOff
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Widget system types
export interface WidgetData {
  id: string;
  title: string;
  value: number | string;
  previousValue?: number;
  unit?: string;
  format?: 'number' | 'currency' | 'percentage';
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  description?: string;
  category?: string;
  lastUpdated?: Date;
  status?: 'normal' | 'warning' | 'critical' | 'success';
}

export interface ChartWidgetData extends WidgetData {
  chartData: any[];
  chartType: 'line' | 'bar' | 'area' | 'pie';
  chartConfig?: any;
}

// Format value utility
const formatValue = (value: number | string, format: 'number' | 'currency' | 'percentage' = 'number', unit?: string) => {
  if (typeof value === 'string') return value;
  
  switch (format) {
    case 'currency':
      return `₩${value.toLocaleString()}`;
    case 'percentage':
      return `${value.toFixed(1)}%`;
    default:
      return `${value.toLocaleString()}${unit ? ` ${unit}` : ''}`;
  }
};

// Calculate trend
const calculateTrend = (current: number, previous?: number): { trend: 'up' | 'down' | 'neutral', percentage: number } => {
  if (!previous || previous === 0) return { trend: 'neutral', percentage: 0 };
  
  const percentage = ((current - previous) / previous) * 100;
  const trend = percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'neutral';
  
  return { trend, percentage: Math.abs(percentage) };
};

// KPI Widget
interface KPIWidgetProps {
  data: WidgetData;
  className?: string;
  showTrend?: boolean;
  showDescription?: boolean;
  onRefresh?: () => void;
  onClick?: () => void;
  loading?: boolean;
}

export function KPIWidget({
  data,
  className,
  showTrend = true,
  showDescription = true,
  onRefresh,
  onClick,
  loading = false
}: KPIWidgetProps) {
  const { trend, percentage } = data.previousValue 
    ? calculateTrend(Number(data.value), data.previousValue)
    : { trend: data.trend || 'neutral', percentage: data.trendValue || 0 };

  const statusColors = {
    normal: '',
    warning: 'border-l-4 border-l-warning-500',
    critical: 'border-l-4 border-l-error-500',
    success: 'border-l-4 border-l-success-500'
  };

  const trendIcons = {
    up: <TrendingUp className="h-4 w-4 text-success-600" />,
    down: <TrendingDown className="h-4 w-4 text-error-600" />,
    neutral: <Minus className="h-4 w-4 text-muted-foreground" />
  };

  const trendColors = {
    up: 'text-success-600 bg-success-50',
    down: 'text-error-600 bg-error-50',
    neutral: 'text-muted-foreground bg-muted'
  };

  return (
    <Card 
      className={cn(
        "relative transition-all duration-200 hover:shadow-md",
        statusColors[data.status || 'normal'],
        onClick && "cursor-pointer hover:bg-accent/50",
        className
      )}
      onClick={onClick}
    >
      {loading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-lg">
          <RefreshCw className="h-4 w-4 animate-spin" />
        </div>
      )}
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {data.title}
        </CardTitle>
        {onRefresh && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onRefresh();
            }}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-foreground">
              {formatValue(data.value, data.format, data.unit)}
            </div>
            {showTrend && percentage > 0 && (
              <div className="flex items-center space-x-1 mt-1">
                {trendIcons[trend]}
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs", trendColors[trend])}
                >
                  {percentage.toFixed(1)}%
                </Badge>
              </div>
            )}
          </div>
          
          {data.category && (
            <Badge variant="outline" className="text-xs">
              {data.category}
            </Badge>
          )}
        </div>
        
        {showDescription && data.description && (
          <p className="text-xs text-muted-foreground mt-2">
            {data.description}
          </p>
        )}
        
        {data.lastUpdated && (
          <p className="text-xs text-muted-foreground mt-2">
            업데이트: {data.lastUpdated.toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Chart Widget
interface ChartWidgetProps {
  data: ChartWidgetData;
  className?: string;
  height?: number;
  showControls?: boolean;
  onRefresh?: () => void;
  onExpand?: () => void;
  onToggleVisibility?: () => void;
  loading?: boolean;
  visible?: boolean;
}

export function ChartWidget({
  data,
  className,
  height = 300,
  showControls = true,
  onRefresh,
  onExpand,
  onToggleVisibility,
  loading = false,
  visible = true
}: ChartWidgetProps) {
  const [isMinimized, setIsMinimized] = React.useState(!visible);

  if (isMinimized) {
    return (
      <Card className={cn("transition-all duration-200", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {data.title}
          </CardTitle>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(false)}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={cn("transition-all duration-200", className)}>
      {loading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-lg">
          <RefreshCw className="h-4 w-4 animate-spin" />
        </div>
      )}
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {data.title}
          </CardTitle>
          {data.description && (
            <p className="text-xs text-muted-foreground mt-1">
              {data.description}
            </p>
          )}
        </div>
        
        {showControls && (
          <div className="flex items-center space-x-1">
            {onRefresh && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onRefresh}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
            
            {onExpand && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onExpand}
                className="h-8 w-8 p-0"
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
              className="h-8 w-8 p-0"
            >
              <EyeOff className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div style={{ height }}>
          {/* Chart component would be rendered here based on data.chartType */}
          <div className="w-full h-full bg-muted/20 rounded-md flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {data.chartType.toUpperCase()} 차트 ({data.chartData.length} 데이터 포인트)
            </p>
          </div>
        </div>
        
        {data.lastUpdated && (
          <p className="text-xs text-muted-foreground mt-2">
            업데이트: {data.lastUpdated.toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Dashboard Widget Grid
interface DashboardGridProps {
  widgets: (WidgetData | ChartWidgetData)[];
  columns?: number;
  className?: string;
  onWidgetClick?: (widget: WidgetData | ChartWidgetData) => void;
  onWidgetRefresh?: (widgetId: string) => void;
  loadingWidgets?: string[];
}

export function DashboardGrid({
  widgets,
  columns = 4,
  className,
  onWidgetClick,
  onWidgetRefresh,
  loadingWidgets = []
}: DashboardGridProps) {
  const gridClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
    6: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
  };

  return (
    <div className={cn(
      "grid gap-4",
      gridClass[columns as keyof typeof gridClass] || "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
      className
    )}>
      {widgets.map((widget) => {
        const isChart = 'chartData' in widget;
        const isLoading = loadingWidgets.includes(widget.id);
        
        if (isChart) {
          return (
            <ChartWidget
              key={widget.id}
              data={widget as ChartWidgetData}
              loading={isLoading}
              onRefresh={() => onWidgetRefresh?.(widget.id)}
              onExpand={() => onWidgetClick?.(widget)}
            />
          );
        } else {
          return (
            <KPIWidget
              key={widget.id}
              data={widget}
              loading={isLoading}
              onRefresh={() => onWidgetRefresh?.(widget.id)}
              onClick={() => onWidgetClick?.(widget)}
            />
          );
        }
      })}
    </div>
  );
}

// Summary Card
interface SummaryCardProps {
  title: string;
  metrics: Array<{
    label: string;
    value: number | string;
    change?: number;
    format?: 'number' | 'currency' | 'percentage';
    unit?: string;
  }>;
  className?: string;
  showTrends?: boolean;
}

export function SummaryCard({
  title,
  metrics,
  className,
  showTrends = true
}: SummaryCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((metric, index) => (
            <div key={index} className="space-y-1">
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              <p className="text-xl font-bold text-foreground">
                {formatValue(metric.value, metric.format, metric.unit)}
              </p>
              {showTrends && metric.change !== undefined && (
                <div className="flex items-center space-x-1">
                  {metric.change > 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-success-600" />
                  ) : metric.change < 0 ? (
                    <ArrowDownRight className="h-3 w-3 text-error-600" />
                  ) : (
                    <Minus className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className={cn(
                    "text-xs font-medium",
                    metric.change > 0 ? "text-success-600" :
                    metric.change < 0 ? "text-error-600" :
                    "text-muted-foreground"
                  )}>
                    {Math.abs(metric.change).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Real-time data hook
export function useRealTimeData<T>(
  initialData: T,
  updateFn: () => Promise<T>,
  interval: number = 30000,
  enabled: boolean = true
) {
  const [data, setData] = React.useState<T>(initialData);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = React.useState<Date>(new Date());

  const updateData = React.useCallback(async () => {
    if (!enabled) return;
    
    try {
      setLoading(true);
      setError(null);
      const newData = await updateFn();
      setData(newData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 업데이트 실패');
    } finally {
      setLoading(false);
    }
  }, [updateFn, enabled]);

  React.useEffect(() => {
    if (!enabled) return;

    const intervalId = setInterval(updateData, interval);
    return () => clearInterval(intervalId);
  }, [updateData, interval, enabled]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh: updateData
  };
}