import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, FileCheck, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AuthorityCheck } from '@shared/order-types';

interface CreateOrderButtonProps {
  onClick: () => void;
  userAuthority?: AuthorityCheck;
  orderAmount?: number;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}

export function CreateOrderButton({
  onClick,
  userAuthority,
  orderAmount = 0,
  loading = false,
  disabled = false,
  className,
  size = 'default'
}: CreateOrderButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClick = async () => {
    if (loading || disabled || isProcessing) return;
    
    setIsProcessing(true);
    try {
      await onClick();
    } finally {
      setIsProcessing(false);
    }
  };

  // 버튼 텍스트 결정
  const getButtonText = () => {
    if (loading || isProcessing) return '처리 중...';
    
    if (userAuthority?.canDirectApprove) {
      return '즉시 발주 처리';
    }
    
    if (userAuthority?.requiresApproval) {
      return '발주서 생성 및 승인 요청';
    }
    
    if (userAuthority?.bypassReason) {
      switch (userAuthority.bypassReason) {
        case 'amount_threshold':
          return '발주서 생성 (소액 자동승인)';
        case 'emergency':
          return '긴급 발주 처리';
        case 'excel_automation':
          return '엑셀 자동 처리';
        default:
          return '발주서 생성';
      }
    }
    
    return '발주서 생성';
  };

  // 버튼 아이콘 결정
  const getButtonIcon = () => {
    if (loading || isProcessing) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    
    if (userAuthority?.canDirectApprove) {
      return <Zap className="h-4 w-4" />;
    }
    
    if (userAuthority?.requiresApproval) {
      return <FileCheck className="h-4 w-4" />;
    }
    
    return <Plus className="h-4 w-4" />;
  };

  // 버튼 스타일 결정
  const getButtonStyle = () => {
    if (userAuthority?.canDirectApprove) {
      return 'bg-green-600 hover:bg-green-700 text-white';
    }
    
    if (userAuthority?.requiresApproval) {
      return 'bg-amber-600 hover:bg-amber-700 text-white';
    }
    
    return 'bg-blue-600 hover:bg-blue-700 text-white';
  };

  // 툴팁 메시지
  const getTooltipMessage = () => {
    if (userAuthority?.canDirectApprove && userAuthority.directApproveLimit) {
      return `직접 승인 가능 (한도: ${userAuthority.directApproveLimit.toLocaleString()}원)`;
    }
    
    if (userAuthority?.requiresApproval && userAuthority.nextApprover) {
      return '승인이 필요한 발주입니다';
    }
    
    return null;
  };

  const tooltipMessage = getTooltipMessage();

  return (
    <div className="relative inline-block">
      <Button
        onClick={handleClick}
        disabled={disabled || loading || isProcessing}
        className={cn(
          getButtonStyle(),
          'transition-all duration-200',
          size === 'sm' && 'h-9 px-3 text-sm',
          size === 'lg' && 'h-11 px-8 text-lg',
          className
        )}
        size={size}
        title={tooltipMessage || undefined}
      >
        <span className="flex items-center gap-2">
          {getButtonIcon()}
          {getButtonText()}
        </span>
      </Button>
      
      {/* Quick status indicator */}
      {userAuthority?.canDirectApprove && (
        <div className="absolute -top-1 -right-1">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
        </div>
      )}
    </div>
  );
}