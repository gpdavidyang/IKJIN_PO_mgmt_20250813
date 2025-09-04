import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi, WifiOff, Clock, CheckCircle } from 'lucide-react';
import { useWebSocketContext } from '@/contexts/websocket-context';
import { cn } from '@/lib/utils';

export function WebSocketStatus({ className }: { className?: string }) {
  const { connected, authenticated, connecting, error } = useWebSocketContext();

  // Don't show anything in production (Vercel doesn't support WebSockets)
  const isDevelopment = window.location.hostname === 'localhost';
  if (!isDevelopment) return null;

  const getStatusInfo = () => {
    if (error) {
      return {
        icon: <WifiOff className="h-3 w-3" />,
        text: 'WebSocket Error',
        variant: 'destructive' as const,
        tooltip: `연결 오류: ${error}`
      };
    }
    
    if (connecting) {
      return {
        icon: <Clock className="h-3 w-3 animate-pulse" />,
        text: 'Connecting',
        variant: 'secondary' as const,
        tooltip: 'WebSocket에 연결하는 중...'
      };
    }
    
    if (connected && authenticated) {
      return {
        icon: <CheckCircle className="h-3 w-3" />,
        text: 'Live',
        variant: 'default' as const,
        tooltip: '실시간 업데이트 활성화됨'
      };
    }
    
    if (connected && !authenticated) {
      return {
        icon: <Wifi className="h-3 w-3" />,
        text: 'Connected',
        variant: 'secondary' as const,
        tooltip: 'WebSocket 연결됨, 인증 대기 중'
      };
    }
    
    return {
      icon: <WifiOff className="h-3 w-3" />,
      text: 'Offline',
      variant: 'outline' as const,
      tooltip: 'WebSocket 연결되지 않음'
    };
  };

  const status = getStatusInfo();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant={status.variant} 
          className={cn(
            'flex items-center gap-1.5 text-xs font-medium transition-all',
            status.variant === 'default' && 'bg-green-100 text-green-700 border-green-300',
            className
          )}
        >
          {status.icon}
          <span>{status.text}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{status.tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function WebSocketNotificationCount({ className }: { className?: string }) {
  const { notifications } = useWebSocketContext();
  
  const unreadCount = notifications.length;
  
  if (unreadCount === 0) return null;

  return (
    <Badge 
      variant="destructive" 
      className={cn(
        'ml-2 px-2 py-0.5 text-xs font-medium min-w-[1.5rem] h-5 flex items-center justify-center',
        className
      )}
    >
      {unreadCount > 99 ? '99+' : unreadCount}
    </Badge>
  );
}