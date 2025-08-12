import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  Bug, 
  Mail,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  showDetails: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // 에러 로깅
    this.logError(error, errorInfo);
    
    // 부모 컴포넌트에 에러 알림
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: localStorage.getItem('userId') || 'anonymous'
    };

    // 실제 환경에서는 에러 로깅 서비스로 전송
    console.error('Error Boundary caught an error:', errorData);
    
    // 로컬 스토리지에 에러 기록 저장 (디버깅용)
    try {
      const existingErrors = JSON.parse(localStorage.getItem('errorLogs') || '[]');
      existingErrors.push(errorData);
      // 최대 10개까지만 저장
      if (existingErrors.length > 10) {
        existingErrors.shift();
      }
      localStorage.setItem('errorLogs', JSON.stringify(existingErrors));
    } catch (storageError) {
      console.warn('Failed to store error log:', storageError);
    }
  };

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  private handleAutoRetry = () => {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    this.retryTimeout = setTimeout(() => {
      if (this.state.retryCount < this.maxRetries) {
        this.handleRetry();
      }
    }, 2000);
  };

  private handleReportError = () => {
    const { error, errorInfo } = this.state;
    if (!error) return;

    const errorReport = {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    // 이메일 클라이언트 열기
    const subject = encodeURIComponent('발주서 시스템 오류 신고');
    const body = encodeURIComponent(`
오류가 발생했습니다:

에러 메시지: ${error.message}

발생 시간: ${new Date().toLocaleString('ko-KR')}
페이지 URL: ${window.location.href}

기술적 세부사항:
${JSON.stringify(errorReport, null, 2)}

추가 설명:
[여기에 오류 발생 전 수행한 작업을 설명해주세요]
    `);
    
    window.open(`mailto:support@company.com?subject=${subject}&body=${body}`);
  };

  private getErrorType = (error: Error): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return '네트워크 오류';
    } else if (message.includes('syntax') || message.includes('parse')) {
      return '구문 오류';
    } else if (message.includes('permission') || message.includes('unauthorized')) {
      return '권한 오류';
    } else if (message.includes('timeout')) {
      return '시간 초과 오류';
    } else {
      return '시스템 오류';
    }
  };

  private getSuggestion = (error: Error): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return '인터넷 연결을 확인하고 다시 시도해주세요.';
    } else if (message.includes('permission') || message.includes('unauthorized')) {
      return '로그인을 다시 시도하거나 관리자에게 문의하세요.';
    } else if (message.includes('timeout')) {
      return '서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.';
    } else {
      return '페이지를 새로고침하거나 잠시 후 다시 시도해주세요.';
    }
  };

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      const canRetry = this.state.retryCount < this.maxRetries;
      const errorType = error ? this.getErrorType(error) : '알 수 없는 오류';
      const suggestion = error ? this.getSuggestion(error) : '';

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-6 h-6" />
                시스템 오류가 발생했습니다
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 오류 요약 */}
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <div className="space-y-2">
                    <div className="font-medium">{errorType}</div>
                    <div className="text-sm">{suggestion}</div>
                  </div>
                </AlertDescription>
              </Alert>

              {/* 재시도 정보 */}
              {this.state.retryCount > 0 && (
                <div className="text-sm text-gray-600 bg-gray-100 p-3 rounded-lg">
                  재시도 횟수: {this.state.retryCount}/{this.maxRetries}
                </div>
              )}

              {/* 액션 버튼들 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {canRetry && (
                  <Button 
                    onClick={this.handleRetry}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    다시 시도
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/'}
                >
                  <Home className="w-4 h-4 mr-2" />
                  홈으로 이동
                </Button>
                
                <Button
                  variant="outline"
                  onClick={this.handleReportError}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  오류 신고
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  페이지 새로고침
                </Button>
              </div>

              {/* 자동 재시도 */}
              {canRetry && this.state.retryCount === 0 && (
                <div className="text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={this.handleAutoRetry}
                  >
                    2초 후 자동 재시도
                  </Button>
                </div>
              )}

              {/* 기술적 세부사항 (접을 수 있음) */}
              <div className="border-t pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                  className="w-full justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Bug className="w-4 h-4" />
                    기술적 세부사항
                  </span>
                  {this.state.showDetails ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
                
                {this.state.showDetails && (
                  <div className="mt-3 p-3 bg-gray-100 rounded-lg text-sm font-mono">
                    <div className="space-y-2">
                      <div>
                        <strong>오류 메시지:</strong>
                        <div className="text-red-600 break-all">
                          {error?.message || '알 수 없는 오류'}
                        </div>
                      </div>
                      
                      <div>
                        <strong>발생 시간:</strong>
                        <div>{new Date().toLocaleString('ko-KR')}</div>
                      </div>
                      
                      <div>
                        <strong>페이지 URL:</strong>
                        <div className="break-all">{window.location.href}</div>
                      </div>
                      
                      {error?.stack && (
                        <details className="mt-2">
                          <summary className="cursor-pointer font-medium">
                            스택 트레이스
                          </summary>
                          <pre className="mt-2 text-xs overflow-auto max-h-32 bg-white p-2 rounded border">
                            {error.stack}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 도움말 정보 */}
              <div className="text-center text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">
                <p>문제가 지속될 경우 시스템 관리자에게 문의하세요.</p>
                <p className="mt-1">
                  오류 ID: {Date.now().toString(36).toUpperCase()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;