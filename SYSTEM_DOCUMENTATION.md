# 구매 발주 관리 시스템 - 시스템 문서

## 📋 프로젝트 개요

구매 발주 관리 시스템(Purchase Order Management System)은 건설 프로젝트의 구매 발주서를 관리하는 웹 애플리케이션입니다. React + Express + PostgreSQL을 기반으로 구축되었으며, 역할 기반 접근 제어와 승인 워크플로우를 포함합니다.

## 🏗️ 기술 스택

### Frontend
- **React 18** + TypeScript + Vite
- **UI**: Tailwind CSS + Shadcn/ui
- **라우팅**: Wouter
- **상태 관리**: TanStack Query (React Query)
- **폼**: React Hook Form + Zod validation

### Backend
- **Node.js** + Express + TypeScript
- **데이터베이스**: PostgreSQL + Drizzle ORM
- **인증**: Passport.js (세션 기반)
- **파일 업로드**: Multer

### 핵심 라이브러리
- **엑셀 처리**: JSZip, xlsx-populate, xlwings, openpyxl
- **이메일**: Nodemailer
- **PDF 생성**: jsPDF

## 📁 프로젝트 구조

```
client/               # React 프론트엔드
├── src/
│   ├── components/   # UI 컴포넌트 (기능별 구성)
│   ├── pages/        # 라우트 페이지
│   ├── hooks/        # 커스텀 React hooks
│   ├── services/     # API 클라이언트 서비스
│   └── types/        # TypeScript 타입 정의

server/               # Express 백엔드
├── routes/           # API 라우트 핸들러
├── services/         # 비즈니스 로직
├── utils/            # 서버 유틸리티
└── db/               # 데이터베이스 연결

shared/               # 클라이언트-서버 공통 코드
├── schema.ts         # 데이터베이스 스키마 (Drizzle ORM)
└── order-types.ts    # 공통 타입 정의
```

## 🎯 주요 기능

### 1. 사용자 관리 및 인증
- **역할 기반 접근 제어**: field_worker, project_manager, hq_management, executive, admin
- **세션 기반 인증**: Passport.js 사용
- **승인 권한 관리**: 역할별 승인 한도 설정

### 2. 발주서 관리
- **발주서 생성/수정/삭제**: 동적 폼 기반
- **템플릿 시스템**: 프로젝트별 커스텀 필드 지원
- **아이템 관리**: 품목별 상세 정보 관리
- **파일 첨부**: 이미지 및 문서 첨부 지원

### 3. 승인 워크플로우
- **다단계 승인**: 역할 및 금액 기반 승인 프로세스
- **승인 히스토리**: 모든 승인 과정 추적
- **상태 관리**: 대기, 승인, 거부, 완료 상태 관리

### 4. 엑셀 처리 시스템 (핵심 기능)
- **엑셀 파일 업로드**: 발주서 일괄 처리
- **서식 보존**: 원본 엑셀 파일의 모든 서식 유지
- **시트 관리**: Input 시트 제거 후 갑지/을지 시트 보존
- **다중 처리 방식**: 10단계 fallback 시스템

### 5. 이메일 시스템
- **발주서 전송**: 거래처에 이메일 자동 발송
- **템플릿 기반**: 커스터마이징 가능한 이메일 템플릿
- **첨부 파일**: 처리된 엑셀 파일 첨부

## 🗄️ 데이터베이스 스키마

### 핵심 테이블
- **users**: 사용자 정보 및 역할
- **purchaseOrders**: 발주서 메인 정보
- **purchaseOrderItems**: 발주서 아이템 상세
- **vendors**: 거래처 정보
- **projects**: 프로젝트 정보
- **items**: 품목 마스터
- **companies**: 회사 정보
- **approvalAuthorities**: 승인 권한 설정
- **orderTemplates**: 발주서 템플릿
- **templateFields**: 템플릿 필드 정의
- **orderHistory**: 발주서 변경 이력

## 🚀 API 엔드포인트

### 인증 API (`/api/auth`)
- `POST /login` - 사용자 로그인
- `POST /logout` - 로그아웃
- `GET /user` - 현재 사용자 정보

### 발주서 API (`/api/orders`)
- `GET /` - 발주서 목록 조회
- `POST /` - 발주서 생성
- `GET /:id` - 발주서 상세 조회
- `PUT /:id` - 발주서 수정
- `DELETE /:id` - 발주서 삭제
- `POST /:id/approve` - 발주서 승인
- `POST /:id/reject` - 발주서 거부

### 엑셀 처리 API (`/api/po-template`)
- `POST /upload` - 엑셀 파일 업로드
- `POST /save` - 엑셀 데이터 저장
- `POST /extract-sheets` - 시트 추출 (Input 시트 제거)
- `POST /remove-input-sheet` - Input 시트 제거 (구버전)

### 마스터 데이터 API
- `/api/vendors` - 거래처 관리
- `/api/items` - 품목 관리
- `/api/projects` - 프로젝트 관리
- `/api/companies` - 회사 관리

## 🔧 엑셀 처리 시스템 (핵심 구현)

### 문제점
사용자가 업로드한 엑셀 파일에서 'Input' 시트만 제거하고 '갑지', '을지' 시트의 **모든 서식(폰트, 색상, 테두리, 병합 등)을 완벽하게 보존**해야 함.

### 해결 방안: 10단계 Fallback 시스템

1. **🔧 ZIP 레벨 완벽 처리** (최우선)
   - 엑셀 파일을 ZIP으로 직접 조작
   - Input 시트 관련 파일들만 제거
   - 100% 원본 서식 보존

2. **📋 최소한의 처리**
   - 원본 파일 복사 후 Input 시트만 삭제
   - openpyxl 사용 (keep_vba=True, keep_links=True)

3. **🔧 바이너리 복사 후 처리**
   - 바이너리 레벨 파일 복사
   - 최소한의 수정

4. **🚀 xlwings** (엑셀 앱 제어)
   - 실제 엑셀 애플리케이션 제어
   - Mac/Windows 환경 지원

5. **🐍 Python openpyxl**
   - 표준 Python 라이브러리
   - 기본적인 서식 보존

6. **🔧 JSZip 바이너리 처리**
   - Node.js 환경에서 ZIP 조작

7. **📄 xlsx-populate**
   - 서식 보존 특화 라이브러리

8. **📋 XLSX 라이브러리**
   - cellStyles 옵션 사용

9. **🔄 기존 바이너리 처리**
   - adm-zip 사용

10. **📊 ExcelJS** (최종 fallback)
    - 기본 처리 방식

### 핵심 구현 파일들

#### ZIP 레벨 처리 (최우선)
- `server/utils/excel-zip-perfect.ts`
- `removeInputSheetZipPerfect()` - ZIP 구조 직접 조작
- `analyzeExcelInternalStructure()` - 엑셀 내부 구조 분석

#### Python 기반 처리
- `server/utils/excel-xlwings-perfect.py` - xlwings 사용
- `server/utils/excel-minimal-processing.py` - 최소한의 처리
- `server/utils/excel-python-perfect.py` - openpyxl 사용

#### Node.js 호출 모듈들
- `server/utils/excel-xlwings-caller.ts`
- `server/utils/excel-minimal-caller.ts`
- `server/utils/excel-python-caller.ts`

#### 통합 처리
- `server/utils/excel-direct-copy.ts` - 모든 방식 통합
- `server/utils/po-template-processor.ts` - 메인 처리 로직

## 🎨 프론트엔드 구조

### 주요 페이지
- **대시보드** (`/dashboard`) - 발주서 현황 및 통계
- **발주서 목록** (`/orders`) - 발주서 조회 및 관리
- **발주서 생성** (`/orders/create`) - 새 발주서 작성
- **엑셀 발주서** (`/orders/excel`) - 엑셀 파일 업로드 처리
- **승인 관리** (`/approvals`) - 승인 대기 목록
- **마스터 데이터** (`/masters`) - 기준 정보 관리

### 주요 컴포넌트
- **OrderForm** - 발주서 입력 폼
- **OrderList** - 발주서 목록 테이블
- **ApprovalWorkflow** - 승인 프로세스 UI
- **ExcelUploader** - 엑셀 파일 업로드
- **ProcessingSteps** - 처리 단계 표시

### 상태 관리
- **TanStack Query** 사용
- **서버 상태 캐싱** 및 동기화
- **Optimistic Updates** 적용

## 🔄 핵심 워크플로우

### 1. 일반 발주서 생성
```
사용자 입력 → 폼 검증 → 서버 저장 → 승인 요청 → 승인 처리 → 완료
```

### 2. 엑셀 발주서 처리
```
엑셀 업로드 → Input 시트 파싱 → 데이터 검증 → 서버 저장 → 
시트 추출 (Input 제거) → 서식 보존 → 이메일 발송 → 완료
```

### 3. 승인 워크플로우
```
발주서 생성 → 승인 요청 → 역할별 승인 → 금액별 승인 → 
최종 승인 → 거래처 전송 → 완료
```

## 🚨 중요한 기술적 고려사항

### 1. 엑셀 서식 보존
- **Python 라이브러리 한계**: openpyxl, xlwings 모두 완벽한 서식 보존 불가
- **ZIP 레벨 처리**: 유일한 100% 서식 보존 방법
- **Fallback 시스템**: 환경별 최적 방법 자동 선택

### 2. 파일 처리 보안
- **업로드 파일 검증**: 확장자 및 MIME 타입 체크
- **임시 파일 관리**: 처리 후 자동 삭제
- **경로 보안**: 절대 경로 사용 및 경로 탈출 방지

### 3. 성능 최적화
- **쿼리 최적화**: `OptimizedOrderQueries` 서비스
- **메모리 관리**: 대용량 엑셀 파일 처리 시 고려
- **캐싱**: React Query 기반 클라이언트 캐싱

## 🛠️ 개발 환경 설정

### 필수 환경 변수
```bash
DATABASE_URL=postgresql://user:password@host:port/database
VITE_ENVIRONMENT=development|production
VITE_ENABLE_EXCEL_UPLOAD=true|false
```

### 개발 명령어
```bash
npm install                 # 의존성 설치
npm run dev                 # 개발 서버 시작
npm run build              # 프로덕션 빌드
npm run check              # TypeScript 타입 체크
npm run db:push            # 데이터베이스 스키마 푸시
```

### Python 환경 설정
```bash
pip3 install openpyxl xlwings  # Python 라이브러리 설치
```

## 📈 향후 개선 방향

### 1. 성능 최적화
- 대용량 엑셀 파일 처리 성능 개선
- 백그라운드 작업 큐 도입
- 데이터베이스 쿼리 최적화

### 2. 사용자 경험 개선
- 실시간 처리 상태 표시
- 더 나은 에러 메시지
- 모바일 최적화

### 3. 기능 확장
- 더 많은 파일 형식 지원
- 고급 승인 워크플로우
- 보고서 및 분석 기능

## 🔍 주요 이슈 및 해결 방안

### 1. 엑셀 서식 손실 문제
- **문제**: Python 라이브러리들이 엑셀 서식을 완벽히 보존하지 못함
- **해결**: ZIP 레벨 직접 조작으로 100% 서식 보존 구현

### 2. 크로스 플랫폼 호환성
- **문제**: xlwings가 플랫폼별 제한 있음
- **해결**: 다중 fallback 시스템으로 환경별 최적 방법 제공

### 3. 대용량 파일 처리
- **문제**: 메모리 사용량 및 처리 시간
- **해결**: 스트리밍 처리 및 최적화된 알고리즘 적용

---

## 📝 작업 이력

### 최근 주요 작업
1. **엑셀 서식 보존 시스템 구현** (2025-01-17)
   - ZIP 레벨 완벽 처리 구현
   - 10단계 fallback 시스템 구축
   - Python 다중 처리 방식 도입

2. **UI/UX 개선** (이전 작업)
   - Shadcn/ui 기반 컴포넌트 시스템
   - 반응형 디자인 적용
   - 사용자 경험 최적화

3. **API 및 백엔드 구조 확립** (이전 작업)
   - RESTful API 설계
   - 데이터베이스 스키마 최적화
   - 인증 및 권한 시스템 구현

### 현재 상태
- ✅ 기본 발주서 관리 기능 완료
- ✅ 엑셀 업로드 및 처리 시스템 완료
- ✅ 서식 보존 시스템 구현 완료
- ✅ 승인 워크플로우 구현 완료
- 🔄 이메일 시스템 개선 중
- 🔄 성능 최적화 진행 중

이 문서는 프로젝트의 현재 상태를 반영하며, 향후 개발 작업 시 참고 자료로 활용할 수 있습니다.