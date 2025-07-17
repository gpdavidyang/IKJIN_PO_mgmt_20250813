/**
 * 데이터베이스 없이 PO Template 시스템을 테스트하기 위한 Mock DB
 */

export class MockDB {
  private static vendors: any[] = [];
  private static projects: any[] = [];
  private static purchaseOrders: any[] = [];
  private static purchaseOrderItems: any[] = [];
  private static idCounters = {
    vendors: 1,
    projects: 1,
    purchaseOrders: 1,
    purchaseOrderItems: 1
  };

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
      contactPerson: '자동생성',
      email: `auto-${Date.now()}@example.com`,
      mainContact: '자동생성',
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