import React from "react";
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  Send, 
  XCircle, 
  AlertCircle,
  User,
  Building2,
  Package,
  TrendingUp,
  TrendingDown,
  Minus,
  Play,
  Pause,
  Square
} from "lucide-react";
import { StatusBadge, AnimatedStatusBadge, type StatusBadgeProps } from "./status-badge";
import { cn } from "@/lib/utils";

// Comprehensive status configurations for different entities
export const STATUS_CONFIGS = {
  // Purchase Order Status
  order: {
    draft: {
      label: "임시저장",
      variant: "default" as const,
      icon: FileText,
      pulse: false,
      description: "작성 중인 발주서",
    },
    pending: {
      label: "승인 대기",
      variant: "warning" as const,
      icon: Clock,
      pulse: true,
      description: "승인자 검토 대기 중",
    },
    approved: {
      label: "승인됨",
      variant: "info" as const,
      icon: CheckCircle2,
      pulse: false,
      description: "승인 완료됨",
    },
    sent: {
      label: "발송됨",
      variant: "success" as const,
      icon: Send,
      pulse: false,
      description: "거래처에 발송 완료",
    },
    completed: {
      label: "완료",
      variant: "success" as const,
      icon: CheckCircle2,
      pulse: false,
      description: "발주 처리 완료",
    },
    rejected: {
      label: "반려됨",
      variant: "danger" as const,
      icon: XCircle,
      pulse: false,
      description: "승인이 거부됨",
    },
    cancelled: {
      label: "취소됨",
      variant: "default" as const,
      icon: Square,
      pulse: false,
      description: "발주가 취소됨",
    },
  },
  
  // User Status
  user: {
    active: {
      label: "활성",
      variant: "success" as const,
      icon: User,
      pulse: false,
    },
    inactive: {
      label: "비활성",
      variant: "default" as const,
      icon: Pause,
      pulse: false,
    },
    pending: {
      label: "승인 대기",
      variant: "warning" as const,
      icon: Clock,
      pulse: true,
    },
  },
  
  // Vendor Status
  vendor: {
    active: {
      label: "활성",
      variant: "success" as const,
      icon: Building2,
      pulse: false,
    },
    inactive: {
      label: "비활성",
      variant: "default" as const,
      icon: Pause,
      pulse: false,
    },
    verified: {
      label: "검증됨",
      variant: "info" as const,
      icon: CheckCircle2,
      pulse: false,
    },
    unverified: {
      label: "미검증",
      variant: "warning" as const,
      icon: AlertCircle,
      pulse: false,
    },
  },
  
  // Project Status
  project: {
    active: {
      label: "진행 중",
      variant: "primary" as const,
      icon: Play,
      pulse: false,
    },
    completed: {
      label: "완료",
      variant: "success" as const,
      icon: CheckCircle2,
      pulse: false,
    },
    on_hold: {
      label: "보류",
      variant: "warning" as const,
      icon: Pause,
      pulse: false,
    },
    cancelled: {
      label: "취소",
      variant: "default" as const,
      icon: XCircle,
      pulse: false,
    },
  },
  
  // Priority Levels
  priority: {
    low: {
      label: "낮음",
      variant: "default" as const,
      icon: TrendingDown,
      pulse: false,
    },
    normal: {
      label: "보통",
      variant: "info" as const,
      icon: Minus,
      pulse: false,
    },
    high: {
      label: "높음",
      variant: "warning" as const,
      icon: TrendingUp,
      pulse: false,
    },
    urgent: {
      label: "긴급",
      variant: "danger" as const,
      icon: AlertCircle,
      pulse: true,
    },
  },
} as const;

// Generic status badge component that uses the configurations
export interface SmartStatusBadgeProps extends Omit<StatusBadgeProps, "variant" | "icon"> {
  type: keyof typeof STATUS_CONFIGS;
  status: string;
  showIcon?: boolean;
  showTooltip?: boolean;
  animated?: boolean;
  prevStatus?: string;
}

export function SmartStatusBadge({
  type,
  status,
  showIcon = true,
  showTooltip = false,
  animated = false,
  prevStatus,
  className,
  ...props
}: SmartStatusBadgeProps) {
  const config = STATUS_CONFIGS[type]?.[status as keyof typeof STATUS_CONFIGS[typeof type]];
  
  if (!config) {
    console.warn(`Unknown status "${status}" for type "${type}"`);
    return (
      <StatusBadge variant="default" className={className} {...props}>
        {status}
      </StatusBadge>
    );
  }

  const BadgeComponent = animated ? AnimatedStatusBadge : StatusBadge;
  const badgeProps = animated ? { prevStatus } : {};

  return (
    <div className="relative group">
      <BadgeComponent
        variant={config.variant}
        icon={showIcon ? config.icon : undefined}
        pulse={config.pulse}
        className={className}
        {...badgeProps}
        {...props}
      >
        {config.label}
      </BadgeComponent>
      
      {showTooltip && config.description && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
          {config.description}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
}

// Status indicator with icon only (for compact displays)
export interface StatusIndicatorProps {
  type: keyof typeof STATUS_CONFIGS;
  status: string;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
}

export function StatusIndicator({
  type,
  status,
  size = "md",
  showTooltip = true,
  className,
}: StatusIndicatorProps) {
  const config = STATUS_CONFIGS[type]?.[status as keyof typeof STATUS_CONFIGS[typeof type]];
  
  if (!config) return null;

  const Icon = config.icon;
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const colorClasses = {
    default: "text-gray-500",
    primary: "text-primary-600",
    success: "text-green-600",
    warning: "text-yellow-600",
    danger: "text-red-600",
    info: "text-blue-600",
    purple: "text-purple-600",
    outline: "text-current",
  };

  return (
    <div className="relative group">
      <Icon
        className={cn(
          sizeClasses[size],
          colorClasses[config.variant],
          config.pulse && "animate-pulse",
          "transition-colors duration-200",
          className
        )}
      />
      
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
          {config.label}
          {config.description && ` - ${config.description}`}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
}

// Status timeline component for showing status changes
export interface StatusTimelineItem {
  status: string;
  timestamp: Date;
  user?: string;
  comment?: string;
}

export interface StatusTimelineProps {
  type: keyof typeof STATUS_CONFIGS;
  items: StatusTimelineItem[];
  className?: string;
}

export function StatusTimeline({ type, items, className }: StatusTimelineProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {items.map((item, index) => {
        const config = STATUS_CONFIGS[type]?.[item.status as keyof typeof STATUS_CONFIGS[typeof type]];
        const Icon = config?.icon;
        
        return (
          <div key={index} className="flex items-start gap-3">
            <div className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2",
              index === 0 ? "bg-primary-100 border-primary-300" : "bg-gray-100 border-gray-300"
            )}>
              {Icon && (
                <Icon className={cn(
                  "h-4 w-4",
                  index === 0 ? "text-primary-600" : "text-gray-600"
                )} />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <SmartStatusBadge
                  type={type}
                  status={item.status}
                  size="sm"
                />
                <span className="text-sm text-gray-500">
                  {item.timestamp.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              
              {item.user && (
                <p className="text-sm text-gray-600 mt-1">
                  {item.user}
                </p>
              )}
              
              {item.comment && (
                <p className="text-sm text-gray-700 mt-1">
                  {item.comment}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}