# TOSS Design System Implementation Guide

## Overview
This document outlines the implementation of the TOSS-inspired ultra-high density design system for the Purchase Order Management System. The design focuses on maximizing information density while maintaining clarity and usability, specifically optimized for iPad Pro (1366px) displays.

## Design Philosophy

### Core Principles
1. **Maximum Information Density**: Display as much relevant information as possible without scrolling
2. **Minimal Visual Noise**: Reduce decorative elements, focus on content
3. **Fast Interaction**: Quick access to actions with minimal clicks
4. **Clear Hierarchy**: Use size and spacing to indicate importance
5. **Responsive Precision**: Optimized layouts for specific breakpoints

### Key Metrics
- **Base spacing unit**: 2px (compared to standard 4px)
- **Typography scale**: 11px-18px (compressed from 12px-24px)
- **Component heights**: 24px-36px (reduced from 32px-48px)
- **Page padding**: 8px (reduced from 24px)
- **Card padding**: 8px (reduced from 16px)

## Component Library

### 1. Layout Components

#### TossCard
Ultra-compact card container with three variants:
```tsx
<TossCard variant="ultra-compact">
  // Content with 6px padding
</TossCard>
```

#### Grid System
High-density responsive grid:
```tsx
// 6-column grid on desktop, 1-column on mobile
<div className="grid grid-cols-1 xl:grid-cols-6 gap-1">
  {/* Grid items */}
</div>
```

### 2. Data Display Components

#### TossKPI
Compact KPI widget for dashboard metrics:
```tsx
<TossKPI
  icon={Clock}
  iconColor="text-yellow-600"
  iconBg="bg-yellow-100"
  value={42}
  label="승인대기"
  onClick={() => navigate('/orders?status=pending')}
/>
```

#### TossListItem
Ultra-compact list item for data lists:
```tsx
<TossListItem
  title="프로젝트명"
  subtitle="12건"
  value="₩1.2M"
  onClick={() => navigate('/project/1')}
  index={1}
/>
```

### 3. Table Components

#### TossTable
High-density table with compressed spacing:
```tsx
<TossTable size="xs">
  <TossTableHeader>
    <TossTableRow>
      <TossTableCell as="th">발주번호</TossTableCell>
      <TossTableCell as="th">금액</TossTableCell>
    </TossTableRow>
  </TossTableHeader>
  <TossTableBody>
    <TossTableRow>
      <TossTableCell>PO-2024-001</TossTableCell>
      <TossTableCell>₩1,234,000</TossTableCell>
    </TossTableRow>
  </TossTableBody>
</TossTable>
```

## Page Implementations

### 1. Dashboard (Ultra-High Density)
- **Layout**: 6-column KPI row + 3-column main content
- **Spacing**: 8px page padding, 4px gaps
- **Charts**: 140px height (reduced from 300px)
- **Lists**: 6 items visible without scrolling

### 2. Orders List
- **Table**: 15+ rows visible on iPad Pro
- **Filters**: Collapsible advanced filters
- **Actions**: Icon-only buttons to save space
- **Status**: Color-coded badges

### 3. Detail Pages
- **Header**: 32px height with inline actions
- **Sections**: 8px padding, 4px spacing
- **Forms**: 28px input height, minimal labels

## CSS Architecture

### Design Tokens
Located in `/client/src/styles/toss-design-system.css`:
```css
:root {
  --toss-space-1: 2px;
  --toss-space-2: 4px;
  --toss-text-xs: 11px;
  --toss-h-8: 32px;
}
```

### Utility Classes
- `.toss-truncate`: Text truncation
- `.toss-hover-bg`: Subtle hover state
- `.toss-transition`: Smooth transitions
- `.toss-border`: Consistent borders

## Implementation Patterns

### 1. Responsive Breakpoints
```tsx
// Mobile-first approach with iPad Pro optimization
className="p-2 md:p-3 xl:p-2" // Tighter on large screens
```

### 2. Typography Hierarchy
```tsx
// Page title
<h1 className="text-sm font-semibold">제목</h1>

// Section header
<h2 className="text-xs font-semibold">섹션</h2>

// Body text
<p className="text-xs text-gray-600">본문</p>
```

### 3. Color Usage
- **Primary actions**: Blue (#3B82F6)
- **Success states**: Green badges
- **Warning states**: Yellow badges
- **Amounts**: Blue text for emphasis
- **Backgrounds**: Minimal gray variations

### 4. Interactive States
```tsx
// Hover state
className="hover:bg-gray-50 hover:shadow-sm"

// Active state
className="border-blue-500 bg-blue-50"

// Disabled state
className="opacity-50 cursor-not-allowed"
```

## Migration Guide

### Phase 1: Core Components
1. Import TOSS components library
2. Replace standard cards with TossCard
3. Update spacing classes (p-6 → p-2)

### Phase 2: Page Layouts
1. Reduce page padding
2. Increase column density
3. Compress vertical spacing

### Phase 3: Typography
1. Reduce font sizes
2. Tighten line heights
3. Minimize heading sizes

### Phase 4: Interactive Elements
1. Reduce button heights
2. Compress form inputs
3. Minimize click targets

## Performance Considerations

### 1. Render Optimization
- Use React.memo for list items
- Implement virtual scrolling for long lists
- Lazy load chart components

### 2. Bundle Size
- Tree-shake unused components
- Use dynamic imports for large pages
- Minimize CSS with PurgeCSS

### 3. Interaction Speed
- Reduce animation durations (150ms)
- Implement optimistic updates
- Use skeleton states

## Accessibility

### 1. Minimum Touch Targets
Despite smaller visual size, maintain 44px touch targets:
```tsx
<button className="h-7 px-3 -m-2 p-2">
  {/* Visual: 28px, Touch: 44px */}
</button>
```

### 2. Contrast Ratios
- Maintain WCAG AA compliance
- Use darker grays for small text
- Ensure badge readability

### 3. Keyboard Navigation
- Visible focus indicators
- Logical tab order
- Keyboard shortcuts for common actions

## Best Practices

### Do's
- ✅ Use consistent spacing tokens
- ✅ Prioritize information hierarchy
- ✅ Test on actual iPad Pro devices
- ✅ Maintain touch target sizes
- ✅ Use system fonts for performance

### Don'ts
- ❌ Add decorative elements
- ❌ Use large images or icons
- ❌ Create excessive whitespace
- ❌ Use animations longer than 200ms
- ❌ Sacrifice usability for density

## Component Checklist

- [x] TossCard - Ultra-compact card container
- [x] TossKPI - Dashboard metric widget
- [x] TossListItem - Compact list component
- [x] TossTable - High-density table
- [x] TossBadge - Status indicators
- [x] TossSectionHeader - Page sections
- [x] TossChartContainer - Chart wrapper
- [x] TossEmptyState - No data states
- [x] TossSkeleton - Loading states

## Future Enhancements

1. **Dark Mode Support**: Implement TOSS-style dark theme
2. **Animation Library**: Micro-interactions for feedback
3. **Advanced Components**: Calendar, date picker, modals
4. **Mobile Optimization**: Bottom sheets, swipe gestures
5. **A11y Enhancements**: Screen reader optimizations