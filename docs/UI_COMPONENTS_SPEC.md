# UI Components Specification
> Excel 업로드 시스템의 모든 UI 컴포넌트 상세 명세

## 📐 Design System

### Color Palette
```scss
// Primary Colors
$primary-500: #3B82F6;  // Main actions
$primary-600: #2563EB;  // Hover state
$primary-100: #DBEAFE;  // Background

// Status Colors
$success: #10B981;      // Valid, Complete
$warning: #F59E0B;      // Needs attention
$error: #EF4444;        // Invalid, Error
$info: #3B82F6;         // Information

// Neutral Colors
$gray-50: #F9FAFB;
$gray-100: #F3F4F6;
$gray-200: #E5E7EB;
$gray-300: #D1D5DB;
$gray-400: #9CA3AF;
$gray-500: #6B7280;
$gray-600: #4B5563;
$gray-700: #374151;
$gray-800: #1F2937;
$gray-900: #111827;
```

### Typography
```scss
// Font Family
$font-primary: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
$font-mono: 'JetBrains Mono', monospace;

// Font Sizes
$text-xs: 12px;
$text-sm: 14px;
$text-base: 16px;
$text-lg: 18px;
$text-xl: 20px;
$text-2xl: 24px;

// Font Weights
$font-normal: 400;
$font-medium: 500;
$font-semibold: 600;
$font-bold: 700;
```

### Spacing
```scss
$space-1: 4px;
$space-2: 8px;
$space-3: 12px;
$space-4: 16px;
$space-5: 20px;
$space-6: 24px;
$space-8: 32px;
$space-10: 40px;
$space-12: 48px;
```

---

## 🧩 Core Components

## 1. SmartDropZone

### Purpose
파일 업로드를 위한 Drag & Drop 영역 컴포넌트

### Visual Design
```
┌─────────────────────────────────────────┐
│                                         │
│         📁                              │
│    Excel 파일을 여기에 놓으세요          │
│       또는 클릭하여 선택                  │
│                                         │
│    [ 파일 선택 ] [ 샘플 다운로드 ]       │
│                                         │
└─────────────────────────────────────────┘

States:
- Default: Gray border, light background
- Hover: Blue border, blue tint
- Active: Green border, green tint
- Error: Red border, red tint
```

### Props Interface
```typescript
interface SmartDropZoneProps {
  onFileUpload: (file: File) => Promise<void>;
  onError?: (error: Error) => void;
  maxSize?: number; // in bytes, default: 50MB
  acceptedFormats?: string[]; // default: ['.xlsx', '.xls', '.xlsm']
  multiple?: boolean; // default: false
  disabled?: boolean;
  showPreview?: boolean;
  className?: string;
}
```

### Component Implementation
```tsx
const SmartDropZone: React.FC<SmartDropZoneProps> = ({
  onFileUpload,
  onError,
  maxSize = 50 * 1024 * 1024,
  acceptedFormats = ['.xlsx', '.xls', '.xlsm'],
  multiple = false,
  disabled = false,
  showPreview = true,
  className
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  return (
    <div
      className={cn(
        "relative rounded-lg border-2 border-dashed p-8",
        "transition-all duration-200 ease-in-out",
        isDragging && "border-blue-500 bg-blue-50",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && "hover:border-gray-400",
        className
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Content */}
    </div>
  );
};
```

### Interaction States
1. **Idle**: 기본 상태, 파일 선택 대기
2. **Dragging**: 파일 드래그 중
3. **Uploading**: 업로드 진행 중 (Progress bar 표시)
4. **Success**: 업로드 완료
5. **Error**: 오류 발생

---

## 2. ValidationStatusPanel

### Purpose
실시간 검증 상태를 시각적으로 표시하는 패널

### Visual Design
```
┌──────────────────────────────────────────┐
│  검증 상태                     자동 저장 ✓│
│  ────────────────────────────────────── │
│                                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │  15  │ │  3   │ │  2   │ │  20  │  │
│  │  🟢  │ │  🟡  │ │  🔴  │ │  📊  │  │
│  │ 완료  │ │ 확인  │ │ 수정  │ │ 전체  │  │
│  └──────┘ └──────┘ └──────┘ └──────┘  │
│                                          │
│  진행률: ████████████░░░░░░ 75%          │
└──────────────────────────────────────────┘
```

### Props Interface
```typescript
interface ValidationStatusPanelProps {
  sessionId: string;
  totalItems: number;
  validItems: number;
  warningItems: number;
  errorItems: number;
  onFilterChange?: (filter: 'all' | 'valid' | 'warning' | 'error') => void;
  autoSaveEnabled?: boolean;
  className?: string;
}

interface StatusCardProps {
  count: number;
  label: string;
  color: 'green' | 'yellow' | 'red' | 'gray';
  icon: React.ReactNode;
  onClick?: () => void;
}
```

### Component Structure
```tsx
const ValidationStatusPanel: React.FC<ValidationStatusPanelProps> = (props) => {
  const progress = (props.validItems / props.totalItems) * 100;

  return (
    <Card className={cn("p-4", props.className)}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">검증 상태</h3>
        {props.autoSaveEnabled && (
          <Badge variant="outline" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            자동 저장
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <StatusCard
          count={props.validItems}
          label="완료"
          color="green"
          icon={<CheckCircle />}
          onClick={() => props.onFilterChange?.('valid')}
        />
        {/* Other status cards */}
      </div>

      <Progress value={progress} className="h-2" />
    </Card>
  );
};
```

### Real-time Updates
- WebSocket 연결을 통한 실시간 업데이트
- Optimistic UI 업데이트
- 애니메이션 전환 효과

---

## 3. SmartTable

### Purpose
인라인 편집이 가능한 고성능 데이터 테이블

### Visual Design
```
┌─────────────────────────────────────────────┐
│ 🔍 검색...          [필터 ▼] [컬럼 ▼] [⚙️]  │
├─────────────────────────────────────────────┤
│ □ │상태│프로젝트│거래처│카테고리│금액│작업  │
├───┼────┼───────┼──────┼────────┼────┼──────┤
│ □ │ 🟢 │강남타워│삼성.. │건축자재│15M │ ⋮   │
│ □ │ 🟡 │판교센터│LG건설│전기설비│8M  │ ⋮   │
│ □ │ 🔴 │인천공장│ABC.. │[선택▼] │12M │ ⋮   │
└─────────────────────────────────────────────┘

Inline Edit Mode:
┌─────────────────────────┐
│ ABC건설                 │
│ ┌─────────────────────┐ │
│ │ ABC종합건설 (90%)   │ │
│ │ ABM건설 (70%)       │ │
│ │ + 신규 등록         │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

### Props Interface
```typescript
interface SmartTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onEdit?: (rowIndex: number, field: string, value: any) => void;
  onRowSelect?: (selectedRows: T[]) => void;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enableColumnVisibility?: boolean;
  enablePagination?: boolean;
  pageSize?: number;
  validationErrors?: Record<string, ValidationError>;
  isLoading?: boolean;
  className?: string;
}

interface ColumnDef<T> {
  id: string;
  header: string;
  accessorKey: keyof T;
  cell?: (props: CellContext<T>) => React.ReactNode;
  enableSorting?: boolean;
  enableEditing?: boolean;
  editComponent?: React.ComponentType<EditCellProps>;
  validation?: (value: any) => ValidationResult;
}
```

### Key Features
```typescript
// Inline Editing
const EditableCell: React.FC<EditCellProps> = ({
  value,
  onChange,
  validation,
  suggestions
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  if (isEditing) {
    return (
      <AutoCompleteInput
        value={tempValue}
        onChange={setTempValue}
        onBlur={() => {
          onChange(tempValue);
          setIsEditing(false);
        }}
        suggestions={suggestions}
        validation={validation}
      />
    );
  }

  return (
    <div onClick={() => setIsEditing(true)}>
      {value}
    </div>
  );
};
```

### Virtual Scrolling
```typescript
// 대용량 데이터 처리를 위한 가상 스크롤
const VirtualTable = () => {
  const rowVirtualizer = useVirtual({
    parentRef,
    size: rows.length,
    estimateSize: useCallback(() => 40, []),
    overscan: 10
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${rowVirtualizer.totalSize}px` }}>
        {rowVirtualizer.virtualItems.map(virtualRow => (
          <TableRow
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`
            }}
          />
        ))}
      </div>
    </div>
  );
};
```

---

## 4. AutoCompleteInput

### Purpose
실시간 자동 완성 기능을 제공하는 입력 컴포넌트

### Visual Design
```
┌─────────────────────────────┐
│ 삼성건ㅣ                     │
├─────────────────────────────┤
│ 🔍 검색 결과                 │
│ ─────────────────────────── │
│ 삼성건설 (주)    ⭐ 추천     │
│ 삼성건설산업                 │
│ 삼성건축사무소               │
│ + "삼성건" 신규 등록         │
└─────────────────────────────┘
```

### Props Interface
```typescript
interface AutoCompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions?: Suggestion[];
  onSearch?: (query: string) => Promise<Suggestion[]>;
  placeholder?: string;
  debounceMs?: number; // default: 300
  minChars?: number; // default: 2
  maxSuggestions?: number; // default: 10
  allowCustomValue?: boolean;
  validation?: (value: string) => ValidationResult;
  className?: string;
}

interface Suggestion {
  id: string;
  value: string;
  label?: string;
  metadata?: Record<string, any>;
  confidence?: number; // 0-100
  isRecommended?: boolean;
}
```

### Key Features
```typescript
const AutoCompleteInput: React.FC<AutoCompleteInputProps> = (props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localSuggestions, setLocalSuggestions] = useState<Suggestion[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce(async (query: string) => {
      if (props.onSearch && query.length >= props.minChars) {
        const results = await props.onSearch(query);
        setLocalSuggestions(results.slice(0, props.maxSuggestions));
      }
    }, props.debounceMs),
    [props.onSearch, props.minChars, props.maxSuggestions, props.debounceMs]
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        setHighlightedIndex(prev => 
          Math.min(prev + 1, localSuggestions.length - 1)
        );
        break;
      case 'ArrowUp':
        setHighlightedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        if (highlightedIndex >= 0) {
          selectSuggestion(localSuggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className="relative">
      <Input
        value={props.value}
        onChange={(e) => {
          props.onChange(e.target.value);
          debouncedSearch(e.target.value);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
      />
      
      {isOpen && localSuggestions.length > 0 && (
        <SuggestionsList
          suggestions={localSuggestions}
          highlightedIndex={highlightedIndex}
          onSelect={selectSuggestion}
        />
      )}
    </div>
  );
};
```

---

## 5. AICorrectionsPanel

### Purpose
AI 자동 수정 제안을 표시하고 선택적으로 적용하는 패널

### Visual Design
```
┌──────────────────────────────────────────────┐
│ 🤖 AI 자동 수정 제안           5개 발견      │
│ ────────────────────────────────────────── │
│                                              │
│ ┌──────────────────────────────────────────┐│
│ │ ☑️ 거래처명 정규화 (3개)                  ││
│ │   • "LG건설" → "LG건설(주)"              ││
│ │   • "삼성건설" → "삼성물산 건설부문"       ││
│ │   • "ABC건설" → "ABC종합건설"            ││
│ └──────────────────────────────────────────┘│
│                                              │
│ ┌──────────────────────────────────────────┐│
│ │ ☑️ 이메일 주소 수정 (1개)                 ││
│ │   • "abc@company" → "abc@company.com"    ││
│ └──────────────────────────────────────────┘│
│                                              │
│ ┌──────────────────────────────────────────┐│
│ │ ☑️ 카테고리 자동 분류 (1개)               ││
│ │   • 빈 카테고리 → "건축 > 철골 > 구조재"  ││
│ └──────────────────────────────────────────┘│
│                                              │
│ [ 선택 항목 적용 ] [ 모두 적용 ] [ 닫기 ]   │
└──────────────────────────────────────────────┘
```

### Props Interface
```typescript
interface AICorrectionsPanel {
  corrections: AICorrection[];
  onApply: (corrections: AICorrection[]) => void;
  onDismiss: () => void;
  isLoading?: boolean;
  className?: string;
}

interface AICorrection {
  id: string;
  type: 'vendor' | 'email' | 'category' | 'date' | 'duplicate';
  field: string;
  rowIndex: number;
  originalValue: any;
  suggestedValue: any;
  confidence: number; // 0-100
  reason?: string;
  selected?: boolean;
}

interface CorrectionGroup {
  type: string;
  label: string;
  icon: React.ReactNode;
  corrections: AICorrection[];
  allSelected: boolean;
}
```

### Component Implementation
```tsx
const AICorrectionsPanel: React.FC<AICorrectionsPanel> = ({
  corrections,
  onApply,
  onDismiss,
  isLoading
}) => {
  const [selectedCorrections, setSelectedCorrections] = useState<Set<string>>(
    new Set(corrections.filter(c => c.confidence > 80).map(c => c.id))
  );

  const groupedCorrections = useMemo(() => {
    return corrections.reduce((groups, correction) => {
      const type = correction.type;
      if (!groups[type]) {
        groups[type] = {
          type,
          label: getCorrectionLabel(type),
          icon: getCorrectionIcon(type),
          corrections: []
        };
      }
      groups[type].corrections.push(correction);
      return groups;
    }, {} as Record<string, CorrectionGroup>);
  }, [corrections]);

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold">AI 자동 수정 제안</h3>
          <Badge>{corrections.length}개 발견</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="h-96">
        {Object.values(groupedCorrections).map(group => (
          <CorrectionGroup
            key={group.type}
            group={group}
            selectedCorrections={selectedCorrections}
            onToggle={handleToggle}
          />
        ))}
      </ScrollArea>

      <div className="flex gap-2 mt-4">
        <Button
          onClick={() => {
            const selected = corrections.filter(c => 
              selectedCorrections.has(c.id)
            );
            onApply(selected);
          }}
          disabled={selectedCorrections.size === 0}
        >
          선택 항목 적용 ({selectedCorrections.size})
        </Button>
        <Button
          variant="outline"
          onClick={() => onApply(corrections)}
        >
          모두 적용
        </Button>
      </div>
    </Card>
  );
};
```

---

## 6. SmartNotification

### Purpose
컨텍스트 인식 알림 및 안내 메시지 표시

### Visual Design
```
Success Notification:
┌──────────────────────────────────────┐
│ ✅ 15개 항목이 자동으로 검증되었습니다  │
│    3개 항목 확인이 필요합니다.          │
│                              [확인]   │
└──────────────────────────────────────┘

Warning Notification:
┌──────────────────────────────────────┐
│ ⚠️ 중복 항목 발견                      │
│    동일한 발주 항목이 2개 있습니다.      │
│                    [병합] [무시] [x]  │
└──────────────────────────────────────┘

Info Tooltip (on hover):
┌─────────────────────────────┐
│ 💡 팁: Tab 키로 다음 필드로    │
│     이동할 수 있습니다.        │
└─────────────────────────────┘
```

### Props Interface
```typescript
interface SmartNotificationProps {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message?: string;
  actions?: NotificationAction[];
  duration?: number; // ms, 0 for persistent
  position?: 'top' | 'bottom' | 'top-right' | 'bottom-right';
  onClose?: () => void;
}

interface NotificationAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'ghost';
}
```

---

## 7. ProgressIndicator

### Purpose
전체 프로세스의 진행 상황을 표시

### Visual Design
```
Linear Progress:
┌────────────────────────────────────┐
│ 파일 처리 중...                     │
│ ████████████████░░░░░░ 75%         │
│ 15/20 항목 완료                     │
└────────────────────────────────────┘

Circular Progress:
     ╭─────╮
    ╱       ╲
   │   75%   │
   │  15/20  │
    ╲       ╱
     ╰─────╯
```

### Props Interface
```typescript
interface ProgressIndicatorProps {
  value: number; // 0-100
  max?: number;
  label?: string;
  sublabel?: string;
  variant?: 'linear' | 'circular';
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning';
  showPercentage?: boolean;
  animated?: boolean;
  className?: string;
}
```

---

## 8. ValidationTooltip

### Purpose
호버 시 검증 오류나 도움말을 표시하는 툴팁

### Visual Design
```
Error Tooltip:
        ┌──────────────────────┐
        │ ❌ 올바른 이메일이     │
        │    아닙니다.          │
        │ 예: user@company.com │
        └──────▼───────────────┘
         [abc@company]

Help Tooltip:
        ┌──────────────────────┐
        │ 💡 Enter: 저장        │
        │    Tab: 다음 필드     │
        │    Esc: 취소         │
        └──────▼───────────────┘
```

### Props Interface
```typescript
interface ValidationTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  type?: 'error' | 'warning' | 'info' | 'help';
  trigger?: 'hover' | 'focus' | 'click';
  placement?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}
```

---

## 📱 Responsive Design

### Breakpoints
```scss
$mobile: 640px;
$tablet: 768px;
$desktop: 1024px;
$wide: 1280px;
```

### Mobile Adaptations

#### SmartTable Mobile View
```
Mobile (< 768px):
┌─────────────────────────┐
│ 🟢 강남타워 프로젝트      │
│ 거래처: 삼성물산         │
│ 금액: 15,000,000원      │
│ [상세] [수정]           │
├─────────────────────────┤
│ 🟡 판교센터 프로젝트      │
│ 거래처: LG건설          │
│ 금액: 8,000,000원       │
│ [상세] [수정]           │
└─────────────────────────┘
```

#### Stacked Layout
```tsx
const ResponsiveLayout = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    return (
      <div className="flex flex-col gap-4">
        <SmartDropZone />
        <ValidationStatusPanel />
        <SmartTable variant="cards" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-3">
        <SmartDropZone />
        <ValidationStatusPanel />
      </div>
      <div className="col-span-9">
        <SmartTable />
      </div>
    </div>
  );
};
```

---

## 🎨 Animation & Transitions

### Micro-interactions
```scss
// Hover Effects
.hover-lift {
  transition: transform 0.2s ease;
  &:hover {
    transform: translateY(-2px);
  }
}

// Status Changes
.status-transition {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

// Loading States
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.loading-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

### Framer Motion Animations
```tsx
// Stagger Animation for List Items
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100
    }
  }
};

// Success Animation
const successVariants = {
  initial: { scale: 0 },
  animate: { 
    scale: [0, 1.2, 1],
    transition: { duration: 0.5 }
  }
};
```

---

## ♿ Accessibility

### ARIA Labels
```tsx
<button
  aria-label="파일 업로드"
  aria-describedby="upload-help"
  aria-invalid={hasError}
  aria-busy={isUploading}
>
  업로드
</button>
```

### Keyboard Navigation
```typescript
// Focus Management
const useFocusTrap = (containerRef: RefObject<HTMLElement>) => {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef]);
};
```

### Screen Reader Support
```tsx
// Live Regions for Dynamic Updates
<div role="status" aria-live="polite" aria-atomic="true">
  {validationMessage}
</div>

// Progress Announcements
<div role="progressbar" 
     aria-valuenow={progress} 
     aria-valuemin={0} 
     aria-valuemax={100}
     aria-label="업로드 진행률">
  {progress}%
</div>
```

---

## 🧪 Testing Specifications

### Unit Tests
```typescript
describe('SmartTable', () => {
  it('should render data correctly', () => {
    const { getByText } = render(
      <SmartTable data={mockData} columns={columns} />
    );
    expect(getByText('강남타워')).toBeInTheDocument();
  });

  it('should handle inline editing', async () => {
    const onEdit = jest.fn();
    const { getByText } = render(
      <SmartTable data={mockData} columns={columns} onEdit={onEdit} />
    );
    
    fireEvent.click(getByText('ABC건설'));
    fireEvent.change(getByRole('textbox'), { 
      target: { value: 'ABC종합건설' } 
    });
    fireEvent.blur(getByRole('textbox'));
    
    expect(onEdit).toHaveBeenCalledWith(0, 'vendor', 'ABC종합건설');
  });
});
```

### Integration Tests
```typescript
describe('Excel Upload Flow', () => {
  it('should complete full upload and validation flow', async () => {
    const file = new File(['content'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const { getByText, getByLabelText } = render(<ExcelUploadPage />);
    
    // Upload file
    const input = getByLabelText('파일 업로드');
    fireEvent.change(input, { target: { files: [file] } });
    
    // Wait for validation
    await waitFor(() => {
      expect(getByText('검증 완료')).toBeInTheDocument();
    });
    
    // Apply AI corrections
    fireEvent.click(getByText('AI 자동 수정'));
    fireEvent.click(getByText('모두 적용'));
    
    // Save
    fireEvent.click(getByText('발주서 생성'));
    
    await waitFor(() => {
      expect(getByText('생성 완료')).toBeInTheDocument();
    });
  });
});
```

---

## 📊 Performance Specifications

### Component Performance Metrics
| Component | Initial Render | Re-render | Memory |
|-----------|---------------|-----------|---------|
| SmartDropZone | < 50ms | < 20ms | < 5MB |
| SmartTable (100 rows) | < 200ms | < 50ms | < 20MB |
| SmartTable (1000 rows) | < 300ms | < 100ms | < 50MB |
| AutoCompleteInput | < 30ms | < 10ms | < 2MB |
| AICorrectionsPanel | < 100ms | < 30ms | < 10MB |

### Optimization Techniques
1. **React.memo** for expensive components
2. **useMemo** for complex calculations
3. **useCallback** for event handlers
4. **Virtual scrolling** for large lists
5. **Code splitting** for lazy loading
6. **Debouncing** for search inputs
7. **Optimistic updates** for better UX

---

## 📚 Component Library Export

```typescript
// index.ts
export { SmartDropZone } from './components/SmartDropZone';
export { ValidationStatusPanel } from './components/ValidationStatusPanel';
export { SmartTable } from './components/SmartTable';
export { AutoCompleteInput } from './components/AutoCompleteInput';
export { AICorrectionsPanel } from './components/AICorrectionsPanel';
export { SmartNotification } from './components/SmartNotification';
export { ProgressIndicator } from './components/ProgressIndicator';
export { ValidationTooltip } from './components/ValidationTooltip';

// Types
export type {
  SmartDropZoneProps,
  ValidationStatusPanelProps,
  SmartTableProps,
  AutoCompleteInputProps,
  AIirectionsPanelProps,
  SmartNotificationProps,
  ProgressIndicatorProps,
  ValidationTooltipProps
} from './types';
```

---

*Last Updated: 2024-09-04*  
*Version: 1.0.0*  
*Component Count: 8 Core Components*