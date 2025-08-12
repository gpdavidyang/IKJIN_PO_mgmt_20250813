import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, TooltipProps } from "recharts";
import { formatKoreanWon } from "@/lib/utils";

interface EnhancedBarChartProps {
  data: any[];
  height?: number;
  formatAmount?: boolean;
  primaryDataKey: string;
  secondaryDataKey?: string;
  primaryLabel: string;
  secondaryLabel?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="text-sm font-semibold text-gray-900 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            <span className="font-medium">{entry.name}:</span>{' '}
            {entry.name?.includes('금액') 
              ? formatKoreanWon(Number(entry.value) * 1000000)
              : `${entry.value}${entry.name?.includes('건수') ? '건' : ''}`
            }
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function EnhancedBarChart({
  data,
  height = 300,
  formatAmount = true,
  primaryDataKey,
  secondaryDataKey,
  primaryLabel,
  secondaryLabel,
  primaryColor = "#3b82f6",
  secondaryColor = "#10b981"
}: EnhancedBarChartProps) {
  return (
    <div style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data} 
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
            iconType="rect"
          />
          <Bar 
            dataKey={primaryDataKey} 
            fill={primaryColor} 
            name={primaryLabel}
            radius={[4, 4, 0, 0]}
          />
          {secondaryDataKey && (
            <Bar 
              dataKey={secondaryDataKey} 
              fill={secondaryColor} 
              name={secondaryLabel}
              radius={[4, 4, 0, 0]}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}