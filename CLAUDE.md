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

### Development Tips

- Path aliases are configured: `@/` for client src, `@shared/` for shared code
- The project uses Drizzle ORM - avoid raw SQL queries
- All dates are stored in UTC in the database
- Role-based access is enforced at the route level
- UI components follow Shadcn/ui patterns and styling