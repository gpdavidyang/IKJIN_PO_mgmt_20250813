// Mock Orders Store - 메모리에서 발주서 데이터를 관리
let mockOrdersStore = [
  {
    id: 1,
    orderNumber: "PO-2024-001",
    projectId: 1,
    vendorId: 1,
    userId: "user_001",
    orderDate: new Date("2024-01-20"),
    deliveryDate: new Date("2024-02-15"),
    status: "approved",
    totalAmount: "2550000",
    notes: "1차 철강 자재 발주",
    isApproved: true,
    approvedBy: "test_admin_001",
    approvedAt: new Date("2024-01-21"),
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-01-21"),
    vendor: { id: 1, name: "(주)건설자재유통", email: "sales@construction.co.kr" },
    project: { id: 1, projectName: "힐스테이트 판교", projectCode: "HSP-2024" }
  },
  {
    id: 2,
    orderNumber: "PO-2024-002",
    projectId: 1,
    vendorId: 4,
    userId: "user_001",
    orderDate: new Date("2024-01-25"),
    deliveryDate: new Date("2024-02-10"),
    status: "pending",
    totalAmount: "3600000",
    notes: "기초 콘크리트 발주",
    isApproved: false,
    approvedBy: null,
    approvedAt: null,
    createdAt: new Date("2024-01-25"),
    updatedAt: new Date("2024-01-25"),
    vendor: { id: 4, name: "신한콘크리트(주)", email: "orders@shinhan-concrete.co.kr" },
    project: { id: 1, projectName: "힐스테이트 판교", projectCode: "HSP-2024" }
  },
  {
    id: 3,
    orderNumber: "PO-2024-003",
    projectId: 2,
    vendorId: 3,
    userId: "user_001",
    orderDate: new Date("2024-02-01"),
    deliveryDate: new Date("2024-02-20"),
    status: "sent",
    totalAmount: "500000",
    notes: "전기설비 기초 자재",
    isApproved: true,
    approvedBy: "test_admin_001",
    approvedAt: new Date("2024-02-01"),
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-02"),
    vendor: { id: 3, name: "한국전기설비(주)", email: "contact@korea-electric.co.kr" },
    project: { id: 2, projectName: "아이파크 분당", projectCode: "IPD-2024" }
  },
  // 엑셀 업로드로 생성된 발주서 추가
  {
    id: 4,
    orderNumber: "PO-2025-001",
    projectId: 1,
    vendorId: 5,
    userId: "test_admin_001",
    orderDate: new Date("2024-06-12"),
    deliveryDate: new Date("2024-07-01"),
    status: "draft",
    totalAmount: "1000000",
    notes: "Excel 업로드로 생성됨",
    isApproved: false,
    approvedBy: null,
    approvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    vendor: { id: 5, name: "엘림메탈테크", email: "info@elim-metal.co.kr" },
    project: { id: 1, projectName: "힐스테이트 ㅇㅇㅇ", projectCode: "HSO-2025" },
    items: []
  }
];

// 자동 증가 ID 카운터
let nextOrderId = 5;

// 모든 발주서 조회
export function getAllMockOrders() {
  return [...mockOrdersStore];
}

// 필터링된 발주서 조회
export function getFilteredMockOrders(filters = {}) {
  let filtered = [...mockOrdersStore];
  
  if (filters.status && filters.status !== "all") {
    filtered = filtered.filter(order => order.status === filters.status);
  }
  
  if (filters.projectId && filters.projectId !== "all") {
    const projectId = parseInt(filters.projectId);
    filtered = filtered.filter(order => order.projectId === projectId);
  }
  
  if (filters.vendorId && filters.vendorId !== "all") {
    const vendorId = parseInt(filters.vendorId);
    filtered = filtered.filter(order => order.vendorId === vendorId);
  }
  
  if (filters.searchText) {
    const searchLower = filters.searchText.toLowerCase();
    filtered = filtered.filter(order => 
      order.orderNumber.toLowerCase().includes(searchLower) ||
      order.vendor?.name?.toLowerCase().includes(searchLower) ||
      order.project?.projectName?.toLowerCase().includes(searchLower)
    );
  }
  
  return filtered;
}

// 새 발주서 추가 (엑셀 업로드에서 사용)
export function addMockOrderFromExcel(orderData) {
  const newOrder = {
    id: nextOrderId++,
    orderNumber: orderData.orderNumber,
    projectId: getOrCreateMockProject(orderData.siteName),
    vendorId: getOrCreateMockVendor(orderData.vendorName),
    userId: orderData.userId || "test_admin_001",
    orderDate: new Date(orderData.orderDate),
    deliveryDate: orderData.dueDate ? new Date(orderData.dueDate) : null,
    status: "draft",
    totalAmount: orderData.totalAmount?.toString() || "0",
    notes: "Excel 업로드로 생성됨",
    isApproved: false,
    approvedBy: null,
    approvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    vendor: {
      id: getOrCreateMockVendor(orderData.vendorName),
      name: orderData.vendorName,
      email: `auto-${Date.now()}@example.com`
    },
    project: {
      id: getOrCreateMockProject(orderData.siteName),
      projectName: orderData.siteName,
      projectCode: `AUTO-${Date.now().toString().slice(-8)}`
    },
    items: orderData.items || []
  };
  
  mockOrdersStore.push(newOrder);
  console.log(`Mock 발주서 추가됨: ${newOrder.orderNumber}`);
  
  return newOrder;
}

// Mock 거래처 ID 생성/조회
function getOrCreateMockVendor(vendorName) {
  // 기존 거래처 확인
  const existing = mockOrdersStore.find(order => order.vendor?.name === vendorName);
  if (existing) {
    return existing.vendorId;
  }
  
  // 새 거래처 ID 생성 (5부터 시작)
  return 5 + Math.floor(Math.random() * 1000);
}

// Mock 프로젝트 ID 생성/조회
function getOrCreateMockProject(projectName) {
  // 기존 프로젝트 확인
  const existing = mockOrdersStore.find(order => order.project?.projectName === projectName);
  if (existing) {
    return existing.projectId;
  }
  
  // 새 프로젝트 ID 생성 (3부터 시작)
  return 3 + Math.floor(Math.random() * 1000);
}

// 발주서 삭제
export function deleteMockOrder(orderId) {
  const index = mockOrdersStore.findIndex(order => order.id === orderId);
  if (index !== -1) {
    const deleted = mockOrdersStore.splice(index, 1)[0];
    console.log(`Mock 발주서 삭제됨: ${deleted.orderNumber}`);
    return deleted;
  }
  return null;
}

// 발주서 업데이트
export function updateMockOrder(orderId, updateData) {
  const index = mockOrdersStore.findIndex(order => order.id === orderId);
  if (index !== -1) {
    mockOrdersStore[index] = {
      ...mockOrdersStore[index],
      ...updateData,
      updatedAt: new Date()
    };
    console.log(`Mock 발주서 업데이트됨: ${mockOrdersStore[index].orderNumber}`);
    return mockOrdersStore[index];
  }
  return null;
}

// 데이터 초기화
export function resetMockOrders() {
  nextOrderId = 4;
  mockOrdersStore = mockOrdersStore.slice(0, 3); // 처음 3개만 유지
  console.log('Mock 발주서 데이터 초기화됨');
}