import React from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
  LegendProps
} from "recharts";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, MoreVertical, TrendingUp, TrendingDown, Minus } from "lucide-react";

// Color palette for charts
const CHART_COLORS = {
  primary: ["#3b82f6", "#1d4ed8", "#1e40af", "#1e3a8a"],
  success: ["#10b981", "#059669", "#047857", "#065f46"],
  warning: ["#f59e0b", "#d97706", "#b45309", "#92400e"],
  danger: ["#ef4444", "#dc2626", "#b91c1c", "#991b1b"],
  neutral: ["#6b7280", "#4b5563", "#374151", "#1f2937"],
  mixed: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16", "#f97316"]
};

// Custom tooltip component
interface CustomTooltipProps extends TooltipProps<any, any> {
  formatValue?: (value: any, name: string) => string;
  showTrend?: boolean;
}

function CustomTooltip({ 
  active, 
  payload, 
  label, 
  formatValue,
  showTrend = false 
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-background border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
      <p className="font-medium text-foreground mb-2">{label}</p>
      {payload.map((entry, index) => {
        const value = formatValue ? formatValue(entry.value, entry.name || '') : entry.value;
        return (
          <div key={index} className="flex items-center justify-between space-x-2 mb-1">
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-muted-foreground">{entry.name}</span>
            </div>
            <span className="text-sm font-medium text-foreground">{value}</span>
          </div>
        );
      })}
    </div>
  );
}

// Chart data export functionality
const exportChartData = (data: any[], filename: string, format: 'csv' | 'json') => {
  if (format === 'csv') {
    const headers = Object.keys(data[0] || {}).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

// Base chart props
interface BaseChartProps {
  data: any[];
  title?: string;
  subtitle?: string;
  height?: number;
  className?: string;
  showExport?: boolean;
  exportFilename?: string;
  colors?: string[];
  formatValue?: (value: any, name: string) => string;
  showTrend?: boolean;
  loading?: boolean;
  error?: string | null;
}

// Advanced Line Chart
interface LineChartProps extends BaseChartProps {
  xAxisKey: string;
  lines: Array<{
    dataKey: string;
    name: string;
    color?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
  }>;
  showDots?: boolean;
  showGrid?: boolean;
  curve?: 'monotone' | 'linear' | 'step';
}

export function AdvancedLineChart({
  data,
  title,
  subtitle,
  height = 400,
  className,
  showExport = true,
  exportFilename = "line-chart-data",
  xAxisKey,
  lines,
  showDots = true,
  showGrid = true,
  curve = 'monotone',
  colors = CHART_COLORS.mixed,
  formatValue,
  showTrend = false,
  loading = false,
  error = null
}: LineChartProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {showExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportChartData(data, exportFilename, 'csv')}>
                <Download className="mr-2 h-4 w-4" />
                CSV로 내보내기
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportChartData(data, exportFilename, 'json')}>
                <Download className="mr-2 h-4 w-4" />
                JSON으로 내보내기
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
            <XAxis 
              dataKey={xAxisKey} 
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip formatValue={formatValue} showTrend={showTrend} />} />
            <Legend />
            {lines.map((line, index) => (
              <Line
                key={line.dataKey}
                type={curve}
                dataKey={line.dataKey}
                name={line.name}
                stroke={line.color || colors[index % colors.length]}
                strokeWidth={line.strokeWidth || 2}
                strokeDasharray={line.strokeDasharray}
                dot={showDots ? { r: 4 } : false}
                activeDot={{ r: 6, stroke: line.color || colors[index % colors.length], strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Advanced Bar Chart
interface BarChartProps extends BaseChartProps {
  xAxisKey: string;
  bars: Array<{
    dataKey: string;
    name: string;
    color?: string;
  }>;
  orientation?: 'vertical' | 'horizontal';
  stacked?: boolean;
  showGrid?: boolean;
}

export function AdvancedBarChart({
  data,
  title,
  subtitle,
  height = 400,
  className,
  showExport = true,
  exportFilename = "bar-chart-data",
  xAxisKey,
  bars,
  orientation = 'vertical',
  stacked = false,
  showGrid = true,
  colors = CHART_COLORS.mixed,
  formatValue,
  loading = false,
  error = null
}: BarChartProps) {
  // Debug logging for monthly statistics chart
  if (title === "월별 발주 통계") {
    console.log('📊 AdvancedBarChart 렌더링:', {
      title,
      data,
      xAxisKey,
      bars,
      dataLength: data?.length,
      loading,
      error
    });
  }
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {showExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportChartData(data, exportFilename, 'csv')}>
                <Download className="mr-2 h-4 w-4" />
                CSV로 내보내기
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportChartData(data, exportFilename, 'json')}>
                <Download className="mr-2 h-4 w-4" />
                JSON으로 내보내기
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart 
            data={data} 
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            layout={orientation === 'horizontal' ? 'horizontal' : 'vertical'}
          >
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
            <XAxis 
              dataKey={orientation === 'horizontal' ? undefined : xAxisKey}
              type={orientation === 'horizontal' ? 'number' : 'category'}
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              dataKey={orientation === 'horizontal' ? xAxisKey : undefined}
              type={orientation === 'horizontal' ? 'category' : 'number'}
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip formatValue={formatValue} />} />
            <Legend />
            {bars.map((bar, index) => (
              <Bar
                key={bar.dataKey}
                dataKey={bar.dataKey}
                name={bar.name}
                fill={bar.color || colors[index % colors.length]}
                stackId={stacked ? "stack" : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Advanced Area Chart
interface AreaChartProps extends BaseChartProps {
  xAxisKey: string;
  areas: Array<{
    dataKey: string;
    name: string;
    color?: string;
  }>;
  stacked?: boolean;
  showGrid?: boolean;
  curve?: 'monotone' | 'linear' | 'step';
}

export function AdvancedAreaChart({
  data,
  title,
  subtitle,
  height = 400,
  className,
  showExport = true,
  exportFilename = "area-chart-data",
  xAxisKey,
  areas,
  stacked = true,
  showGrid = true,
  curve = 'monotone',
  colors = CHART_COLORS.mixed,
  formatValue,
  loading = false,
  error = null
}: AreaChartProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {showExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportChartData(data, exportFilename, 'csv')}>
                <Download className="mr-2 h-4 w-4" />
                CSV로 내보내기
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportChartData(data, exportFilename, 'json')}>
                <Download className="mr-2 h-4 w-4" />
                JSON으로 내보내기
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
            <XAxis 
              dataKey={xAxisKey} 
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip formatValue={formatValue} />} />
            <Legend />
            {areas.map((area, index) => (
              <Area
                key={area.dataKey}
                type={curve}
                dataKey={area.dataKey}
                name={area.name}
                stackId={stacked ? "stack" : area.dataKey}
                stroke={area.color || colors[index % colors.length]}
                fill={area.color || colors[index % colors.length]}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Advanced Pie Chart
interface PieChartProps extends BaseChartProps {
  dataKey: string;
  nameKey: string;
  showLabels?: boolean;
  showLegend?: boolean;
  innerRadius?: number;
  outerRadius?: number;
}

export function AdvancedPieChart({
  data,
  title,
  subtitle,
  height = 400,
  className,
  showExport = true,
  exportFilename = "pie-chart-data",
  dataKey,
  nameKey,
  showLabels = true,
  showLegend = true,
  innerRadius = 0,
  outerRadius = 120,
  colors = CHART_COLORS.mixed,
  formatValue,
  loading = false,
  error = null
}: PieChartProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {showExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportChartData(data, exportFilename, 'csv')}>
                <Download className="mr-2 h-4 w-4" />
                CSV로 내보내기
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportChartData(data, exportFilename, 'json')}>
                <Download className="mr-2 h-4 w-4" />
                JSON으로 내보내기
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
              dataKey={dataKey}
              nameKey={nameKey}
              label={showLabels ? ({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)` : false}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip formatValue={formatValue} />} />
            {showLegend && <Legend />}
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}