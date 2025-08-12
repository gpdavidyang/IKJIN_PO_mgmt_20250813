import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, TooltipProps } from "recharts";
import { getStatusText, getStatusColor } from "@/lib/statusUtils";

interface EnhancedPieChartProps {
  data: any[];
  height?: number;
  colors?: string[];
  innerRadius?: number;
  outerRadius?: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="text-sm font-semibold text-gray-900">
          {getStatusText(data.payload.status)}
        </p>
        <p className="text-sm text-gray-600">
          {data.value}건 ({((data.percent || 0) * 100).toFixed(1)}%)
        </p>
      </div>
    );
  }
  return null;
};

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null; // Don't show label for small slices

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      className="text-xs font-semibold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function EnhancedPieChart({
  data,
  height = 250,
  colors = COLORS,
  innerRadius = 0,
  outerRadius = 80
}: EnhancedPieChartProps) {
  return (
    <div className="space-y-4">
      <div style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={outerRadius}
              innerRadius={innerRadius}
              fill="#8884d8"
              dataKey="count"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Enhanced Legend */}
      <div className="grid grid-cols-2 gap-2">
        {data.map((entry, index) => (
          <div key={entry.status} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
            <div 
              className="w-4 h-4 rounded-sm flex-shrink-0" 
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {getStatusText(entry.status)}
              </p>
              <p className="text-xs text-gray-500">
                {entry.count}건
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}