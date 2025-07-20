/**
 * CSRF Token 관리 유틸리티
 * 
 * 클라이언트에서 CSRF 토큰을 안전하게 관리하고 사용하는 함수들
 */

/**
 * 쿠키에서 CSRF 토큰 가져오기
 */
export function getCSRFToken(): string | null {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === '_csrf') {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * 서버에서 새로운 CSRF 토큰 요청
 */
export async function fetchCSRFToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/csrf/token', {
      method: 'GET',
      credentials: 'include',
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.token;
    }
  } catch (error) {
    console.error('CSRF token fetch failed:', error);
  }
  return null;
}

/**
 * 현재 CSRF 토큰 가져오기 (쿠키 우선, 없으면 서버에서 요청)
 */
export async function getCurrentCSRFToken(): Promise<string | null> {
  let token = getCSRFToken();
  
  if (!token) {
    token = await fetchCSRFToken();
  }
  
  return token;
}

/**
 * CSRF 토큰을 포함한 fetch 요청
 */
export async function fetchWithCSRF(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const token = await getCurrentCSRFToken();
  
  const headers = new Headers(options.headers);
  
  if (token) {
    headers.set('x-csrf-token', token);
  }
  
  // Content-Type이 설정되지 않았고 body가 있으면 JSON으로 설정
  if (!headers.has('content-type') && options.body && typeof options.body === 'string') {
    headers.set('content-type', 'application/json');
  }
  
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include', // 쿠키 포함
  });
}

/**
 * CSRF 토큰을 포함한 POST 요청
 */
export async function postWithCSRF(
  url: string, 
  data?: any, 
  options: RequestInit = {}
): Promise<Response> {
  return fetchWithCSRF(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  });
}

/**
 * CSRF 토큰을 포함한 PUT 요청
 */
export async function putWithCSRF(
  url: string, 
  data?: any, 
  options: RequestInit = {}
): Promise<Response> {
  return fetchWithCSRF(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  });
}

/**
 * CSRF 토큰을 포함한 DELETE 요청
 */
export async function deleteWithCSRF(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  return fetchWithCSRF(url, {
    method: 'DELETE',
    ...options,
  });
}

/**
 * FormData와 함께 CSRF 토큰 전송
 */
export async function submitFormWithCSRF(
  url: string, 
  formData: FormData, 
  options: RequestInit = {}
): Promise<Response> {
  const token = await getCurrentCSRFToken();
  
  if (token) {
    formData.append('_csrf', token);
  }
  
  return fetch(url, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    ...options,
  });
}

/**
 * CSRF 토큰을 숨겨진 input 필드로 추가
 */
export async function addCSRFTokenToForm(form: HTMLFormElement): Promise<void> {
  const token = await getCurrentCSRFToken();
  
  if (token) {
    // 기존 CSRF 토큰 필드 제거
    const existingField = form.querySelector('input[name="_csrf"]');
    if (existingField) {
      existingField.remove();
    }
    
    // 새 CSRF 토큰 필드 추가
    const hiddenField = document.createElement('input');
    hiddenField.type = 'hidden';
    hiddenField.name = '_csrf';
    hiddenField.value = token;
    form.appendChild(hiddenField);
  }
}

/**
 * CSRF 보호 상태 확인
 */
export async function checkCSRFProtection(): Promise<{
  enabled: boolean;
  tokenValid: boolean;
  error?: string;
}> {
  try {
    const response = await fetch('/api/csrf/status', {
      credentials: 'include',
    });
    
    if (response.ok) {
      const data = await response.json();
      const token = getCSRFToken();
      
      return {
        enabled: data.data.enabled,
        tokenValid: !!token,
      };
    } else {
      return {
        enabled: false,
        tokenValid: false,
        error: 'Failed to check CSRF status',
      };
    }
  } catch (error) {
    return {
      enabled: false,
      tokenValid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * React Hook: CSRF 토큰 관리
 */
export function useCSRFToken() {
  const [token, setToken] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    const loadToken = async () => {
      try {
        setLoading(true);
        setError(null);
        const currentToken = await getCurrentCSRFToken();
        setToken(currentToken);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load CSRF token');
      } finally {
        setLoading(false);
      }
    };
    
    loadToken();
  }, []);
  
  const refreshToken = async () => {
    try {
      setLoading(true);
      setError(null);
      const newToken = await fetchCSRFToken();
      setToken(newToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh CSRF token');
    } finally {
      setLoading(false);
    }
  };
  
  return {
    token,
    loading,
    error,
    refreshToken,
  };
}

/**
 * React Hook: CSRF 보호된 API 요청
 */
export function useCSRFProtectedAPI() {
  const { token } = useCSRFToken();
  
  const protectedFetch = React.useCallback(async (
    url: string, 
    options: RequestInit = {}
  ) => {
    if (!token) {
      throw new Error('CSRF token not available');
    }
    
    return fetchWithCSRF(url, options);
  }, [token]);
  
  const protectedPost = React.useCallback(async (
    url: string, 
    data?: any, 
    options: RequestInit = {}
  ) => {
    return postWithCSRF(url, data, options);
  }, []);
  
  const protectedPut = React.useCallback(async (
    url: string, 
    data?: any, 
    options: RequestInit = {}
  ) => {
    return putWithCSRF(url, data, options);
  }, []);
  
  const protectedDelete = React.useCallback(async (
    url: string, 
    options: RequestInit = {}
  ) => {
    return deleteWithCSRF(url, options);
  }, []);
  
  return {
    fetch: protectedFetch,
    post: protectedPost,
    put: protectedPut,
    delete: protectedDelete,
    token,
  };
}

/**
 * API 에러 핸들러 (CSRF 관련 에러 처리)
 */
export function handleCSRFError(error: any, retry?: () => void) {
  if (error?.code === 'CSRF_VALIDATION_FAILED' || 
      error?.message?.includes('CSRF') ||
      error?.status === 403) {
    
    console.warn('CSRF validation failed, refreshing token...');
    
    // 토큰 새로고침 후 재시도
    fetchCSRFToken().then(() => {
      if (retry) {
        retry();
      } else {
        // 페이지 새로고침으로 토큰 갱신
        window.location.reload();
      }
    });
    
    return true; // 에러 처리됨
  }
  
  return false; // 다른 종류의 에러
}

// React import (useCSRFToken, useCSRFProtectedAPI에서 필요)
import React from 'react';

export default {
  getCSRFToken,
  fetchCSRFToken,
  getCurrentCSRFToken,
  fetchWithCSRF,
  postWithCSRF,
  putWithCSRF,
  deleteWithCSRF,
  submitFormWithCSRF,
  addCSRFTokenToForm,
  checkCSRFProtection,
  useCSRFToken,
  useCSRFProtectedAPI,
  handleCSRFError,
};