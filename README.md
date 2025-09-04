# Purchase Order Management System

구매 발주 관리 시스템 - React + Express + PostgreSQL

## 기능
- 발주서 작성 및 관리
- 거래처/프로젝트/품목 관리
- Excel 업로드 기능 (베타)
- 템플릿 기반 동적 폼
- 승인 워크플로우
- 보고서 및 분석

## 기술 스택
- Frontend: React 18, TypeScript, Tailwind CSS, Shadcn/ui
- Backend: Node.js, Express, PostgreSQL
- ORM: Drizzle
- 배포: Replit

## 환경 분리
- `production` 브랜치: 검수팀용 안정 버전
- `development` 브랜치: 개발팀용 신규 기능 개발
- `main` 브랜치: 최종 통합 브랜치

## 설치 및 실행
```bash
npm install
npm run dev
```

## 환경 변수
```
DATABASE_URL=<PostgreSQL 연결 문자열>
VITE_ENVIRONMENT=development|production
VITE_ENABLE_EXCEL_UPLOAD=true|false
```# Force Vercel redeploy Thu Sep  4 22:18:06 KST 2025
