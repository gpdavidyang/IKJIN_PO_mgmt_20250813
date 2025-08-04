# UI 개선 프로젝트 가이드 (1단계 & 2단계)

## 📋 프로젝트 개요

Purchase Order Management System을 엔터프라이즈급 UI/UX로 업그레이드하는 프로젝트입니다.

### 목표
- 전문적이고 일관된 디자인 시스템 구축
- 사용성과 가독성 향상
- 모던하고 직관적인 인터페이스 구현

## 🎯 1단계: 디자인 시스템 기초 (1-2주)

### Task 1.1: Enhanced Color System 구축

#### 구현 파일 생성
```typescript
// client/src/styles/design-tokens.css
:root {
  /* Primary Brand Colors - 파란색 계열 */
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-200: #bfdbfe;
  --color-primary-300: #93c5fd;
  --color-primary-400: #60a5fa;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
  --color-primary-800: #1e40af;
  --color-primary-900: #1e3a8a;

  /* Semantic Colors */
  --color-success-50: #f0fdf4;
  --color-success-100: #dcfce7;
  --color-success-200: #bbf7d0;
  --color-success-500: #22c55e;
  --color-success-600: #16a34a;
  --color-success-700: #15803d;
  
  --color-warning-50: #fffbeb;
  --color-warning-100: #fef3c7;
  --color-warning-200: #fde68a;
  --color-warning-500: #f59e0b;
  --color-warning-600: #d97706;
  --color-warning-700: #b45309;
  
  --color-error-50: #fef2f2;
  --color-error-100: #fee2e2;
  --color-error-200: #fecaca;
  --color-error-500: #ef4444;
  --color-error-600: #dc2626;
  --color-error-700: #b91c1c;
  
  /* Neutral Grays */
  --color-gray-25: #fcfcfd;
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;
  
  /* Shadows */
  --shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}
```

#### Tailwind Config 업데이트
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          // ... 모든 색상 매핑
        }
      }
    }
  }
}
```

### Task 1.2: Typography Scale 구현

#### Typography 컴포넌트 생성
```typescript
// client/src/components/ui/typography.tsx
import { cn } from "@/lib/utils";

export const Typography = {
  H1: ({ children, className }) => (
    <h1 className={cn("text-3xl font-bold tracking-tight text-gray-900", className)}>
      {children}
    </h1>
  ),
  H2: ({ children, className }) => (
    <h2 className={cn("text-2xl font-semibold tracking-tight text-gray-900", className)}>
      {children}
    </h2>
  ),
  H3: ({ children, className }) => (
    <h3 className={cn("text-xl font-semibold text-gray-900", className)}>
      {children}
    </h3>
  ),
  H4: ({ children, className }) => (
    <h4 className={cn("text-lg font-semibold text-gray-900", className)}>
      {children}
    </h4>
  ),
  Body: ({ children, className }) => (
    <p className={cn("text-base text-gray-700 leading-relaxed", className)}>
      {children}
    </p>
  ),
  Small: ({ children, className }) => (
    <p className={cn("text-sm text-gray-600", className)}>
      {children}
    </p>
  ),
  Caption: ({ children, className }) => (
    <span className={cn("text-xs text-gray-500", className)}>
      {children}
    </span>
  )
};
```

### Task 1.3: Spacing System 구축

#### Spacing Utilities 생성
```typescript
// client/src/styles/spacing.css
:root {
  /* Spacing Scale */
  --space-0: 0;
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */
  
  /* Container Widths */
  --container-xs: 20rem;    /* 320px */
  --container-sm: 24rem;    /* 384px */
  --container-md: 28rem;    /* 448px */
  --container-lg: 32rem;    /* 512px */
  --container-xl: 36rem;    /* 576px */
  --container-2xl: 42rem;   /* 672px */
  --container-3xl: 48rem;   /* 768px */
  --container-4xl: 56rem;   /* 896px */
  --container-5xl: 64rem;   /* 1024px */
  --container-6xl: 72rem;   /* 1152px */
  --container-7xl: 80rem;   /* 1280px */
  
  /* Border Radius */
  --radius-sm: 0.125rem;    /* 2px */
  --radius-md: 0.375rem;    /* 6px */
  --radius-lg: 0.5rem;      /* 8px */
  --radius-xl: 0.75rem;     /* 12px */
  --radius-2xl: 1rem;       /* 16px */
  --radius-full: 9999px;
}
```

### Task 1.4: UI_STANDARDS.md 업데이트

기존 UI_STANDARDS.md를 새로운 디자인 시스템으로 업데이트합니다.

## 🏗️ 2단계: 핵심 컴포넌트 개선 (3-4주)

### Task 2.1: Enhanced Dashboard Cards

#### StatCard 컴포넌트
```typescript
// client/src/components/dashboard/stat-card.tsx
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  change?: {
    value: string;
    trend: 'up' | 'down';
  };
  className?: string;
}

export function StatCard({ title, value, icon: Icon, change, className }: StatCardProps) {
  return (
    <Card className={cn(
      "relative overflow-hidden bg-gradient-to-br from-white to-gray-50",
      "border border-gray-200 hover:shadow-lg transition-all duration-200",
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {change && (
              <div className={cn(
                "flex items-center text-xs font-medium",
                change.trend === 'up' ? 'text-green-600' : 'text-red-600'
              )}>
                {change.trend === 'up' ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {change.value}
              </div>
            )}
          </div>
          <div className="p-3 bg-primary-100 rounded-full">
            <Icon className="w-6 h-6 text-primary-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### Chart Card 컴포넌트
```typescript
// client/src/components/dashboard/chart-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Download, Maximize2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onExport?: () => void;
  onFullscreen?: () => void;
}

export function ChartCard({ 
  title, 
  subtitle, 
  children, 
  onExport, 
  onFullscreen 
}: ChartCardProps) {
  return (
    <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onFullscreen && (
              <DropdownMenuItem onClick={onFullscreen}>
                <Maximize2 className="mr-2 h-4 w-4" />
                전체화면
              </DropdownMenuItem>
            )}
            {onExport && (
              <DropdownMenuItem onClick={onExport}>
                <Download className="mr-2 h-4 w-4" />
                내보내기
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="pt-6">
        {children}
      </CardContent>
    </Card>
  );
}
```

### Task 2.2: Enhanced Table Component

#### DataTable 컴포넌트
```typescript
// client/src/components/ui/data-table.tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DataTableProps<T> {
  columns: {
    key: string;
    label: string;
    width?: string;
    align?: 'left' | 'center' | 'right';
    render?: (value: any, row: T) => React.ReactNode;
  }[];
  data: T[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T>({ 
  columns, 
  data, 
  loading, 
  onRowClick,
  emptyMessage = "데이터가 없습니다" 
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 border-b border-gray-200">
              {columns.map((column) => (
                <TableHead 
                  key={column.key}
                  className={cn(
                    "text-xs font-semibold text-gray-700 uppercase tracking-wider",
                    column.width,
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12">
        <p className="text-center text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 border-b border-gray-200">
            {columns.map((column) => (
              <TableHead 
                key={column.key}
                className={cn(
                  "px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider",
                  column.width,
                  column.align === 'center' && 'text-center',
                  column.align === 'right' && 'text-right'
                )}
              >
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow 
              key={index}
              className={cn(
                "border-b border-gray-100 hover:bg-gray-50 transition-colors",
                onRowClick && "cursor-pointer"
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <TableCell 
                  key={column.key}
                  className={cn(
                    "px-6 py-4 whitespace-nowrap text-sm text-gray-900",
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                >
                  {column.render 
                    ? column.render(row[column.key], row)
                    : row[column.key]
                  }
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

### Task 2.3: Enhanced Form Components

#### FormField 컴포넌트
```typescript
// client/src/components/ui/form-field.tsx
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function FormField({ 
  label, 
  error, 
  hint,
  required,
  className,
  id,
  ...props 
}: FormFieldProps) {
  const fieldId = id || `field-${label.replace(/\s+/g, '-').toLowerCase()}`;
  
  return (
    <div className="space-y-2">
      <Label 
        htmlFor={fieldId} 
        className="text-sm font-medium text-gray-700"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <div className="relative">
        <Input
          id={fieldId}
          className={cn(
            "transition-all duration-200",
            error 
              ? "border-red-500 focus:border-red-500 focus:ring-red-500 pr-10" 
              : "focus:border-primary-500 focus:ring-primary-500",
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined
          }
          {...props}
        />
        {error && (
          <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
        )}
      </div>
      {error && (
        <p id={`${fieldId}-error`} className="text-sm text-red-600 flex items-center" role="alert">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${fieldId}-hint`} className="text-sm text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
}
```

### Task 2.4: Status Badge 개선

#### StatusBadge 컴포넌트
```typescript
// client/src/components/ui/status-badge.tsx
import { cn } from "@/lib/utils";

const statusConfig = {
  // Purchase Order Status
  draft: {
    label: '임시저장',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    dotColor: 'bg-gray-500'
  },
  pending: {
    label: '대기중',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    dotColor: 'bg-yellow-500'
  },
  approved: {
    label: '승인됨',
    color: 'bg-green-100 text-green-800 border-green-200',
    dotColor: 'bg-green-500'
  },
  sent: {
    label: '발송됨',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    dotColor: 'bg-blue-500'
  },
  completed: {
    label: '완료',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    dotColor: 'bg-purple-500'
  },
  rejected: {
    label: '반려',
    color: 'bg-red-100 text-red-800 border-red-200',
    dotColor: 'bg-red-500'
  },
  // Project Status
  active: {
    label: '진행중',
    color: 'bg-green-100 text-green-800 border-green-200',
    dotColor: 'bg-green-500'
  },
  on_hold: {
    label: '보류',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    dotColor: 'bg-orange-500'
  },
  planning: {
    label: '계획중',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    dotColor: 'bg-blue-500'
  },
  cancelled: {
    label: '취소됨',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    dotColor: 'bg-gray-500'
  }
};

interface StatusBadgeProps {
  status: keyof typeof statusConfig;
  size?: 'sm' | 'default' | 'lg';
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({ 
  status, 
  size = 'default', 
  showDot = true,
  className 
}: StatusBadgeProps) {
  const config = statusConfig[status];
  
  if (!config) {
    return null;
  }
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    default: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  };
  
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border font-medium",
      config.color,
      sizeClasses[size],
      className
    )}>
      {showDot && (
        <span className={cn("w-2 h-2 rounded-full mr-2", config.dotColor)} />
      )}
      {config.label}
    </span>
  );
}
```

## 📝 구현 체크리스트

### 1단계 구현 순서
- [ ] design-tokens.css 파일 생성 및 CSS 변수 정의
- [ ] typography.tsx 컴포넌트 생성
- [ ] spacing.css 파일 생성
- [ ] tailwind.config.js 업데이트
- [ ] UI_STANDARDS.md 문서 업데이트
- [ ] 모든 컴포넌트에서 새로운 토큰 사용하도록 마이그레이션

### 2단계 구현 순서
- [ ] stat-card.tsx 컴포넌트 생성
- [ ] chart-card.tsx 컴포넌트 생성
- [ ] data-table.tsx 컴포넌트 생성
- [ ] form-field.tsx 컴포넌트 생성
- [ ] status-badge.tsx 컴포넌트 생성
- [ ] 대시보드 페이지 리팩토링
- [ ] 테이블을 사용하는 모든 페이지 업데이트
- [ ] 폼을 사용하는 모든 페이지 업데이트

## 🧪 테스트 계획

### 컴포넌트 테스트
- 각 새로운 컴포넌트에 대한 단위 테스트 작성
- 접근성 테스트 (스크린 리더, 키보드 네비게이션)
- 다양한 브라우저에서의 시각적 테스트

### 통합 테스트
- 페이지별 통합 테스트
- 반응형 디자인 테스트
- 성능 테스트 (렌더링 속도, 번들 크기)

## 📚 참고 자료

### 디자인 시스템 예시
- [Ant Design](https://ant.design/)
- [Material Design](https://material.io/)
- [Tailwind UI](https://tailwindui.com/)

### 접근성 가이드라인
- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA](https://www.w3.org/WAI/ARIA/apg/)

### 성능 최적화
- [Web Vitals](https://web.dev/vitals/)
- [React Performance](https://react.dev/learn/render-and-commit)