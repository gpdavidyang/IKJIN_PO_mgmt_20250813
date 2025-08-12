import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Trash2, 
  MoreVertical, 
  ChevronRight,
  Star,
  StarOff,
  Heart,
  HeartOff,
  Bookmark,
  BookmarkOff,
} from "lucide-react";

// Swipe-to-action card
interface SwipeActionCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    color: string;
    action: () => void;
  };
  rightAction?: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    color: string;
    action: () => void;
  };
  className?: string;
}

export function SwipeActionCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  className,
}: SwipeActionCardProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsActive(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isActive) return;

    currentX.current = e.touches[0].clientX;
    const diffX = currentX.current - startX.current;
    
    // Limit swipe distance
    const maxSwipe = 100;
    const limitedDiffX = Math.max(-maxSwipe, Math.min(maxSwipe, diffX));
    
    setTranslateX(limitedDiffX);
  };

  const handleTouchEnd = () => {
    setIsActive(false);
    const diffX = currentX.current - startX.current;
    const threshold = 50;

    if (Math.abs(diffX) > threshold) {
      if (diffX > 0 && rightAction) {
        rightAction.action();
      } else if (diffX < 0 && leftAction) {
        leftAction.action();
      }
    }

    // Reset position
    setTranslateX(0);
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Left action background */}
      {leftAction && translateX < -10 && (
        <div className={cn(
          "absolute inset-y-0 right-0 flex items-center justify-center px-6 text-white font-medium",
          leftAction.color
        )}>
          <leftAction.icon className="h-5 w-5 mr-2" />
          {leftAction.label}
        </div>
      )}

      {/* Right action background */}
      {rightAction && translateX > 10 && (
        <div className={cn(
          "absolute inset-y-0 left-0 flex items-center justify-center px-6 text-white font-medium",
          rightAction.color
        )}>
          <rightAction.icon className="h-5 w-5 mr-2" />
          {rightAction.label}
        </div>
      )}

      {/* Main card */}
      <div
        ref={cardRef}
        className={cn(
          "transform transition-transform duration-200 ease-out touch-pan-y",
          className
        )}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

// Touch-friendly action button
interface TouchActionButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "destructive" | "secondary";
  size?: "default" | "lg";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function TouchActionButton({
  children,
  onClick,
  variant = "default",
  size = "default",
  disabled = false,
  loading = false,
  className,
}: TouchActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      variant={variant}
      disabled={disabled || loading}
      className={cn(
        // Minimum touch target size (44px)
        "min-h-[44px] min-w-[44px]",
        size === "lg" && "min-h-[52px] text-base px-6",
        // Enhanced touch feedback
        "active:scale-95 transition-transform duration-75",
        // Better spacing for touch
        "px-4 py-3",
        className
      )}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
      ) : (
        children
      )}
    </Button>
  );
}

// Long press action component
interface LongPressActionProps {
  children: React.ReactNode;
  onLongPress: () => void;
  longPressDuration?: number;
  confirmationTitle?: string;
  confirmationMessage?: string;
  className?: string;
}

export function LongPressAction({
  children,
  onLongPress,
  longPressDuration = 500,
  confirmationTitle = "작업 확인",
  confirmationMessage = "이 작업을 실행하시겠습니까?",
  className,
}: LongPressActionProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = () => {
    setIsPressed(true);
    timeoutRef.current = setTimeout(() => {
      setShowConfirmation(true);
      setIsPressed(false);
    }, longPressDuration);
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleConfirm = () => {
    onLongPress();
    setShowConfirmation(false);
  };

  return (
    <>
      <div
        className={cn(
          "transition-all duration-75",
          isPressed && "scale-95 opacity-80",
          className
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >
        {children}
      </div>

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmationTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmationMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Pull-to-refresh component
interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void> | void;
  refreshThreshold?: number;
  className?: string;
}

export function PullToRefresh({
  children,
  onRefresh,
  refreshThreshold = 80,
  className,
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;

    const currentY = e.touches[0].clientY;
    const diffY = currentY - startY.current;

    if (diffY > 0) {
      e.preventDefault();
      setIsPulling(true);
      setPullDistance(Math.min(diffY * 0.5, refreshThreshold * 1.2));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= refreshThreshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setIsPulling(false);
    setPullDistance(0);
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      {(isPulling || isRefreshing) && (
        <div
          className={cn(
            "absolute top-0 left-0 right-0 z-10 flex items-center justify-center bg-primary-50 text-primary-600 transition-all duration-200",
            isRefreshing ? "h-12" : "h-0"
          )}
          style={{ 
            transform: `translateY(${isPulling ? pullDistance - refreshThreshold : 0}px)`,
          }}
        >
          <div className="flex items-center gap-2 py-3">
            {isRefreshing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent" />
                <span className="text-sm font-medium">새로고침 중...</span>
              </>
            ) : (
              <span className="text-sm font-medium">
                {pullDistance >= refreshThreshold ? "놓아서 새로고침" : "아래로 당겨서 새로고침"}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div
        className="transition-transform duration-200"
        style={{ 
          transform: `translateY(${isPulling ? pullDistance : isRefreshing ? refreshThreshold * 0.6 : 0}px)` 
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Touch-friendly toggle buttons
interface TouchToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: React.ComponentType<{ className?: string }>;
  checkedIcon?: React.ComponentType<{ className?: string }>;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function TouchToggle({
  checked,
  onChange,
  icon: Icon,
  checkedIcon: CheckedIcon,
  label,
  disabled = false,
  className,
}: TouchToggleProps) {
  const ActiveIcon = CheckedIcon || Icon;
  
  return (
    <TouchActionButton
      onClick={() => !disabled && onChange(!checked)}
      variant={checked ? "default" : "secondary"}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2",
        checked && "bg-primary-600 text-white hover:bg-primary-700",
        className
      )}
    >
      {ActiveIcon && (
        <ActiveIcon className="h-4 w-4" />
      )}
      {label && <span>{label}</span>}
    </TouchActionButton>
  );
}

// Common toggle button variants
export const TouchToggles = {
  Favorite: ({ checked, onChange, disabled }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) => (
    <TouchToggle
      checked={checked}
      onChange={onChange}
      icon={StarOff}
      checkedIcon={Star}
      disabled={disabled}
      className={checked ? "text-yellow-500" : ""}
    />
  ),
  
  Like: ({ checked, onChange, disabled }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) => (
    <TouchToggle
      checked={checked}
      onChange={onChange}
      icon={HeartOff}
      checkedIcon={Heart}
      disabled={disabled}
      className={checked ? "text-red-500" : ""}
    />
  ),
  
  Bookmark: ({ checked, onChange, disabled }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) => (
    <TouchToggle
      checked={checked}
      onChange={onChange}
      icon={BookmarkOff}
      checkedIcon={Bookmark}
      disabled={disabled}
      className={checked ? "text-blue-500" : ""}
    />
  ),
};