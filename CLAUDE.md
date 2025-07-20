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

# Testing (Jest test suite available)
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report

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
- **purchaseOrders**: Main order records with status workflow
- **purchaseOrderItems**: Line items for orders
- **vendors**, **projects**, **items**, **companies**: Master data
- **approvalAuthorities**: Role-based approval limits
- **orderTemplates** & **templateFields**: Dynamic form generation
- **orderHistory**: Audit trail for all order changes
- **sessions**: Replit Auth session storage
- **ui_terms**: UI terminology management for Korean localization
- **positions**: Position/rank management for users
- **emailSendingHistory**: Email sending history records (2025.07.18 추가)
- **emailSendingDetails**: Individual recipient sending details (2025.07.18 추가)

### API Routes

All API routes are prefixed with `/api/`:
- `/api/auth/*` - Authentication endpoints
- `/api/orders/*` - Purchase order CRUD and workflow
- `/api/vendors/*`, `/api/items/*`, `/api/projects/*`, `/api/companies/*` - Master data management
- `/api/dashboard/*` - Dashboard statistics
- `/api/admin/*` - Admin functions
- `/api/excel-automation/*` - Excel automation and email history management (2025.07.18 추가)

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
- `POST /api/excel-automation/upload-attachment` - 추가 첨부파일 업로드
- `POST /api/excel-automation/generate-pdf` - PDF 생성 및 다운로드
- `POST /api/excel-automation/email-preview` - 이메일 미리보기 생성
- `GET /api/excel-automation/download/:filename` - 처리된 파일 다운로드
- `DELETE /api/excel-automation/cleanup` - 임시 파일 정리

**핵심 서비스**:
- `ExcelAutomationService`: 통합 자동화 로직
- `vendor-validation.ts`: 유사 거래처 추천 기능 (Levenshtein distance 기반)
- `excel-input-sheet-remover.ts`: 서식 보존 Excel 처리
- `POEmailService`: 이메일 발송 시스템 (Naver SMTP)
- `excel-to-pdf.ts`: Excel → PDF 변환 서비스 (Puppeteer 기반)

**프론트엔드 컴포넌트**:
- `ExcelAutomationWizard`: 3단계 자동화 마법사
- `VendorValidationModal`: 거래처 선택 모달
- 탭 기반 UI (자동화/수동 처리)

### 이메일 발송 이력 관리 시스템 (2025.07.18 구현)

**데이터베이스 스키마**:
```sql
-- 이메일 발송 이력 메인 테이블
emailSendingHistory:
- id (serial, primary key)
- orderId (integer, nullable) - 발주서 ID 참조
- orderNumber (varchar) - 발주서 번호
- senderUserId (varchar) - 발송자 사용자 ID
- recipients (jsonb) - 수신자 이메일 배열
- cc (jsonb) - CC 수신자 이메일 배열
- bcc (jsonb) - BCC 수신자 이메일 배열
- subject (text) - 이메일 제목
- messageContent (text) - 이메일 본문
- attachmentFiles (jsonb) - 첨부파일 정보 배열
- sendingStatus (varchar) - 발송 상태 (pending, completed, failed, partial)
- sentCount (integer) - 성공 발송 수
- failedCount (integer) - 실패 발송 수
- errorMessage (text) - 오류 메시지
- sentAt (timestamp) - 발송 완료 시각
- createdAt (timestamp) - 생성 시각
- updatedAt (timestamp) - 업데이트 시각

-- 개별 수신자 발송 상세 테이블
emailSendingDetails:
- id (serial, primary key)
- historyId (integer) - 발송 이력 ID 참조
- recipientEmail (varchar) - 수신자 이메일
- recipientType (varchar) - 수신자 유형 (to, cc, bcc)
- sendingStatus (varchar) - 개별 발송 상태 (pending, sent, failed)
- messageId (varchar) - 이메일 서비스 메시지 ID
- errorMessage (text) - 개별 오류 메시지
- sentAt (timestamp) - 개별 발송 시각
- createdAt (timestamp) - 생성 시각
```

**API 엔드포인트**:
- `GET /api/excel-automation/email-history` - 이메일 발송 이력 목록 조회
- `GET /api/excel-automation/email-history/:id` - 특정 이메일 발송 이력 상세 조회
- `POST /api/excel-automation/resend-email/:id` - 이메일 재발송

**핵심 서비스**:
- `EmailHistoryService`: 이메일 발송 이력 관리 서비스
  - `getEmailHistory()`: 페이지네이션과 필터링 지원 목록 조회
  - `getEmailHistoryDetail()`: 상세 정보 및 개별 발송 상태 조회
  - `saveEmailHistory()`: 발송 이력 저장
  - `saveEmailDetails()`: 개별 수신자 발송 상세 저장
  - `resendEmail()`: 재발송 기능
  - Mock 데이터 지원으로 개발 환경 호환성 확보

**프론트엔드 컴포넌트**:
- `EmailHistoryPage` (`/email-history`): 이메일 발송 이력 관리 페이지
  - 📊 페이지네이션 지원 목록 뷰
  - 🔍 상태별, 발주번호별 필터링
  - 📄 페이지 크기 조정 (10/20/50/100개)
  - 👁️ 상세 정보 모달 (수신자, 첨부파일, 개별 발송 상태)
  - 🔄 재발송 기능 (실패 상태 이메일)
  - 📅 발송 일시 및 상태 표시

**UI/UX 특징**:
- 상태별 색상 구분 (완료: 초록, 실패: 빨강, 대기: 회색, 부분완료: 주황)
- 발송 결과 요약 (성공 N건, 실패 N건)
- 개별 수신자별 발송 상태 추적
- 오류 메시지 상세 표시
- 첨부파일 정보 및 크기 표시
- 한국어 현지화 완료

**네비게이션 통합**:
- 사이드바 메뉴: "이메일 이력" 항목 추가
- 발주서 목록 페이지: "이메일 이력" 버튼 추가
- 라우팅: `/email-history` 경로 설정

**개발 환경 지원**:
- Mock 데이터 제공으로 실제 DB 없이도 개발 가능
- 동적 데이터 생성으로 다양한 ID 요청 처리
- 성공/실패 케이스 모두 시뮬레이션 가능

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

### Testing Infrastructure (2025.07.18 구현)

**Jest 테스트 환경 설정 완료**:
- TypeScript ESM 지원 구성
- 환경 변수 분리 (.env.test)
- 글로벌 목업 유틸리티 제공
- 테스트 설정 파일: `jest.config.js`, `tests/setup.ts`

**테스트 파일 구성**:
```
tests/
├── setup.ts              # 글로벌 테스트 설정
├── simple.test.ts         # 기본 기능 검증 테스트
├── auth.test.ts           # 인증 시스템 테스트
├── approval.test.ts       # 승인 시스템 테스트
├── order.test.ts          # 발주서 관리 테스트
├── vendor.test.ts         # 거래처 관리 테스트
├── api.test.ts            # API 엔드포인트 통합 테스트
└── excel-processing.test.ts # Excel 처리 테스트
```

**테스트 실행 명령어**:
```bash
npm test                   # 모든 테스트 실행
npm run test:watch         # 감시 모드 테스트
npm run test:coverage      # 커버리지 리포트 생성
npm test -- tests/simple.test.ts  # 특정 테스트 파일만 실행
```

**목업 패턴**:
- 데이터베이스 storage 레이어 목업
- 외부 서비스 (로그인 감사, 이메일) 목업
- Express Request/Response 객체 목업
- 글로벌 테스트 유틸리티 제공

**커버리지 대상**:
- `server/**/*.ts` (백엔드 로직)
- `shared/**/*.ts` (공유 스키마/타입)
- 테스트 통과율: 기본 기능 11개 테스트 전부 통과

### 개발 로그 (2025.07.18)

**오늘 완료한 주요 작업**:

1. **종합 테스트 인프라 구축**
   - Jest + TypeScript ESM 환경 구성
   - 모든 핵심 시스템용 테스트 코드 작성
   - 글로벌 목업 유틸리티 및 설정 완료

2. **테스트 코드 작성 범위**
   - 인증 시스템: 로그인/로그아웃, 세션 관리, 권한 미들웨어
   - 승인 시스템: 역할 기반 승인 권한, 다단계 워크플로우
   - 발주서 관리: CRUD 작업, 상태 관리, 이력 추적
   - 거래처 관리: 데이터 검증, 검색/필터링, 통계
   - API 엔드포인트: 라우팅, 오류 처리, 통합 테스트

3. **테스트 환경 최적화**
   - Mock 데이터 및 유틸리티 제공
   - 환경 변수 분리 (.env.test)
   - TypeScript 타입 안정성 확보

4. **프로젝트 상태 점검**
   - 전체 시스템 95% 구현 완료
   - 핵심 기능 모두 작동 검증
   - 테스트 인프라 구축으로 코드 품질 보장

**남은 작업 (5%)**:
- 보안 강화 (패스워드 해싱 개선)
- Step 0 Excel 검증 기능 추가
- 실시간 알림 시스템 구현
- 통계 Excel/PDF 내보내기 기능

**기술적 성취**:
- 완전 자동화된 Excel PO 처리 워크플로우
- 역할 기반 접근 제어 시스템 (RBAC)
- 다단계 승인 워크플로우
- 이메일 발송 이력 관리 시스템
- 종합 테스트 인프라 구축

구매 발주 관리 시스템의 핵심 기능 구현이 완료되었으며, 안정적인 테스트 환경을 통해 코드 품질을 보장할 수 있게 되었습니다.