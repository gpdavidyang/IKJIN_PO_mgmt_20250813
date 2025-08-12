import React from "react";
import { cn } from "@/lib/utils";

// Enhanced skeleton component
interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: "rectangular" | "circular" | "text" | "rounded";
  animate?: boolean;
}

function Skeleton({
  className,
  width,
  height,
  variant = "rectangular",
  animate = true,
  ...props
}: SkeletonProps & React.HTMLAttributes<HTMLDivElement>) {
  const variants = {
    rectangular: "rounded-none",
    circular: "rounded-full",
    text: "rounded-sm",
    rounded: "rounded-md"
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={cn(
        "bg-muted",
        animate && "animate-pulse",
        variants[variant],
        className
      )}
      style={style}
      {...props}
    />
  );
}

// Skeleton for table rows
function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="px-6 py-4">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

// Skeleton for cards
function CardSkeleton({ 
  showHeader = true, 
  showFooter = false,
  className 
}: { 
  showHeader?: boolean; 
  showFooter?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("border rounded-lg p-6 space-y-4", className)}>
      {showHeader && (
        <div className="space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      )}
      
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {showFooter && (
        <div className="flex justify-between items-center pt-4">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      )}
    </div>
  );
}

// Skeleton for form fields
function FormFieldSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

// Skeleton for avatars
function AvatarSkeleton({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10", 
    lg: "h-12 w-12"
  };

  return <Skeleton className={cn(sizes[size], "rounded-full")} />;
}

// Skeleton for lists
function ListSkeleton({ 
  items = 5, 
  showAvatar = false,
  className 
}: { 
  items?: number; 
  showAvatar?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center space-x-3">
          {showAvatar && <AvatarSkeleton />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Skeleton for dashboard stats
function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="bg-card p-6 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-20" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Skeleton for table with header
function TableSkeleton({ 
  rows = 5, 
  columns = 4,
  showHeader = true 
}: { 
  rows?: number; 
  columns?: number;
  showHeader?: boolean;
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        {showHeader && (
          <thead className="bg-muted/50">
            <tr>
              {Array.from({ length: columns }).map((_, index) => (
                <th key={index} className="px-6 py-3 text-left">
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, index) => (
            <TableRowSkeleton key={index} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { 
  Skeleton,
  TableRowSkeleton,
  CardSkeleton,
  FormFieldSkeleton,
  AvatarSkeleton,
  ListSkeleton,
  StatsSkeleton,
  TableSkeleton
};
