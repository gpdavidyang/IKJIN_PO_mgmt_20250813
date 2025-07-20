/**
 * 데이터베이스 없이 PO Template 시스템을 테스트하기 위한 Mock DB
 */

export class MockDB {
  // 테스트를 위한 Mock DB 초기화 함수
  static resetToOriginalData() {
    this.vendors = this.getOriginalVendors();
    this.projects = [];
    this.purchaseOrders = [];
    this.purchaseOrderItems = [];
    this.idCounters = {
      vendors: 7, // 원본 데이터 다음부터 시작
      projects: 1,
      purchaseOrders: 1,
      purchaseOrderItems: 1
    };
    console.log('🔄 Mock DB가 원본 데이터로 완전히 초기화되었습니다.');
    console.log(`📊 현재 거래처 목록: ${this.vendors.map(v => `${v.name}(ID:${v.id})`).join(', ')}`);
  }

  private static getOriginalVendors() {
    return [
      {
        id: 1,
        name: '이노에너지',
        type: '거래처',
        contactPerson: '김대표',
        email: 'contact@innoenergy.co.kr',
        phone: '02-1234-5678',
        mainContact: '김대표',
        isActive: true,
        createdAt: new Date('2024-01-01')
      },
      {
        id: 2,
        name: '울트라창호',
        type: '거래처',
        contactPerson: '박팀장',
        email: 'sales@ultrawindow.co.kr',
        phone: '02-2345-6789',
        mainContact: '박팀장',
        isActive: true,
        createdAt: new Date('2024-01-02')
      },
      {
        id: 3,
        name: '더골창호',
        type: '거래처',
        contactPerson: '이사장',
        email: 'info@thegolwindow.co.kr',
        phone: '02-3456-7890',
        mainContact: '이사장',
        isActive: true,
        createdAt: new Date('2024-01-03')
      },
      {
        id: 4,
        name: '이노메탈',
        type: '납품처',
        contactPerson: '최실장',
        email: 'delivery@innometal.co.kr',
        phone: '02-4567-8901',
        mainContact: '최실장',
        isActive: true,
        createdAt: new Date('2024-01-04')
      },
      {
        id: 5,
        name: '영세엔지텍',
        type: '납품처',
        contactPerson: '정과장',
        email: 'eng@youngse.co.kr',
        phone: '02-5678-9012',
        mainContact: '정과장',
        isActive: true,
        createdAt: new Date('2024-01-05')
      },
      {
        id: 6,
        name: '신오창호',
        type: '납품처',
        contactPerson: '한부장',
        email: 'delivery@shino.co.kr',
        phone: '02-6789-0123',
        mainContact: '한부장',
        isActive: true,
        createdAt: new Date('2024-01-06')
      }
    ];
  }

  private static vendors: any[] = [
    {
      id: 1,
      name: '이노에너지',
      type: '거래처',
      contactPerson: '김대표',
      email: 'contact@innoenergy.co.kr',
      phone: '02-1234-5678',
      mainContact: '김대표',
      isActive: true,
      createdAt: new Date('2024-01-01')
    },
    {
      id: 2,
      name: '울트라창호',
      type: '거래처',
      contactPerson: '박팀장',
      email: 'sales@ultrawindow.co.kr',
      phone: '02-2345-6789',
      mainContact: '박팀장',
      isActive: true,
      createdAt: new Date('2024-01-02')
    },
    {
      id: 3,
      name: '더골창호',
      type: '거래처',
      contactPerson: '이사장',
      email: 'info@thegolwindow.co.kr',
      phone: '02-3456-7890',
      mainContact: '이사장',
      isActive: true,
      createdAt: new Date('2024-01-03')
    },
    {
      id: 4,
      name: '이노메탈',
      type: '납품처',
      contactPerson: '최실장',
      email: 'delivery@innometal.co.kr',
      phone: '02-4567-8901',
      mainContact: '최실장',
      isActive: true,
      createdAt: new Date('2024-01-04')
    },
    {
      id: 5,
      name: '영세엔지텍',
      type: '납품처',
      contactPerson: '정과장',
      email: 'eng@youngse.co.kr',
      phone: '02-5678-9012',
      mainContact: '정과장',
      isActive: true,
      createdAt: new Date('2024-01-05')
    },
    {
      id: 6,
      name: '신오창호',
      type: '납품처',
      contactPerson: '한부장',
      email: 'delivery@shino.co.kr',
      phone: '02-6789-0123',
      mainContact: '한부장',
      isActive: true,
      createdAt: new Date('2024-01-06')
    }
  ];
  private static projects: any[] = [];
  private static purchaseOrders: any[] = [];
  private static purchaseOrderItems: any[] = [];
  private static idCounters = {
    vendors: 7, // 기존 샘플 데이터 다음부터 시작
    projects: 1,
    purchaseOrders: 1,
    purchaseOrderItems: 1
  };

  // 거래처 조회 (vendor-validation.ts에서 사용)
  static async getVendors() {
    return this.vendors;
  }

  static async findVendorByName(name: string, type: '거래처' | '납품처' = '거래처') {
    // 오직 원본 샘플 데이터에서만 찾기 (자동 생성된 거래처 제외)
    const originalVendors = this.vendors.filter(v => 
      v.id <= 6 && // 원본 샘플 데이터만 (ID 1-6)
      v.name === name && 
      v.type === type && 
      v.isActive
    );
    return originalVendors[0] || null;
  }

  static async findVendorsByType(type: '거래처' | '납품처' = '거래처') {
    // 오직 원본 샘플 데이터에서만 반환 (자동 생성된 거래처 제외)
    return this.vendors.filter(v => 
      v.id <= 6 && // 원본 샘플 데이터만 (ID 1-6)  
      v.type === type && 
      v.isActive
    );
  }

  // 최근 사용한 거래처 조회 (Mock 모드에서 사용)
  static async getRecentlyUsedVendors(): Promise<Map<number, Date>> {
    const recentVendorsMap = new Map<number, Date>();
    
    // 최근 30일 이내 발주서에서 사용된 거래처 추출
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentOrders = this.purchaseOrders.filter(order => 
      order.orderDate >= thirtyDaysAgo && order.vendorId
    );
    
    // vendorId별로 가장 최근 사용일 저장
    recentOrders.forEach(order => {
      const existing = recentVendorsMap.get(order.vendorId);
      if (!existing || order.orderDate > existing) {
        recentVendorsMap.set(order.vendorId, order.orderDate);
      }
    });
    
    // Mock 데이터가 없는 경우 샘플 최근 사용 정보 생성 (원본 거래처만)
    if (recentVendorsMap.size === 0) {
      // 첫 번째와 세 번째 거래처를 최근 사용된 것으로 가정
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      
      recentVendorsMap.set(1, fiveDaysAgo); // 이노에너지 (원본)
      recentVendorsMap.set(3, tenDaysAgo);  // 더골창호 (원본)
    }
    
    return recentVendorsMap;
  }

  static async findOrCreateVendor(vendorName: string): Promise<number> {
    if (!vendorName) {
      vendorName = '미지정 거래처';
    }

    // 기존 거래처 찾기
    const existing = this.vendors.find(v => v.name === vendorName);
    if (existing) {
      return existing.id;
    }

    // 새 거래처 생성
    const newVendor = {
      id: this.idCounters.vendors++,
      name: vendorName,
      type: '거래처',
      contactPerson: '자동생성',
      email: `auto-${Date.now()}@example.com`,
      phone: '02-0000-0000',
      mainContact: '자동생성',
      isActive: true,
      createdAt: new Date()
    };

    this.vendors.push(newVendor);
    return newVendor.id;
  }

  static async findOrCreateProject(siteName: string): Promise<number> {
    if (!siteName) {
      siteName = '미지정 현장';
    }

    // 기존 프로젝트 찾기
    const existing = this.projects.find(p => p.projectName === siteName);
    if (existing) {
      return existing.id;
    }

    // 새 프로젝트 생성
    const newProject = {
      id: this.idCounters.projects++,
      projectName: siteName,
      projectCode: `AUTO-${Date.now().toString().slice(-8)}`,
      status: 'active',
      createdAt: new Date()
    };

    this.projects.push(newProject);
    return newProject.id;
  }

  static async createPurchaseOrder(orderData: any): Promise<number> {
    const newOrder = {
      id: this.idCounters.purchaseOrders++,
      orderNumber: orderData.orderNumber,
      projectId: orderData.projectId,
      vendorId: orderData.vendorId,
      userId: orderData.userId,
      orderDate: new Date(orderData.orderDate),
      deliveryDate: orderData.deliveryDate ? new Date(orderData.deliveryDate) : null,
      totalAmount: orderData.totalAmount,
      status: 'draft',
      notes: orderData.notes || '',
      createdAt: new Date()
    };

    this.purchaseOrders.push(newOrder);
    return newOrder.id;
  }

  static async createPurchaseOrderItem(itemData: any): Promise<number> {
    const newItem = {
      id: this.idCounters.purchaseOrderItems++,
      orderId: itemData.orderId,
      itemName: itemData.itemName,
      specification: itemData.specification,
      quantity: itemData.quantity,
      unitPrice: itemData.unitPrice,
      totalAmount: itemData.totalAmount,
      categoryLv1: itemData.categoryLv1,
      categoryLv2: itemData.categoryLv2,
      categoryLv3: itemData.categoryLv3,
      supplyAmount: itemData.supplyAmount,
      taxAmount: itemData.taxAmount,
      deliveryName: itemData.deliveryName,
      notes: itemData.notes,
      createdAt: new Date()
    };

    this.purchaseOrderItems.push(newItem);
    return newItem.id;
  }

  static async transaction(callback: (mockTx: any) => Promise<void>): Promise<void> {
    const mockTx = {
      insert: (table: any) => ({
        values: async (data: any) => {
          if (table === 'vendors') {
            return [{ id: await this.findOrCreateVendor(data.name) }];
          } else if (table === 'projects') {
            return [{ id: await this.findOrCreateProject(data.projectName) }];
          } else if (table === 'purchaseOrders') {
            return [{ id: await this.createPurchaseOrder(data) }];
          } else if (table === 'purchaseOrderItems') {
            return [{ id: await this.createPurchaseOrderItem(data) }];
          }
          return [{ id: Math.floor(Math.random() * 1000) }];
        },
        returning: () => ({
          values: async (data: any) => {
            if (table === 'vendors') {
              return [{ id: await this.findOrCreateVendor(data.name) }];
            } else if (table === 'projects') {
              return [{ id: await this.findOrCreateProject(data.projectName) }];
            } else if (table === 'purchaseOrders') {
              return [{ id: await this.createPurchaseOrder(data) }];
            } else if (table === 'purchaseOrderItems') {
              return [{ id: await this.createPurchaseOrderItem(data) }];
            }
            return [{ id: Math.floor(Math.random() * 1000) }];
          }
        })
      }),
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => []
          })
        })
      })
    };

    await callback(mockTx);
  }

  static getStats() {
    return {
      vendors: this.vendors.length,
      projects: this.projects.length,
      purchaseOrders: this.purchaseOrders.length,
      purchaseOrderItems: this.purchaseOrderItems.length
    };
  }

  static getAllData() {
    return {
      vendors: this.vendors,
      projects: this.projects,
      purchaseOrders: this.purchaseOrders,
      purchaseOrderItems: this.purchaseOrderItems
    };
  }

  static clear() {
    this.vendors = [];
    this.projects = [];
    this.purchaseOrders = [];
    this.purchaseOrderItems = [];
    this.idCounters = {
      vendors: 1,
      projects: 1,
      purchaseOrders: 1,
      purchaseOrderItems: 1
    };
  }
}