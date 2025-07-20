/**
 * 애플리케이션 라우팅 상수 관리
 * 
 * 모든 라우트 경로를 중앙에서 관리하여 일관성 유지 및 유지보수성 향상
 */

// 기본 라우트 상수
export const ROUTES = {
  // 홈 및 인증
  HOME: '/',
  LOGIN: '/login',
  LOGOUT: '/logout',
  
  // 대시보드
  DASHBOARD: '/dashboard',
  
  // 발주서 관리
  ORDERS: '/orders',
  ORDER_CREATE: '/orders/create',
  ORDER_DETAIL: (id: string | number) => `/orders/${id}`,
  ORDER_EDIT: (id: string | number) => `/orders/${id}/edit`,
  ORDER_STANDARD: (id: string | number) => `/orders/${id}/standard`,
  ORDER_COPY: (id: string | number) => `/orders/${id}/copy`,
  
  // 발주서 생성 (다양한 방식)
  CREATE_ORDER_STANDARD: '/create-order-standard',
  CREATE_ORDER_EXCEL: '/create-order-excel',
  CREATE_ORDER_TEMPLATE: '/create-order-template',
  CREATE_ORDER_HANDSONTABLE: '/create-order-handsontable',
  
  // 거래처 관리
  VENDORS: '/vendors',
  VENDOR_CREATE: '/vendors/create',
  VENDOR_DETAIL: (id: string | number) => `/vendors/${id}`,
  VENDOR_EDIT: (id: string | number) => `/vendors/${id}/edit`,
  
  // 품목 관리
  ITEMS: '/items',
  ITEM_CREATE: '/items/create',
  ITEM_DETAIL: (id: string | number) => `/items/${id}`,
  ITEM_EDIT: (id: string | number) => `/items/${id}/edit`,
  
  // 프로젝트 관리
  PROJECTS: '/projects',
  PROJECT_CREATE: '/projects/create',
  PROJECT_DETAIL: (id: string | number) => `/projects/${id}`,
  PROJECT_EDIT: (id: string | number) => `/projects/${id}/edit`,
  PROJECT_STATISTICS: (id: string | number) => `/projects/${id}/stats`,
  
  // 회사 관리
  COMPANIES: '/companies',
  COMPANY_CREATE: '/companies/create',
  COMPANY_DETAIL: (id: string | number) => `/companies/${id}`,
  COMPANY_EDIT: (id: string | number) => `/companies/${id}/edit`,
  
  // 템플릿 관리
  TEMPLATES: '/templates',
  TEMPLATE_CREATE: '/templates/create',
  TEMPLATE_DETAIL: (id: string | number) => `/templates/${id}`,
  TEMPLATE_EDIT: (id: string | number) => `/templates/${id}/edit`,
  
  // 승인 관리
  APPROVALS: '/approvals',
  APPROVAL_PENDING: '/approvals/pending',
  APPROVAL_HISTORY: '/approvals/history',
  
  // 이메일 관리
  EMAIL_HISTORY: '/email-history',
  
  // 관리자 기능
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_LOGS: '/admin/logs',
  
  // 설정
  SETTINGS: '/settings',
  PROFILE: '/profile',
  
  // 도움말 및 기타
  HELP: '/help',
  ABOUT: '/about',
  
  // 테스트 페이지 (개발용)
  TEST: '/test',
  TEST_COMPONENTS: '/test/components',
  TEST_HANDSONTABLE: '/test/handsontable',
} as const;

// API 엔드포인트 상수
export const API_ENDPOINTS = {
  // 인증
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    CURRENT_USER: '/api/auth/me',
    REFRESH: '/api/auth/refresh',
  },
  
  // 대시보드
  DASHBOARD: {
    BASE: '/api/dashboard',
    STATISTICS: '/api/dashboard/statistics',
    UNIFIED: '/api/dashboard/unified',
  },
  
  // 발주서
  ORDERS: {
    BASE: '/api/orders',
    LIST: '/api/orders',
    CREATE: '/api/orders',
    DETAIL: (id: string | number) => `/api/orders/${id}`,
    UPDATE: (id: string | number) => `/api/orders/${id}`,
    DELETE: (id: string | number) => `/api/orders/${id}`,
    STATISTICS: '/api/orders/statistics',
    ACTIONS: (id: string | number) => `/api/orders/${id}/actions`,
    HISTORY: (id: string | number) => `/api/orders/${id}/history`,
  },
  
  // 거래처
  VENDORS: {
    BASE: '/api/vendors',
    LIST: '/api/vendors',
    CREATE: '/api/vendors',
    DETAIL: (id: string | number) => `/api/vendors/${id}`,
    UPDATE: (id: string | number) => `/api/vendors/${id}`,
    DELETE: (id: string | number) => `/api/vendors/${id}`,
    VALIDATE: '/api/vendors/validate',
    SEARCH: '/api/vendors/search',
  },
  
  // 품목
  ITEMS: {
    BASE: '/api/items',
    LIST: '/api/items',
    CREATE: '/api/items',
    DETAIL: (id: string | number) => `/api/items/${id}`,
    UPDATE: (id: string | number) => `/api/items/${id}`,
    DELETE: (id: string | number) => `/api/items/${id}`,
    CATEGORIES: '/api/item-categories',
  },
  
  // 프로젝트
  PROJECTS: {
    BASE: '/api/projects',
    LIST: '/api/projects',
    CREATE: '/api/projects',
    DETAIL: (id: string | number) => `/api/projects/${id}`,
    UPDATE: (id: string | number) => `/api/projects/${id}`,
    DELETE: (id: string | number) => `/api/projects/${id}`,
    MEMBERS: '/api/project-members',
    STATISTICS: (id: string | number) => `/api/projects/${id}/stats`,
  },
  
  // 회사
  COMPANIES: {
    BASE: '/api/companies',
    LIST: '/api/companies',
    CREATE: '/api/companies',
    DETAIL: (id: string | number) => `/api/companies/${id}`,
    UPDATE: (id: string | number) => `/api/companies/${id}`,
    DELETE: (id: string | number) => `/api/companies/${id}`,
  },
  
  // 템플릿
  TEMPLATES: {
    BASE: '/api/order-templates',
    LIST: '/api/order-templates',
    CREATE: '/api/order-templates',
    DETAIL: (id: string | number) => `/api/order-templates/${id}`,
    UPDATE: (id: string | number) => `/api/order-templates/${id}`,
    DELETE: (id: string | number) => `/api/order-templates/${id}`,
  },
  
  // PO 템플릿 (통합)
  PO_TEMPLATE: {
    BASE: '/api/po-template',
    ENVIRONMENT: '/api/po-template/environment',
    UPLOAD: '/api/po-template/upload',
    SAVE: '/api/po-template/save',
    EXTRACT_SHEETS: '/api/po-template/extract-sheets',
    STATISTICS: '/api/po-template/statistics',
    SEND_EMAIL: '/api/po-template/send-email',
    CONVERT_TO_PDF: '/api/po-template/convert-to-pdf',
    PROCESS_COMPLETE: '/api/po-template/process-complete',
    TEST_EMAIL: '/api/po-template/test-email',
    RESET_MOCK_DB: '/api/po-template/reset-mock-db',
  },
  
  // Excel 자동화
  EXCEL_AUTOMATION: {
    BASE: '/api/excel-automation',
    UPLOAD_AND_PROCESS: '/api/excel-automation/upload-and-process',
    UPDATE_EMAIL_PREVIEW: '/api/excel-automation/update-email-preview',
    SEND_EMAILS: '/api/excel-automation/send-emails',
    VALIDATE_VENDORS: '/api/excel-automation/validate-vendors',
    UPLOAD_ATTACHMENT: '/api/excel-automation/upload-attachment',
    GENERATE_PDF: '/api/excel-automation/generate-pdf',
    EMAIL_PREVIEW: '/api/excel-automation/email-preview',
    DOWNLOAD: (filename: string) => `/api/excel-automation/download/${filename}`,
    CLEANUP: '/api/excel-automation/cleanup',
    EMAIL_HISTORY: '/api/excel-automation/email-history',
    EMAIL_HISTORY_DETAIL: (id: string | number) => `/api/excel-automation/email-history/${id}`,
    RESEND_EMAIL: (id: string | number) => `/api/excel-automation/resend-email/${id}`,
  },
  
  // 승인
  APPROVALS: {
    BASE: '/api/approvals',
    PENDING: '/api/approvals/my-pending',
    AUTHORITIES: '/api/approval-authorities',
    STATISTICS: '/api/approvals/statistics',
  },
  
  // 관리자
  ADMIN: {
    BASE: '/api/admin',
    USERS: '/api/admin/users',
    SETTINGS: '/api/admin/settings',
    LOGS: '/api/admin/logs',
  },
} as const;

// 네비게이션 메뉴 구성
export const NAVIGATION_ITEMS = [
  {
    title: '대시보드',
    path: ROUTES.DASHBOARD,
    icon: 'BarChart3',
    roles: ['all'],
  },
  {
    title: '발주서 관리',
    icon: 'FileText',
    children: [
      {
        title: '발주서 목록',
        path: ROUTES.ORDERS,
        roles: ['all'],
      },
      {
        title: '발주서 생성',
        path: ROUTES.ORDER_CREATE,
        roles: ['project_manager', 'hq_management', 'executive', 'admin'],
      },
      {
        title: 'Excel 발주서',
        path: ROUTES.CREATE_ORDER_EXCEL,
        roles: ['project_manager', 'hq_management', 'executive', 'admin'],
      },
    ],
  },
  {
    title: '기준정보',
    icon: 'Database',
    children: [
      {
        title: '거래처 관리',
        path: ROUTES.VENDORS,
        roles: ['all'],
      },
      {
        title: '품목 관리',
        path: ROUTES.ITEMS,
        roles: ['all'],
      },
      {
        title: '프로젝트 관리',
        path: ROUTES.PROJECTS,
        roles: ['project_manager', 'hq_management', 'executive', 'admin'],
      },
      {
        title: '회사 관리',
        path: ROUTES.COMPANIES,
        roles: ['admin'],
      },
    ],
  },
  {
    title: '승인 관리',
    icon: 'CheckCircle',
    children: [
      {
        title: '승인 대기',
        path: ROUTES.APPROVAL_PENDING,
        roles: ['project_manager', 'hq_management', 'executive', 'admin'],
      },
      {
        title: '승인 이력',
        path: ROUTES.APPROVAL_HISTORY,
        roles: ['all'],
      },
    ],
  },
  {
    title: '이메일 이력',
    path: ROUTES.EMAIL_HISTORY,
    icon: 'Mail',
    roles: ['all'],
  },
  {
    title: '템플릿 관리',
    path: ROUTES.TEMPLATES,
    icon: 'Layout',
    roles: ['admin'],
  },
  {
    title: '관리자',
    icon: 'Settings',
    roles: ['admin'],
    children: [
      {
        title: '사용자 관리',
        path: ROUTES.ADMIN_USERS,
        roles: ['admin'],
      },
      {
        title: '시스템 설정',
        path: ROUTES.ADMIN_SETTINGS,
        roles: ['admin'],
      },
      {
        title: '시스템 로그',
        path: ROUTES.ADMIN_LOGS,
        roles: ['admin'],
      },
    ],
  },
] as const;

// 라우팅 유틸리티 함수
export const routeUtils = {
  /**
   * 동적 라우트에서 ID 추출
   */
  extractId: (path: string): string | null => {
    const matches = path.match(/\/(\d+)(?:\/|$)/);
    return matches ? matches[1] : null;
  },
  
  /**
   * 현재 경로가 특정 섹션에 속하는지 확인
   */
  isInSection: (currentPath: string, sectionPath: string): boolean => {
    return currentPath.startsWith(sectionPath);
  },
  
  /**
   * 쿼리 파라미터를 포함한 URL 생성
   */
  withQuery: (path: string, params: Record<string, any>): string => {
    const url = new URL(path, window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
    return url.pathname + url.search;
  },
  
  /**
   * 사용자 역할에 따른 접근 가능한 라우트 확인
   */
  isAccessibleRoute: (path: string, userRole: string): boolean => {
    // 구현 필요: 사용자 역할에 따른 라우트 접근 권한 확인
    return true; // 임시로 모든 라우트 허용
  },
  
  /**
   * 이전 페이지로 돌아가기 (히스토리 스택 활용)
   */
  goBack: (): void => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = ROUTES.DASHBOARD;
    }
  },
};

// 라우트 그룹별 상수
export const ROUTE_GROUPS = {
  ORDERS: [
    ROUTES.ORDERS,
    ROUTES.ORDER_CREATE,
    ROUTES.CREATE_ORDER_STANDARD,
    ROUTES.CREATE_ORDER_EXCEL,
    ROUTES.CREATE_ORDER_TEMPLATE,
    ROUTES.CREATE_ORDER_HANDSONTABLE,
  ],
  MASTER_DATA: [
    ROUTES.VENDORS,
    ROUTES.ITEMS,
    ROUTES.PROJECTS,
    ROUTES.COMPANIES,
  ],
  ADMIN: [
    ROUTES.ADMIN,
    ROUTES.ADMIN_USERS,
    ROUTES.ADMIN_SETTINGS,
    ROUTES.ADMIN_LOGS,
  ],
  AUTH: [
    ROUTES.LOGIN,
    ROUTES.LOGOUT,
  ],
} as const;

// 타입 정의
export type RouteKey = keyof typeof ROUTES;
export type APIEndpointKey = keyof typeof API_ENDPOINTS;
export type NavigationItem = typeof NAVIGATION_ITEMS[number];

export default ROUTES;