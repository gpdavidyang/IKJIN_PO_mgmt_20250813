import { apiRequest } from "@/lib/queryClient";
import type { PurchaseOrder, InsertPurchaseOrder } from "@shared/schema";

export class OrderService {
  private static readonly BASE_URL = '/api/purchase-orders';

  static async getOrders(filters?: {
    status?: string;
    projectId?: number;
    vendorId?: number;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const url = params.toString() 
      ? `${this.BASE_URL}?${params.toString()}`
      : this.BASE_URL;

    return apiRequest(url);
  }

  static async getOrder(id: string | number) {
    return apiRequest(`${this.BASE_URL}/${id}`);
  }

  static async createOrder(data: InsertPurchaseOrder) {
    return apiRequest(this.BASE_URL, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  static async updateOrder(id: string | number, data: Partial<InsertPurchaseOrder>) {
    return apiRequest(`${this.BASE_URL}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  static async deleteOrder(id: string | number) {
    return apiRequest(`${this.BASE_URL}/${id}`, {
      method: 'DELETE',
    });
  }

  static async updateStatus(id: string | number, status: string) {
    return apiRequest(`${this.BASE_URL}/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  static async bulkUpdateStatus(ids: (string | number)[], status: string) {
    return apiRequest(`${this.BASE_URL}/bulk-status`, {
      method: 'PATCH',
      body: JSON.stringify({ ids, status }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // 발주서 번호 생성
  static generateOrderNumber(date?: Date): string {
    const now = date || new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-3);
    
    return `PO-${year}-${month}${day}-${timestamp}`;
  }

  // 발주서 상태 변경 가능 여부 확인
  static canChangeStatus(currentStatus: string, newStatus: string): boolean {
    const statusFlow = {
      'draft': ['submitted', 'cancelled'],
      'submitted': ['approved', 'rejected', 'cancelled'],
      'approved': ['completed', 'cancelled'],
      'rejected': ['draft', 'cancelled'],
      'completed': [],
      'cancelled': ['draft']
    };

    return statusFlow[currentStatus as keyof typeof statusFlow]?.includes(newStatus) || false;
  }

  // 발주서 복사
  static async duplicateOrder(id: string | number, modifications?: Partial<InsertPurchaseOrder>) {
    const original = await this.getOrder(id);
    
    const duplicateData: InsertPurchaseOrder = {
      ...original,
      orderNumber: this.generateOrderNumber(),
      status: 'draft',
      createdAt: undefined,
      updatedAt: undefined,
      ...modifications
    };

    delete duplicateData.id;
    
    return this.createOrder(duplicateData);
  }
}