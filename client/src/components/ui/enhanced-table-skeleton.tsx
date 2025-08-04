import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface EnhancedTableSkeletonProps {
  rows?: number;
  columns?: number;
  showPagination?: boolean;
}

export function EnhancedTableSkeleton({ 
  rows = 5, 
  columns = 6,
  showPagination = true 
}: EnhancedTableSkeletonProps) {
  return (
    <div className="w-full">
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {Array.from({ length: columns }).map((_, index) => (
                <th key={index} className="px-4 py-3 text-left">
                  <Skeleton className="h-4 w-24" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="px-4 py-3">
                    <Skeleton className="h-4 w-full max-w-xs" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPagination && (
        <div className="mt-4 flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-20" />
          </div>
          <Skeleton className="h-8 w-32" />
        </div>
      )}
    </div>
  );
}