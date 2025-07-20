/**
 * API 요청 배칭 시스템
 * 
 * 여러 API 요청을 배치로 묶어서 처리하여 네트워크 요청 수를 줄이고
 * 성능을 향상시키는 시스템
 */

import React from 'react';

export interface BatchRequest {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  params?: Record<string, any>;
  body?: any;
  headers?: Record<string, string>;
}

export interface BatchResponse<T = any> {
  id: string;
  success: boolean;
  data?: T;
  error?: string;
  status: number;
}

export interface BatchConfig {
  maxBatchSize: number;
  maxWaitTime: number;
  endpoint: string;
  retryCount: number;
  retryDelay: number;
}

// 기본 배치 설정
const DEFAULT_BATCH_CONFIG: BatchConfig = {
  maxBatchSize: 10,
  maxWaitTime: 50, // 50ms
  endpoint: '/api/batch',
  retryCount: 3,
  retryDelay: 1000, // 1초
};

class APIBatcher {
  private config: BatchConfig;
  private pendingRequests: Map<string, {
    request: BatchRequest;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    timestamp: number;
  }> = new Map();
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(config: Partial<BatchConfig> = {}) {
    this.config = { ...DEFAULT_BATCH_CONFIG, ...config };
  }

  /**
   * 요청을 배치에 추가
   */
  async request<T = any>(request: Omit<BatchRequest, 'id'>): Promise<T> {
    const id = this.generateRequestId();
    const fullRequest: BatchRequest = { ...request, id };

    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(id, {
        request: fullRequest,
        resolve,
        reject,
        timestamp: Date.now(),
      });

      // 배치 크기가 최대치에 도달하면 즉시 실행
      if (this.pendingRequests.size >= this.config.maxBatchSize) {
        this.flush();
      } else {
        // 타이머 설정 (기존 타이머가 있으면 취소하고 새로 설정)
        this.scheduleFlush();
      }
    });
  }

  /**
   * GET 요청 배칭
   */
  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
    return this.request<T>({
      endpoint,
      method: 'GET',
      params,
    });
  }

  /**
   * POST 요청 배칭
   */
  async post<T = any>(endpoint: string, body?: any, params?: Record<string, any>): Promise<T> {
    return this.request<T>({
      endpoint,
      method: 'POST',
      body,
      params,
    });
  }

  /**
   * PUT 요청 배칭
   */
  async put<T = any>(endpoint: string, body?: any, params?: Record<string, any>): Promise<T> {
    return this.request<T>({
      endpoint,
      method: 'PUT',
      body,
      params,
    });
  }

  /**
   * DELETE 요청 배칭
   */
  async delete<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
    return this.request<T>({
      endpoint,
      method: 'DELETE',
      params,
    });
  }

  /**
   * 배치 실행 스케줄링
   */
  private scheduleFlush(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.flush();
    }, this.config.maxWaitTime);
  }

  /**
   * 대기 중인 모든 요청을 즉시 실행
   */
  async flush(): Promise<void> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.pendingRequests.size === 0) {
      return;
    }

    const requests = Array.from(this.pendingRequests.values());
    const requestMap = new Map(this.pendingRequests);
    this.pendingRequests.clear();

    try {
      const batchRequest = {
        requests: requests.map(r => r.request),
      };

      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(batchRequest),
      });

      if (!response.ok) {
        throw new Error(`Batch request failed: ${response.status} ${response.statusText}`);
      }

      const batchResponse: { responses: BatchResponse[] } = await response.json();

      // 각 응답을 해당 Promise에 전달
      batchResponse.responses.forEach(responseItem => {
        const pendingRequest = requestMap.get(responseItem.id);
        if (pendingRequest) {
          if (responseItem.success) {
            pendingRequest.resolve(responseItem.data);
          } else {
            pendingRequest.reject(new Error(responseItem.error || 'Unknown error'));
          }
        }
      });

      // 응답이 없는 요청들은 에러 처리
      requestMap.forEach((pendingRequest, id) => {
        if (!batchResponse.responses.find(r => r.id === id)) {
          pendingRequest.reject(new Error('No response received for request'));
        }
      });

    } catch (error) {
      // 배치 요청 전체가 실패한 경우 개별 요청으로 재시도
      console.warn('Batch request failed, falling back to individual requests:', error);
      await this.fallbackToIndividualRequests(requests);
    }
  }

  /**
   * 배치 요청 실패 시 개별 요청으로 폴백
   */
  private async fallbackToIndividualRequests(
    requests: Array<{
      request: BatchRequest;
      resolve: (value: any) => void;
      reject: (reason: any) => void;
      timestamp: number;
    }>
  ): Promise<void> {
    const promises = requests.map(async ({ request, resolve, reject }) => {
      try {
        const url = new URL(request.endpoint, window.location.origin);
        
        if (request.params) {
          Object.entries(request.params).forEach(([key, value]) => {
            url.searchParams.set(key, String(value));
          });
        }

        const fetchOptions: RequestInit = {
          method: request.method,
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...request.headers,
          },
        };

        if (request.body && request.method !== 'GET') {
          fetchOptions.body = JSON.stringify(request.body);
        }

        const response = await fetch(url.toString(), fetchOptions);
        
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        resolve(data);
      } catch (error) {
        reject(error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * 고유한 요청 ID 생성
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 통계 정보 반환
   */
  getStats(): {
    pendingRequests: number;
    isScheduled: boolean;
    config: BatchConfig;
  } {
    return {
      pendingRequests: this.pendingRequests.size,
      isScheduled: this.timeoutId !== null,
      config: this.config,
    };
  }

  /**
   * 배치 설정 업데이트
   */
  updateConfig(newConfig: Partial<BatchConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 모든 대기 중인 요청을 취소
   */
  cancelAll(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    this.pendingRequests.forEach(({ reject }) => {
      reject(new Error('Request cancelled'));
    });

    this.pendingRequests.clear();
  }
}

// 글로벌 배처 인스턴스
const globalBatcher = new APIBatcher();

/**
 * React Query와 통합된 배치 요청 훅
 */
export function useBatchedQuery<T = any>(
  queryKey: string[],
  request: Omit<BatchRequest, 'id'>,
  enabled: boolean = true
) {
  const [data, setData] = React.useState<T | undefined>();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    globalBatcher.request<T>(request)
      .then(result => {
        setData(result);
      })
      .catch(err => {
        setError(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [JSON.stringify(queryKey), JSON.stringify(request), enabled]);

  return { data, isLoading, error };
}

/**
 * 배치된 mutation 훅
 */
export function useBatchedMutation<TData = any, TVariables = any>() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const mutate = React.useCallback(async (
    request: Omit<BatchRequest, 'id'>,
    options?: {
      onSuccess?: (data: TData) => void;
      onError?: (error: Error) => void;
    }
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await globalBatcher.request<TData>(request);
      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      options?.onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    mutate,
    isLoading,
    error,
  };
}

/**
 * 여러 요청을 동시에 배치 처리
 */
export async function batchRequests<T = any>(
  requests: Omit<BatchRequest, 'id'>[]
): Promise<T[]> {
  const promises = requests.map(request => globalBatcher.request<T>(request));
  return Promise.all(promises);
}

/**
 * 조건부 배치 요청
 */
export async function conditionalBatch<T = any>(
  requests: Array<{
    condition: boolean;
    request: Omit<BatchRequest, 'id'>;
  }>
): Promise<(T | null)[]> {
  const activeRequests = requests.filter(r => r.condition);
  const results = await batchRequests<T>(activeRequests.map(r => r.request));
  
  let resultIndex = 0;
  return requests.map(r => r.condition ? results[resultIndex++] : null);
}

// 유틸리티 함수들
export const apiBatcher = {
  request: globalBatcher.request.bind(globalBatcher),
  get: globalBatcher.get.bind(globalBatcher),
  post: globalBatcher.post.bind(globalBatcher),
  put: globalBatcher.put.bind(globalBatcher),
  delete: globalBatcher.delete.bind(globalBatcher),
  flush: globalBatcher.flush.bind(globalBatcher),
  getStats: globalBatcher.getStats.bind(globalBatcher),
  updateConfig: globalBatcher.updateConfig.bind(globalBatcher),
  cancelAll: globalBatcher.cancelAll.bind(globalBatcher),
};

export default globalBatcher;