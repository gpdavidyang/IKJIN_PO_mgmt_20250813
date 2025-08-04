import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatKoreanWon } from "@/lib/utils";

interface EnhancedStatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
  isLoading?: boolean;
  subtitle?: string;
}

export function EnhancedStatsCard({
  title,
  value,
  icon: Icon,
  iconColor,
  iconBgColor,
  trend,
  onClick,
  isLoading,
  subtitle
}: EnhancedStatsCardProps) {
  const formattedValue = typeof value === 'number' && title.includes('금액') 
    ? formatKoreanWon(value) 
    : value;

  return (
    <Card 
      className={cn(
        "group transition-all duration-200 hover:shadow-lg",
        onClick && "cursor-pointer hover:scale-[1.02]"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? (
                  <span className="inline-block h-7 w-20 bg-gray-200 rounded animate-pulse" />
                ) : (
                  formattedValue
                )}
              </p>
              {trend && !isLoading && (
                <span className={cn(
                  "text-sm font-medium",
                  trend.isPositive ? "text-success-600" : "text-error-600"
                )}>
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
              )}
            </div>
            {subtitle && !isLoading && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={cn(
            "p-3 rounded-lg transition-transform group-hover:scale-110",
            iconBgColor
          )}>
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}