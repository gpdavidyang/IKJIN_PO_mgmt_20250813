# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Purchase Order Management System (구매 발주 관리 시스템) for construction projects, built with React, Express, and PostgreSQL. The system manages purchase orders, vendors, projects, items, and approval workflows with role-based access control.

## Common Development Commands

```bash
# Install dependencies
npm install

# Run development server (starts both frontend and backend)
npm run dev

# Build for production
npm run build

# Run production server
npm start

# TypeScript type checking
npm run check

# Push database schema changes
npm run db:push

# Testing (requires test dependencies to be installed first)
# npm install --save-dev jest @types/jest ts-jest
# npm test
# npm run test:excel

# Debug scripts
node scripts/trace-execution-path.cjs  # Trace Excel processing execution path
node debug_extracted_file.cjs          # Debug extracted Excel file structure
```

## High-Level Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Shadcn/ui
- **Backend**: Express + TypeScript + Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with session-based auth
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form with Zod validation
- **Routing**: Wouter (frontend)

### Project Structure
```
client/               # React frontend application
├── src/
│   ├── components/  # UI components (organized by feature)
│   ├── pages/       # Route pages
│   ├── hooks/       # Custom React hooks
│   ├── services/    # API client services
│   └── types/       # TypeScript types

server/              # Express backend
├── routes/          # API route handlers
├── services/        # Business logic layer
└── utils/           # Server utilities

shared/              # Shared code between client and server
├── schema.ts        # Database schema (Drizzle ORM)
└── order-types.ts   # Shared type definitions
```

### Database Schema

Key tables defined in `shared/schema.ts`:
- **users**: User accounts with roles (field_worker, project_manager, hq_management, executive, admin)
- **purchaseOrders**: Main order records with **dual status system**
  - `orderStatus`: 발주상태 (draft, created, sent, delivered)
  - `approvalStatus`: 승인상태 (not_required, pending, approved, rejected)
  - `status`: DEPRECATED - 하위 호환성을 위해서만 유지
- **purchaseOrderItems**: Line items for orders
- **vendors**, **projects**, **items**, **companies**: Master data
- **approvalAuthorities**: Role-based approval limits
- **orderTemplates** & **templateFields**: Dynamic form generation
- **orderHistory**: Audit trail for all order changes
- **sessions**: Replit Auth session storage
- **ui_terms**: UI terminology management for Korean localization
- **positions**: Position/rank management for users

### Status Management System

**중요**: 본 시스템은 발주상태와 승인상태를 명확히 분리한 이중 상태 시스템을 사용합니다.
자세한 내용은 `STATUS_MANAGEMENT.md` 문서를 참조하세요.

**발주상태 (orderStatus)**:
- `draft`: 임시저장
- `created`: 발주생성  
- `sent`: 발주완료
- `delivered`: 납품완료

**승인상태 (approvalStatus)**:
- `not_required`: 승인불필요
- `pending`: 승인대기
- `approved`: 승인완료
- `rejected`: 반려

**사용 규칙**:
```javascript
// ✅ 올바른 사용법
import { getOrderStatusText, getApprovalStatusText, getDisplayStatus } from '@/lib/statusUtils';

// UI 표시
const displayText = getDisplayStatus(order.orderStatus, order.approvalStatus);
const displayColor = getDisplayStatusColor(order.orderStatus, order.approvalStatus);

// 비즈니스 로직
const canEdit = canEditOrder(order.orderStatus, order.approvalStatus);
const canSend = canSendEmail(order.orderStatus, order.approvalStatus);

// ❌ 금지된 사용법
const status = order.status; // deprecated 필드 사용 금지
const mixed = order.orderStatus === 'approved'; // 발주상태와 승인상태 혼재 금지
```

### API Routes

All API routes are prefixed with `/api/`:
- `/api/auth/*` - Authentication endpoints
- `/api/orders/*` - Purchase order CRUD and workflow
- `/api/vendors/*`, `/api/items/*`, `/api/projects/*`, `/api/companies/*` - Master data management
- `/api/dashboard/*` - Dashboard statistics
- `/api/admin/*` - Admin functions

### Key Features Implementation

1. **Dynamic Forms**: Template-based forms using `orderTemplates` and `templateFields` tables
2. **Approval Workflow**: Multi-level approval based on role and amount limits
3. **Excel Integration**: File upload and processing (beta feature, controlled by VITE_ENABLE_EXCEL_UPLOAD)
4. **Audit Trail**: Comprehensive logging in `orderHistory` table
5. **Localization**: UI terms management for Korean language support

### Environment Variables

Required environment variables:
```
DATABASE_URL=postgresql://user:password@host:port/database
VITE_ENVIRONMENT=development|production
VITE_ENABLE_EXCEL_UPLOAD=true|false
```

### Important Patterns

1. **Type Safety**: All API responses and requests use Zod schemas for validation
2. **Error Handling**: Consistent error responses with proper HTTP status codes
3. **Authentication**: Session-based auth with Passport.js, check `req.isAuthenticated()` in routes
4. **File Uploads**: Korean filename support, files stored in `uploads/` directory
5. **Database Queries**: Use `OptimizedOrderQueries` service for performance-critical queries
6. **Development Strategy**: "기능 기반 점진적 최적화" - Function-based gradual optimization approach

### Excel File Processing Pipeline (중요!)

**실제 실행 경로**:
```
/api/po-template/extract-sheets
→ routes/po-template-real.ts (또는 po-template-mock.ts)
→ POTemplateProcessorMock.extractSheetsToFile()
→ removeAllInputSheets() (excel-input-sheet-remover.ts)
```

**주의사항**:
- `excel-direct-copy.ts`는 현재 사용되지 않음
- Input 시트 제거 시 "Input"으로 시작하는 모든 시트 처리
- ZIP 구조 직접 조작으로 100% 서식 보존
- 수정 전 반드시 실행 경로 확인: `node scripts/trace-execution-path.js`

**디버깅 방법**:
1. `DebugLogger.logExecutionPath()` 사용
2. 콘솔 로그로 실제 호출 함수 확인
3. extracted 파일 구조 분석: `node debug_extracted_file.cjs`

### Excel 자동화 시스템 (신규!)

**통합 자동화 프로세스**:
```
Excel 업로드 → DB 저장 → 거래처 검증 → 이메일 발송
```

**Step-by-Step Excel PO Workflow**:
1. **Step 0**: Pre-validation (일관성 검증)
2. **Step 1**: 발주 정보 시트 추출 및 DB 저장
3. **Step 2**: Excel 파일 다운로드 및 서식 보존 처리
4. **Step 3**: 거래처 정보 검증 및 유사 거래처 추천
5. **Step 4**: 발주서 생성 (워터마크, 암호화)
6. **Step 5**: 이메일 발송
7. **Step 6**: 상태 업데이트 (sent 상태로 변경)
8. **Step 7**: 정리 작업

**API 엔드포인트**:
- `POST /api/excel-automation/upload-and-process` - 통합 자동화 처리
- `POST /api/excel-automation/update-email-preview` - 거래처 선택 후 이메일 미리보기
- `POST /api/excel-automation/send-emails` - 이메일 발송 실행
- `POST /api/excel-automation/validate-vendors` - 거래처 검증 (독립 실행)
- `GET /api/excel-automation/download/:filename` - 처리된 파일 다운로드
- `DELETE /api/excel-automation/cleanup` - 임시 파일 정리

**핵심 서비스**:
- `ExcelAutomationService`: 통합 자동화 로직
- `vendor-validation.ts`: 유사 거래처 추천 기능 (Levenshtein distance 기반)
- `excel-input-sheet-remover.ts`: 서식 보존 Excel 처리
- `POEmailService`: 이메일 발송 시스템 (Naver SMTP)

**프론트엔드 컴포넌트**:
- `ExcelAutomationWizard`: 3단계 자동화 마법사
- `VendorValidationModal`: 거래처 선택 모달
- 탭 기반 UI (자동화/수동 처리)

### UI Standards

**Color System**:
- Primary: Blue (#3B82F6) - Main actions
- Success: Green (#10B981) - Positive states
- Warning: Yellow (#F59E0B) - Caution states
- Danger: Red (#EF4444) - Errors/deletions
- Status-specific colors defined in UI_STANDARDS.md

**Component Patterns**:
- Use Shadcn/ui components consistently
- Follow Korean-first UI terminology from `ui_terms` table
- Maintain consistent spacing with Tailwind classes

### Development Tips

- Path aliases are configured: `@/` for client src, `@shared/` for shared code
- The project uses Drizzle ORM - avoid raw SQL queries
- All dates are stored in UTC in the database
- Role-based access is enforced at the route level
- UI components follow Shadcn/ui patterns and styling
- When debugging Excel processing, use `DebugLogger` and trace scripts
- Email passwords are stored encrypted in the database

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
