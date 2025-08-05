import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Loader2, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  AlertCircle,
  CheckCircle,
  Info,
  Upload,
  Download
} from "lucide-react";

// Loading spinner component
interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

export function LoadingSpinner({ 
  size = "md", 
  className,
  text 
}: LoadingSpinnerProps) {
  const sizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8"
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="flex flex-col items-center space-y-2">
        <Loader2 className={cn("animate-spin text-primary-600", sizes[size])} />
        {text && (
          <p className="text-sm text-gray-600 animate-pulse">{text}</p>
        )}
      </div>
    </div>
  );
}

// Full page loading overlay
export function LoadingOverlay({ 
  isVisible, 
  message = "로딩 중...",
  progress,
  showProgress = false 
}: { 
  isVisible: boolean; 
  message?: string;
  progress?: number;
  showProgress?: boolean;
}) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-sm mx-4">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <LoadingSpinner size="lg" />
            <div className="space-y-2">
              <p className="font-medium">{message}</p>
              {showProgress && progress !== undefined && (
                <div className="space-y-1">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">{Math.round(progress)}%</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Inline loading state
export function InlineLoading({ 
  message = "로딩 중...",
  className 
}: { 
  message?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center space-x-2 py-4", className)}>
      <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
      <span className="text-sm text-gray-600">{message}</span>
    </div>
  );
}

// Button loading state
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export function LoadingButton({
  loading = false,
  loadingText,
  children,
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      disabled={disabled || loading}
      className={className}
      {...props}
    >
      {loading && (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      )}
      {loading ? (loadingText || children) : children}
    </Button>
  );
}

// Network status indicator
export function NetworkStatus() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm">
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-3">
          <div className="flex items-center space-x-2">
            <WifiOff className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700">
              인터넷 연결이 끊어졌습니다
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// File upload progress
interface UploadProgressProps {
  files: Array<{
    name: string;
    progress: number;
    status: "uploading" | "completed" | "error";
    error?: string;
  }>;
  onRetry?: (fileName: string) => void;
  onCancel?: (fileName: string) => void;
}

export function UploadProgress({ files, onRetry, onCancel }: UploadProgressProps) {
  if (files.length === 0) return null;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-sm font-medium">파일 업로드</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {files.map((file, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="truncate flex-1 mr-2">{file.name}</span>
              <div className="flex items-center space-x-2">
                {file.status === "uploading" && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                )}
                {file.status === "completed" && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {file.status === "error" && (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-xs text-gray-500">
                  {file.progress}%
                </span>
              </div>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  file.status === "completed" && "bg-green-500",
                  file.status === "uploading" && "bg-blue-500",
                  file.status === "error" && "bg-red-500"
                )}
                style={{ width: `${file.progress}%` }}
              />
            </div>

            {file.status === "error" && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-red-600">{file.error}</p>
                <div className="flex space-x-1">
                  {onRetry && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRetry(file.name)}
                      className="h-6 px-2 text-xs"
                    >
                      재시도
                    </Button>
                  )}
                  {onCancel && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onCancel(file.name)}
                      className="h-6 px-2 text-xs"
                    >
                      취소
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Lazy loading wrapper
interface LazyLoadingProps {
  isLoading: boolean;
  error?: Error | null;
  retry?: () => void;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  height?: string | number;
}

export function LazyLoading({
  isLoading,
  error,
  retry,
  children,
  fallback,
  height = "200px"
}: LazyLoadingProps) {
  if (error) {
    return (
      <div 
        className="flex items-center justify-center border rounded-lg"
        style={{ height }}
      >
        <div className="text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-900">
              로딩 중 오류가 발생했습니다
            </p>
            <p className="text-xs text-gray-500">
              {error.message}
            </p>
          </div>
          {retry && (
            <Button size="sm" variant="outline" onClick={retry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              다시 시도
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div 
        className="flex items-center justify-center"
        style={{ height }}
      >
        {fallback || <LoadingSpinner />}
      </div>
    );
  }

  return <>{children}</>;
}

// Operation status indicator
interface OperationStatusProps {
  status: "idle" | "loading" | "success" | "error";
  successMessage?: string;
  errorMessage?: string;
  loadingMessage?: string;
  showIcon?: boolean;
  onDismiss?: () => void;
}

export function OperationStatus({
  status,
  successMessage = "작업이 완료되었습니다",
  errorMessage = "오류가 발생했습니다",
  loadingMessage = "처리 중...",
  showIcon = true,
  onDismiss
}: OperationStatusProps) {
  if (status === "idle") return null;

  const configs = {
    loading: {
      icon: Loader2,
      message: loadingMessage,
      className: "text-blue-600 bg-blue-50 border-blue-200",
      iconClassName: "animate-spin"
    },
    success: {
      icon: CheckCircle,
      message: successMessage,
      className: "text-green-600 bg-green-50 border-green-200",
      iconClassName: ""
    },
    error: {
      icon: AlertCircle,
      message: errorMessage,
      className: "text-red-600 bg-red-50 border-red-200",
      iconClassName: ""
    }
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <div className={cn("p-3 rounded-lg border flex items-center space-x-2", config.className)}>
      {showIcon && (
        <Icon className={cn("h-4 w-4 flex-shrink-0", config.iconClassName)} />
      )}
      <span className="text-sm font-medium flex-1">{config.message}</span>
      {onDismiss && (status === "success" || status === "error") && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onDismiss}
          className="h-6 w-6 p-0 text-current hover:bg-current/10"
        >
          ×
        </Button>
      )}
    </div>
  );
}

// Auto-save indicator
interface AutoSaveIndicatorProps {
  status: "idle" | "saving" | "saved" | "error";
  lastSaved?: Date;
  className?: string;
}

export function AutoSaveIndicator({ 
  status, 
  lastSaved,
  className 
}: AutoSaveIndicatorProps) {
  const configs = {
    idle: { text: "", icon: null, className: "" },
    saving: { 
      text: "저장 중...", 
      icon: Loader2, 
      className: "text-blue-600",
      animate: true 
    },
    saved: { 
      text: lastSaved ? `${lastSaved.toLocaleTimeString()}에 저장됨` : "저장됨", 
      icon: CheckCircle, 
      className: "text-green-600" 
    },
    error: { 
      text: "저장 실패", 
      icon: AlertCircle, 
      className: "text-red-600" 
    }
  };

  const config = configs[status];
  if (status === "idle") return null;

  const Icon = config.icon;

  return (
    <div className={cn("flex items-center space-x-1 text-xs", config.className, className)}>
      {Icon && (
        <Icon 
          className={cn("h-3 w-3", config.animate && "animate-spin")} 
          aria-hidden="true" 
        />
      )}
      <span>{config.text}</span>
    </div>
  );
}