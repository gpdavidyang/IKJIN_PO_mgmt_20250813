import { Router } from 'express';
import { authMiddleware } from '../middleware/auth-unified';

const router = Router();

interface BatchRequest {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  params?: Record<string, any>;
  body?: any;
  headers?: Record<string, string>;
}

interface BatchResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
  status: number;
}

interface BatchRequestBody {
  requests: BatchRequest[];
}

/**
 * 배치 API 요청 처리
 * 여러 개의 API 요청을 하나의 HTTP 요청으로 처리
 */
router.post('/', authMiddleware.required, async (req: any, res) => {
  try {
    const { requests } = req.body as BatchRequestBody;

    if (!Array.isArray(requests)) {
      return res.status(400).json({
        error: 'Invalid batch request format',
        message: 'requests must be an array'
      });
    }

    if (requests.length === 0) {
      return res.json({ responses: [] });
    }

    if (requests.length > 50) {
      return res.status(400).json({
        error: 'Batch size too large',
        message: 'Maximum 50 requests per batch'
      });
    }

    // 각 요청을 병렬로 처리
    const responses = await Promise.allSettled(
      requests.map(async (request): Promise<BatchResponse> => {
        try {
          const response = await processSingleRequest(request, req);
          return {
            id: request.id,
            success: true,
            data: response.data,
            status: response.status
          };
        } catch (error) {
          console.error(`Batch request ${request.id} failed:`, error);
          return {
            id: request.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            status: error instanceof HTTPError ? error.status : 500
          };
        }
      })
    );

    // 결과 정리
    const finalResponses: BatchResponse[] = responses.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          id: requests[index].id,
          success: false,
          error: result.reason?.message || 'Request processing failed',
          status: 500
        };
      }
    });

    res.json({ responses: finalResponses });

  } catch (error) {
    console.error('Batch processing error:', error);
    res.status(500).json({
      error: 'Batch processing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * HTTP 에러 클래스
 */
class HTTPError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'HTTPError';
  }
}

/**
 * 개별 요청 처리
 */
async function processSingleRequest(
  request: BatchRequest, 
  originalReq: any
): Promise<{ data: any; status: number }> {
  const { endpoint, method, params, body, headers } = request;

  // 보안 검사: 허용된 엔드포인트만 처리
  if (!isAllowedEndpoint(endpoint)) {
    throw new HTTPError(403, `Endpoint not allowed in batch: ${endpoint}`);
  }

  // Express 앱 인스턴스 가져오기
  const app = originalReq.app;
  
  // 모의 응답 객체 생성
  const mockRes = createMockResponse();
  
  // 모의 요청 객체 생성
  const mockReq = createMockRequest(originalReq, {
    method,
    url: endpoint,
    params,
    body,
    headers: { ...originalReq.headers, ...headers },
    query: params || {}
  });

  return new Promise((resolve, reject) => {
    // 응답 완료 시 처리
    mockRes.onComplete = (data: any, status: number) => {
      resolve({ data, status });
    };

    mockRes.onError = (error: any, status: number) => {
      reject(new HTTPError(status, error));
    };

    // Express 라우터를 통해 요청 처리
    app.handle(mockReq, mockRes, (err: any) => {
      if (err) {
        reject(new HTTPError(500, err.message || 'Internal server error'));
      } else {
        reject(new HTTPError(404, 'Route not found'));
      }
    });
  });
}

/**
 * 허용된 엔드포인트 확인
 */
function isAllowedEndpoint(endpoint: string): boolean {
  const allowedPrefixes = [
    '/api/orders',
    '/api/vendors',
    '/api/items',
    '/api/projects',
    '/api/companies',
    '/api/dashboard',
    '/api/approvals',
    '/api/order-templates'
  ];

  // 금지된 엔드포인트
  const forbiddenPrefixes = [
    '/api/auth',
    '/api/admin',
    '/api/batch'
  ];

  // 금지된 엔드포인트 확인
  if (forbiddenPrefixes.some(prefix => endpoint.startsWith(prefix))) {
    return false;
  }

  // 허용된 엔드포인트 확인
  return allowedPrefixes.some(prefix => endpoint.startsWith(prefix));
}

/**
 * 모의 응답 객체 생성
 */
function createMockResponse() {
  let isComplete = false;
  const response: any = {
    onComplete: null,
    onError: null,
    statusCode: 200,
    
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    
    json(data: any) {
      if (isComplete) return this;
      isComplete = true;
      
      if (this.statusCode >= 400) {
        this.onError?.(data, this.statusCode);
      } else {
        this.onComplete?.(data, this.statusCode);
      }
      return this;
    },
    
    send(data: any) {
      return this.json(data);
    },
    
    end(data?: any) {
      if (data) {
        return this.json(data);
      }
      if (isComplete) return this;
      isComplete = true;
      this.onComplete?.({}, this.statusCode);
      return this;
    },
    
    setHeader() {
      return this;
    },
    
    header() {
      return this;
    }
  };

  return response;
}

/**
 * 모의 요청 객체 생성
 */
function createMockRequest(originalReq: any, options: {
  method: string;
  url: string;
  params?: Record<string, any>;
  body?: any;
  headers: Record<string, any>;
  query: Record<string, any>;
}) {
  const mockReq = {
    ...originalReq,
    method: options.method,
    url: options.url,
    originalUrl: options.url,
    path: options.url.split('?')[0],
    params: options.params || {},
    body: options.body || {},
    headers: options.headers,
    query: options.query,
    user: originalReq.user, // 인증 정보 유지
    session: originalReq.session, // 세션 정보 유지
    app: originalReq.app,
    
    // Express 메서드들
    get(headerName: string) {
      return this.headers[headerName.toLowerCase()];
    },
    
    header(headerName: string) {
      return this.get(headerName);
    },
    
    param(name: string) {
      return this.params[name] || this.query[name];
    }
  };

  return mockReq;
}

/**
 * 배치 요청 통계
 */
router.get('/stats', authMiddleware.admin, async (req: any, res) => {
  try {
    // 배치 요청 통계 수집 (실제 구현에서는 Redis 등을 사용)
    const stats = {
      totalBatchRequests: 0, // 총 배치 요청 수
      totalIndividualRequests: 0, // 총 개별 요청 수
      averageBatchSize: 0, // 평균 배치 크기
      errorRate: 0, // 에러율
      averageProcessingTime: 0, // 평균 처리 시간
      topEndpoints: [], // 가장 많이 사용되는 엔드포인트
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Batch stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch batch statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 배치 요청 설정 조회
 */
router.get('/config', authMiddleware.admin, async (req: any, res) => {
  try {
    const config = {
      maxBatchSize: 50,
      maxWaitTime: 100,
      allowedEndpoints: [
        '/api/orders',
        '/api/vendors',
        '/api/items',
        '/api/projects',
        '/api/companies',
        '/api/dashboard',
        '/api/approvals',
        '/api/order-templates'
      ],
      forbiddenEndpoints: [
        '/api/auth',
        '/api/admin',
        '/api/batch'
      ]
    };

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Batch config error:', error);
    res.status(500).json({
      error: 'Failed to fetch batch configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 배치 요청 테스트 엔드포인트
 */
router.post('/test', authMiddleware.required, async (req: any, res) => {
  try {
    // 테스트용 배치 요청 생성
    const testRequests: BatchRequest[] = [
      {
        id: 'test-1',
        endpoint: '/api/dashboard/statistics',
        method: 'GET'
      },
      {
        id: 'test-2',
        endpoint: '/api/orders',
        method: 'GET',
        params: { limit: 5 }
      },
      {
        id: 'test-3',
        endpoint: '/api/vendors',
        method: 'GET',
        params: { limit: 5 }
      }
    ];

    // 자체적으로 배치 요청 처리
    const responses = await Promise.allSettled(
      testRequests.map(async (request): Promise<BatchResponse> => {
        try {
          const response = await processSingleRequest(request, req);
          return {
            id: request.id,
            success: true,
            data: response.data,
            status: response.status
          };
        } catch (error) {
          return {
            id: request.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            status: error instanceof HTTPError ? error.status : 500
          };
        }
      })
    );

    const finalResponses: BatchResponse[] = responses.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          id: testRequests[index].id,
          success: false,
          error: result.reason?.message || 'Request processing failed',
          status: 500
        };
      }
    });

    res.json({
      success: true,
      message: 'Batch test completed',
      data: {
        requestCount: testRequests.length,
        responses: finalResponses,
        summary: {
          successful: finalResponses.filter(r => r.success).length,
          failed: finalResponses.filter(r => !r.success).length
        }
      }
    });
  } catch (error) {
    console.error('Batch test error:', error);
    res.status(500).json({
      error: 'Batch test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;