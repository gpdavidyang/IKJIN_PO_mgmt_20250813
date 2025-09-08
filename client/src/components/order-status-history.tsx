import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
  History, 
  Plus, 
  Edit, 
  Check, 
  CheckCheck,
  CheckCircle,
  X, 
  XCircle,
  Send, 
  Mail, 
  RefreshCw, 
  FileText, 
  Paperclip, 
  Trash2, 
  Package,
  Activity,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";

interface OrderHistoryEntry {
  id: number;
  orderId: number;
  user: {
    id: string;
    name: string;
    role?: string;
    position?: string;
  };
  action: string;
  actionText: string;
  actionIcon: string;
  actionColor: string;
  changes?: any;
  createdAt: string;
}

interface OrderStatusHistoryProps {
  orderId: number;
}

const iconMap: Record<string, any> = {
  'Plus': Plus,
  'Edit': Edit,
  'Check': Check,
  'CheckCheck': CheckCheck,
  'CheckCircle': CheckCircle,
  'X': X,
  'XCircle': XCircle,
  'Send': Send,
  'Mail': Mail,
  'RefreshCw': RefreshCw,
  'FileText': FileText,
  'Paperclip': Paperclip,
  'Trash2': Trash2,
  'Package': Package,
  'Activity': Activity,
};

const colorClasses: Record<string, string> = {
  'gray': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  'blue': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'green': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'teal': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  'red': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'indigo': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  'purple': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'cyan': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  'orange': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

const borderColorClasses: Record<string, string> = {
  'gray': 'border-gray-300 dark:border-gray-600',
  'blue': 'border-blue-300 dark:border-blue-600',
  'green': 'border-green-300 dark:border-green-600',
  'teal': 'border-teal-300 dark:border-teal-600',
  'red': 'border-red-300 dark:border-red-600',
  'indigo': 'border-indigo-300 dark:border-indigo-600',
  'purple': 'border-purple-300 dark:border-purple-600',
  'cyan': 'border-cyan-300 dark:border-cyan-600',
  'orange': 'border-orange-300 dark:border-orange-600',
};

export function OrderStatusHistory({ orderId }: OrderStatusHistoryProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const { data: history, isLoading, error } = useQuery({
    queryKey: [`/api/orders/${orderId}/status-history`],
    queryFn: async () => {
      return await apiRequest("GET", `/api/orders/${orderId}/status-history`);
    },
  });

  const toggleExpanded = (id: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          상태 변경 이력을 불러오는 중 오류가 발생했습니다.
        </AlertDescription>
      </Alert>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>변경 이력이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
      
      {/* History items */}
      <div className="space-y-4">
        {history.map((entry: OrderHistoryEntry, index: number) => {
          const Icon = iconMap[entry.actionIcon] || Activity;
          const isExpanded = expandedItems.has(entry.id);
          const hasChanges = entry.changes && Object.keys(entry.changes).length > 0;
          
          return (
            <div key={entry.id} className="relative flex items-start">
              {/* Icon circle */}
              <div 
                className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white dark:border-gray-900 ${colorClasses[entry.actionColor] || colorClasses.gray}`}
              >
                <Icon className="h-6 w-6" />
              </div>
              
              {/* Content */}
              <div className="ml-4 flex-1">
                <div 
                  className={`rounded-lg border p-4 ${borderColorClasses[entry.actionColor] || borderColorClasses.gray} bg-white dark:bg-gray-800`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-lg">
                          {entry.actionText}
                        </span>
                        {index === 0 && (
                          <Badge variant="outline" className="text-xs">
                            최신
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{entry.user.name}</span>
                          {entry.user.position && (
                            <span className="text-xs">({entry.user.position})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {format(new Date(entry.createdAt), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Expand button */}
                    {hasChanges && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(entry.id)}
                        className="ml-2"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                  
                  {/* Changes details (expandable) */}
                  {hasChanges && isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-sm space-y-1">
                        <div className="font-medium mb-2">변경 내용:</div>
                        <pre className="bg-gray-50 dark:bg-gray-900 p-2 rounded text-xs overflow-x-auto">
                          {JSON.stringify(entry.changes, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}