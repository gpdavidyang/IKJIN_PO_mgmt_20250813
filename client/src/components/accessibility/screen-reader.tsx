import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Screen reader announcements
interface AnnouncementProps {
  message: string;
  priority?: "polite" | "assertive";
  clear?: boolean;
}

export function LiveAnnouncement({ message, priority = "polite", clear = true }: AnnouncementProps) {
  const announcementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (announcementRef.current && message) {
      announcementRef.current.textContent = message;
      
      if (clear) {
        const timer = setTimeout(() => {
          if (announcementRef.current) {
            announcementRef.current.textContent = "";
          }
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [message, clear]);

  return (
    <div
      ref={announcementRef}
      className="sr-only"
      aria-live={priority}
      aria-atomic="true"
    />
  );
}

// Screen reader only text
interface ScreenReaderOnlyProps {
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
}

export function ScreenReaderOnly({ 
  children, 
  as: Component = "span",
  className 
}: ScreenReaderOnlyProps) {
  return (
    <Component className={cn("sr-only", className)}>
      {children}
    </Component>
  );
}

// Enhanced form labels with error announcements
interface AccessibleLabelProps {
  htmlFor: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function AccessibleLabel({ 
  htmlFor, 
  required, 
  error, 
  children, 
  className 
}: AccessibleLabelProps) {
  return (
    <div className="space-y-1">
      <label 
        htmlFor={htmlFor}
        className={cn(
          "block text-sm font-medium text-gray-700",
          error && "text-red-700",
          className
        )}
      >
        {children}
        {required && (
          <span className="text-red-500 ml-1" aria-label="필수 항목">
            *
          </span>
        )}
      </label>
      {error && (
        <div 
          id={`${htmlFor}-error`}
          className="text-sm text-red-600"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}
    </div>
  );
}

// Accessible form field with comprehensive ARIA support
interface AccessibleFormFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  required?: boolean;
  error?: string;
  helperText?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function AccessibleFormField({
  id,
  label,
  type = "text",
  value,
  onChange,
  onBlur,
  required,
  error,
  helperText,
  placeholder,
  disabled,
  className
}: AccessibleFormFieldProps) {
  const hasError = !!error;
  const hasHelper = !!helperText;
  
  return (
    <div className={cn("space-y-1", className)}>
      <AccessibleLabel 
        htmlFor={id} 
        required={required} 
        error={error}
      >
        {label}
      </AccessibleLabel>
      
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        aria-invalid={hasError}
        aria-describedby={cn(
          hasError && `${id}-error`,
          hasHelper && `${id}-helper`
        ).trim() || undefined}
        className={cn(
          "block w-full px-3 py-2 border rounded-md shadow-sm",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
          "disabled:bg-gray-50 disabled:text-gray-500",
          hasError && "border-red-300 text-red-900 placeholder-red-300",
          !hasError && "border-gray-300 text-gray-900 placeholder-gray-400"
        )}
      />
      
      {helperText && (
        <div 
          id={`${id}-helper`}
          className="text-sm text-gray-600"
        >
          {helperText}
        </div>
      )}
    </div>
  );
}

// Progress announcements for screen readers
interface ProgressAnnouncementProps {
  value: number;
  max: number;
  label?: string;
  announceOnChange?: boolean;
}

export function ProgressAnnouncement({ 
  value, 
  max, 
  label = "진행률",
  announceOnChange = true 
}: ProgressAnnouncementProps) {
  const [announcement, setAnnouncement] = React.useState("");
  const previousValue = useRef(value);

  useEffect(() => {
    if (announceOnChange && value !== previousValue.current) {
      const percentage = Math.round((value / max) * 100);
      setAnnouncement(`${label} ${percentage}% 완료`);
      previousValue.current = value;
    }
  }, [value, max, label, announceOnChange]);

  return (
    <>
      <LiveAnnouncement message={announcement} />
      <div
        className="sr-only"
        aria-live="polite"
        aria-label={`${label} ${Math.round((value / max) * 100)}% 완료`}
      />
    </>
  );
}

// Status announcements for dynamic content
interface StatusAnnouncementProps {
  status: string;
  type?: "info" | "success" | "warning" | "error";
  announce?: boolean;
}

export function StatusAnnouncement({ 
  status, 
  type = "info", 
  announce = true 
}: StatusAnnouncementProps) {
  const [announcement, setAnnouncement] = React.useState("");
  
  useEffect(() => {
    if (announce && status) {
      const prefix = {
        info: "정보:",
        success: "성공:",
        warning: "경고:",
        error: "오류:"
      }[type];
      
      setAnnouncement(`${prefix} ${status}`);
    }
  }, [status, type, announce]);

  const priority = type === "error" ? "assertive" : "polite";

  return <LiveAnnouncement message={announcement} priority={priority} />;
}

// Loading state announcements
interface LoadingAnnouncementProps {
  isLoading: boolean;
  loadingText?: string;
  completeText?: string;
}

export function LoadingAnnouncement({ 
  isLoading, 
  loadingText = "로딩 중...", 
  completeText = "로딩 완료" 
}: LoadingAnnouncementProps) {
  const [announcement, setAnnouncement] = React.useState("");
  const wasLoading = useRef(false);

  useEffect(() => {
    if (isLoading && !wasLoading.current) {
      setAnnouncement(loadingText);
      wasLoading.current = true;
    } else if (!isLoading && wasLoading.current) {
      setAnnouncement(completeText);
      wasLoading.current = false;
    }
  }, [isLoading, loadingText, completeText]);

  return <LiveAnnouncement message={announcement} />;
}

// Table announcements for screen readers
interface TableAnnouncementProps {
  totalRows: number;
  visibleRows: number;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
}

export function TableAnnouncement({ 
  totalRows, 
  visibleRows, 
  sortColumn, 
  sortDirection 
}: TableAnnouncementProps) {
  const [announcement, setAnnouncement] = React.useState("");

  useEffect(() => {
    let message = `테이블: 총 ${totalRows}개 항목 중 ${visibleRows}개 표시`;
    
    if (sortColumn && sortDirection) {
      const sortText = sortDirection === "asc" ? "오름차순" : "내림차순";
      message += `. ${sortColumn} 기준 ${sortText} 정렬`;
    }
    
    setAnnouncement(message);
  }, [totalRows, visibleRows, sortColumn, sortDirection]);

  return <LiveAnnouncement message={announcement} />;
}

// Navigation announcements
interface NavigationAnnouncementProps {
  currentPage: string;
  totalPages?: number;
  currentPosition?: number;
}

export function NavigationAnnouncement({ 
  currentPage, 
  totalPages, 
  currentPosition 
}: NavigationAnnouncementProps) {
  const [announcement, setAnnouncement] = React.useState("");

  useEffect(() => {
    let message = `현재 페이지: ${currentPage}`;
    
    if (totalPages && currentPosition) {
      message += `. ${totalPages}페이지 중 ${currentPosition}페이지`;
    }
    
    setAnnouncement(message);
  }, [currentPage, totalPages, currentPosition]);

  return <LiveAnnouncement message={announcement} />;
}