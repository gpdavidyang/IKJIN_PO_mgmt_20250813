import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 border",
  {
    variants: {
      variant: {
        default: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600",
        primary: "bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/50 dark:text-primary-300 dark:border-primary-800",
        success: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800",
        warning: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-800",
        danger: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800",
        info: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800",
        purple: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800",
        outline: "bg-transparent border-current",
      },
      size: {
        sm: "text-xs px-2 py-0.5",
        md: "text-xs px-2.5 py-1",
        lg: "text-sm px-3 py-1.5",
      },
      pulse: {
        true: "animate-pulse",
        false: "",
      },
      interactive: {
        true: "cursor-pointer hover:scale-105 active:scale-95",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      pulse: false,
      interactive: false,
    },
  }
);

export interface StatusConfig {
  label: string;
  variant: VariantProps<typeof statusBadgeVariants>["variant"];
  icon?: LucideIcon;
  pulse?: boolean;
}

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {
  icon?: LucideIcon;
  children: React.ReactNode;
  onRemove?: () => void;
  animate?: boolean;
}

export function StatusBadge({
  className,
  variant,
  size,
  pulse,
  interactive,
  icon: Icon,
  children,
  onRemove,
  animate = true,
  ...props
}: StatusBadgeProps) {
  return (
    <div
      className={cn(
        statusBadgeVariants({ variant, size, pulse, interactive }),
        animate && "transition-all duration-200",
        className
      )}
      {...props}
    >
      {Icon && <Icon className="h-3 w-3" />}
      <span>{children}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 -mr-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="h-3 w-3"
          >
            <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" />
          </svg>
        </button>
      )}
    </div>
  );
}

// Animated status change wrapper
export interface AnimatedStatusBadgeProps extends StatusBadgeProps {
  prevStatus?: string;
}

export function AnimatedStatusBadge({
  prevStatus,
  ...props
}: AnimatedStatusBadgeProps) {
  const [isChanging, setIsChanging] = React.useState(false);

  React.useEffect(() => {
    if (prevStatus && prevStatus !== props.children) {
      setIsChanging(true);
      const timer = setTimeout(() => setIsChanging(false), 500);
      return () => clearTimeout(timer);
    }
  }, [prevStatus, props.children]);

  return (
    <StatusBadge
      {...props}
      className={cn(
        props.className,
        isChanging && "scale-110 shadow-lg"
      )}
    />
  );
}

// Pre-configured status badges for common use cases
export const OrderStatusBadge = {
  draft: (props?: Partial<StatusBadgeProps>) => (
    <StatusBadge variant="default" {...props}>
      초안
    </StatusBadge>
  ),
  pending: (props?: Partial<StatusBadgeProps>) => (
    <StatusBadge variant="warning" {...props}>
      승인 대기
    </StatusBadge>
  ),
  approved: (props?: Partial<StatusBadgeProps>) => (
    <StatusBadge variant="info" {...props}>
      승인됨
    </StatusBadge>
  ),
  sent: (props?: Partial<StatusBadgeProps>) => (
    <StatusBadge variant="success" {...props}>
      발송됨
    </StatusBadge>
  ),
  completed: (props?: Partial<StatusBadgeProps>) => (
    <StatusBadge variant="success" {...props}>
      완료
    </StatusBadge>
  ),
  rejected: (props?: Partial<StatusBadgeProps>) => (
    <StatusBadge variant="danger" {...props}>
      반려됨
    </StatusBadge>
  ),
  cancelled: (props?: Partial<StatusBadgeProps>) => (
    <StatusBadge variant="default" {...props}>
      취소됨
    </StatusBadge>
  ),
};