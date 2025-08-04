import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  RefreshCw,
  Home,
  ArrowLeft,
  Wifi,
  WifiOff,
  Shield,
  Clock,
  HelpCircle,
  ExternalLink,
  Copy,
  Check
} from "lucide-react";

// Generic error boundary
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error; retry: () => void }> },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error('Error caught by boundary:', error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback || ErrorFallback;
      return <Fallback error={this.state.error!} retry={this.retry} />;
    }

    return this.props.children;
  }
}

// Default error fallback component
export function ErrorFallback({ 
  error, 
  retry 
}: { 
  error: Error; 
  retry: () => void 
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <CardTitle>오류가 발생했습니다</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
          </p>
          
          <details className="text-sm">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
              기술적 세부사항
            </summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
              {error.message}
            </pre>
          </details>

          <div className="flex space-x-2">
            <Button onClick={retry} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              다시 시도
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
              className="flex-1"
            >
              <Home className="h-4 w-4 mr-2" />
              홈으로
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// API error display
interface APIErrorProps {
  error: {
    message: string;
    status?: number;
    code?: string;
    details?: any;
  };
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function APIError({ 
  error, 
  onRetry, 
  onDismiss,
  className 
}: APIErrorProps) {
  const getErrorMessage = () => {
    if (error.status === 401) return "인증이 필요합니다. 다시 로그인해주세요.";
    if (error.status === 403) return "권한이 없습니다.";
    if (error.status === 404) return "요청한 리소스를 찾을 수 없습니다.";
    if (error.status === 429) return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
    if (error.status && error.status >= 500) return "서버 오류가 발생했습니다.";
    return error.message || "알 수 없는 오류가 발생했습니다.";
  };

  const getActionButton = () => {
    if (error.status === 401) {
      return (
        <Button size="sm" onClick={() => window.location.href = '/login'}>
          로그인
        </Button>
      );
    }
    if (onRetry) {
      return (
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          다시 시도
        </Button>
      );
    }
    return null;
  };

  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <div className="flex-1">
        <AlertTitle>
          오류 {error.status && `(${error.status})`}
        </AlertTitle>
        <AlertDescription>
          {getErrorMessage()}
        </AlertDescription>
      </div>
      <div className="flex items-center space-x-2">
        {getActionButton()}
        {onDismiss && (
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            ×
          </Button>
        )}
      </div>
    </Alert>
  );
}

// Network error component
export function NetworkError({ 
  onRetry,
  className 
}: { 
  onRetry?: () => void;
  className?: string;
}) {
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

  return (
    <Alert variant="destructive" className={className}>
      {isOnline ? (
        <Wifi className="h-4 w-4" />
      ) : (
        <WifiOff className="h-4 w-4" />
      )}
      <div className="flex-1">
        <AlertTitle>
          {isOnline ? "연결 오류" : "인터넷 연결 끊김"}
        </AlertTitle>
        <AlertDescription>
          {isOnline 
            ? "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요."
            : "인터넷 연결을 확인하고 다시 시도해주세요."
          }
        </AlertDescription>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          다시 시도
        </Button>
      )}
    </Alert>
  );
}

// Form validation error
interface FormErrorProps {
  errors: Record<string, string | string[]>;
  className?: string;
}

export function FormError({ errors, className }: FormErrorProps) {
  const errorCount = Object.keys(errors).length;
  if (errorCount === 0) return null;

  const flatErrors = Object.entries(errors).flatMap(([field, messages]) => {
    const messageArray = Array.isArray(messages) ? messages : [messages];
    return messageArray.map(message => ({ field, message }));
  });

  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <div>
        <AlertTitle>
          입력값을 확인해주세요 ({errorCount}개 오류)
        </AlertTitle>
        <AlertDescription>
          <ul className="mt-2 space-y-1">
            {flatErrors.map((error, index) => (
              <li key={index} className="text-sm">
                • {error.message}
              </li>
            ))}
          </ul>
        </AlertDescription>
      </div>
    </Alert>
  );
}

// Permission error
export function PermissionError({ 
  requiredRole,
  currentRole,
  onRequestAccess,
  className 
}: { 
  requiredRole?: string;
  currentRole?: string;
  onRequestAccess?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("text-center py-12", className)}>
      <div className="max-w-md mx-auto">
        <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          접근 권한이 없습니다
        </h3>
        <p className="text-gray-600 mb-6">
          이 페이지에 접근하려면 
          {requiredRole && ` ${requiredRole} 권한이`} 필요합니다.
          {currentRole && ` 현재 권한: ${currentRole}`}
        </p>
        <div className="flex justify-center space-x-3">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            뒤로 가기
          </Button>
          {onRequestAccess && (
            <Button onClick={onRequestAccess}>
              권한 요청
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Timeout error
export function TimeoutError({ 
  onRetry,
  timeout = 30,
  className 
}: { 
  onRetry?: () => void;
  timeout?: number;
  className?: string;
}) {
  return (
    <Alert variant="destructive" className={className}>
      <Clock className="h-4 w-4" />
      <div className="flex-1">
        <AlertTitle>요청 시간 초과</AlertTitle>
        <AlertDescription>
          요청이 {timeout}초를 초과했습니다. 네트워크 연결을 확인하고 다시 시도해주세요.
        </AlertDescription>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          다시 시도
        </Button>
      )}
    </Alert>
  );
}

// 404 Page not found
export function NotFoundError({ 
  resource = "페이지",
  suggestions = [],
  onGoHome,
  className 
}: { 
  resource?: string;
  suggestions?: string[];
  onGoHome?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("text-center py-12", className)}>
      <div className="max-w-md mx-auto">
        <HelpCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {resource}을(를) 찾을 수 없습니다
        </h3>
        <p className="text-gray-600 mb-6">
          요청하신 {resource}이(가) 존재하지 않거나 삭제되었습니다.
        </p>
        
        {suggestions.length > 0 && (
          <div className="text-left mb-6">
            <p className="text-sm font-medium text-gray-900 mb-2">다음을 확인해보세요:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              {suggestions.map((suggestion, index) => (
                <li key={index}>• {suggestion}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-center space-x-3">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            뒤로 가기
          </Button>
          <Button onClick={onGoHome || (() => window.location.href = '/')}>
            <Home className="h-4 w-4 mr-2" />
            홈으로
          </Button>
        </div>
      </div>
    </div>
  );
}

// Error logger and reporter
export function ErrorReporter({ 
  error,
  onReport,
  showDetails = false 
}: { 
  error: Error;
  onReport?: (error: Error, details: string) => void;
  showDetails?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);
  const [details, setDetails] = React.useState("");

  const errorInfo = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(errorInfo, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleReport = () => {
    if (onReport) {
      onReport(error, details);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span>오류 보고</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>
            {error.message}
          </AlertDescription>
        </Alert>

        {showDetails && (
          <details className="text-sm">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-800 mb-2">
              기술적 세부사항 보기
            </summary>
            <pre className="p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(errorInfo, null, 2)}
            </pre>
          </details>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              추가 정보 (선택사항)
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              rows={3}
              placeholder="오류가 발생하기 전에 어떤 작업을 하고 계셨나요?"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>

          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="flex items-center space-x-2"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span>{copied ? "복사완료" : "오류정보 복사"}</span>
            </Button>

            {onReport && (
              <Button onClick={handleReport} size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                오류 보고
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}