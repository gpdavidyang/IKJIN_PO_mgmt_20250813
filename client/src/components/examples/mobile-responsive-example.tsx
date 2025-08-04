import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MobileNavigation, MobileBottomNavigation } from "@/components/mobile/mobile-navigation";
import { MobileTable, useResponsiveTable } from "@/components/mobile/mobile-table";
import { 
  ResponsiveForm, 
  FormSection, 
  FormGrid, 
  FormFieldWrapper,
  MobileMultiStepForm,
  TouchInputWrapper,
  useBreakpoint,
  mobileSpacing
} from "@/components/mobile/responsive-form";
import { 
  SwipeActionCard, 
  TouchActionButton, 
  LongPressAction, 
  PullToRefresh, 
  TouchToggles 
} from "@/components/mobile/touch-interactions";
import { FormField } from "@/components/ui/form-field";
import { FormSelect } from "@/components/ui/form-select";
import { SmartStatusBadge } from "@/components/ui/status-system";
import { EnhancedTable } from "@/components/ui/enhanced-table";
import { 
  FileText, 
  Building2, 
  User, 
  Edit, 
  Trash2, 
  Star,
  RefreshCw,
  Plus,
  Filter,
  Search,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

// Sample data
const sampleOrders = [
  {
    id: "1",
    orderNumber: "PO-001",
    status: "pending",
    vendor: "㈜익진건설",
    project: "신축공사 A동",
    amount: 25000000,
    date: "2024-01-15",
    priority: "high",
  },
  {
    id: "2", 
    orderNumber: "PO-002",
    status: "approved",
    vendor: "대한산업",
    project: "리모델링 B동",
    amount: 12000000,
    date: "2024-01-14",
    priority: "normal",
  },
  {
    id: "3",
    orderNumber: "PO-003", 
    status: "sent",
    vendor: "신성건설",
    project: "외부공사",
    amount: 38000000,
    date: "2024-01-13",
    priority: "urgent",
  },
];

const sampleVendors = [
  {
    id: "1",
    name: "㈜익진건설",
    contact: "김철수",
    phone: "02-1234-5678",
    email: "kim@ikjin.co.kr",
    address: "서울시 강남구 테헤란로 123",
    status: "active",
  },
  {
    id: "2",
    name: "대한산업",
    contact: "이영희",
    phone: "02-9876-5432", 
    email: "lee@daehan.co.kr",
    address: "서울시 서초구 강남대로 456",
    status: "active",
  },
];

export function MobileResponsiveExample() {
  const [currentUser] = useState({ name: "관리자", username: "admin" });
  const [refreshing, setRefreshing] = useState(false);
  const [favoriteOrders, setFavoriteOrders] = useState<Set<string>>(new Set());
  const [formStep, setFormStep] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    project: "",
    description: "",
  });

  const { breakpoint, isMobile, isTablet } = useBreakpoint();
  const useResponsiveTableView = useResponsiveTable();

  // Mobile table configuration
  const mobileOrderColumns = [
    {
      key: "orderNumber",
      label: "발주번호",
      accessor: (row: any) => (
        <div className="font-medium text-primary-600">{row.orderNumber}</div>
      ),
      primary: true,
    },
    {
      key: "vendor",
      label: "거래처",
      accessor: (row: any) => (
        <div className="text-gray-600">{row.vendor}</div>
      ),
      secondary: true,
    },
    {
      key: "status",
      label: "상태",
      accessor: (row: any) => (
        <SmartStatusBadge type="order" status={row.status} size="sm" />
      ),
      secondary: true,
    },
    {
      key: "project", 
      label: "프로젝트",
      accessor: (row: any) => row.project,
    },
    {
      key: "amount",
      label: "금액", 
      accessor: (row: any) => `${(row.amount / 10000).toLocaleString()}만원`,
    },
    {
      key: "date",
      label: "발주일",
      accessor: (row: any) => row.date,
    },
  ];

  // Desktop table configuration
  const desktopOrderColumns = [
    {
      key: "orderNumber",
      header: "발주번호",
      accessor: (row: any) => (
        <div className="font-medium text-primary-600">{row.orderNumber}</div>
      ),
      sortable: true,
    },
    {
      key: "status",
      header: "상태", 
      accessor: (row: any) => (
        <SmartStatusBadge type="order" status={row.status} />
      ),
      sortable: true,
    },
    {
      key: "vendor",
      header: "거래처",
      accessor: (row: any) => row.vendor,
      sortable: true,
    },
    {
      key: "project",
      header: "프로젝트",
      accessor: (row: any) => row.project,
      sortable: true,
    },
    {
      key: "amount",
      header: "금액",
      accessor: (row: any) => `${(row.amount / 10000).toLocaleString()}만원`,
      sortable: true,
      align: "right" as const,
    },
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRefreshing(false);
  };

  const toggleFavorite = (orderId: string) => {
    const newFavorites = new Set(favoriteOrders);
    if (newFavorites.has(orderId)) {
      newFavorites.delete(orderId);
    } else {
      newFavorites.add(orderId);
    }
    setFavoriteOrders(newFavorites);
  };

  const formSteps = [
    { id: "basic", title: "기본 정보", description: "기본 연락처 정보" },
    { id: "project", title: "프로젝트 정보", description: "프로젝트 세부사항" },
    { id: "review", title: "검토", description: "정보 확인 및 제출" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Navigation */}
      <div className="lg:hidden bg-white border-b px-4 py-3 flex items-center justify-between">
        <MobileNavigation 
          currentUser={currentUser}
          onLogout={() => console.log("Logout")}
        />
        <h1 className="text-lg font-semibold">모바일 최적화 예시</h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Content with mobile spacing */}
      <div className={cn("pb-20 lg:pb-8", mobileSpacing.container, mobileSpacing.section)}>
        
        {/* Breakpoint Indicator */}
        <Card className={mobileSpacing.element}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              반응형 정보
              <Badge variant={isMobile ? "default" : isTablet ? "secondary" : "outline"}>
                {breakpoint}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>현재 화면: <strong>{isMobile ? "모바일" : isTablet ? "태블릿" : "데스크톱"}</strong></p>
              <p>테이블 모드: <strong>{useResponsiveTableView ? "모바일 카드" : "데스크톱 테이블"}</strong></p>
              <p>화면 크기: <strong>{window.innerWidth} x {window.innerHeight}</strong></p>
            </div>
          </CardContent>
        </Card>

        {/* Touch Interactions Demo */}
        <Card className={mobileSpacing.element}>
          <CardHeader>
            <CardTitle>터치 친화적 인터랙션</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Touch Action Buttons */}
              <div>
                <h4 className="text-sm font-medium mb-3">터치 액션 버튼</h4>
                <div className="flex flex-wrap gap-3">
                  <TouchActionButton>일반</TouchActionButton>
                  <TouchActionButton variant="destructive">삭제</TouchActionButton>
                  <TouchActionButton size="lg">큰 버튼</TouchActionButton>
                  <TouchActionButton loading>로딩 중</TouchActionButton>
                </div>
              </div>

              {/* Toggle Buttons */}
              <div>
                <h4 className="text-sm font-medium mb-3">토글 버튼</h4>
                <div className="flex gap-3">
                  <TouchToggles.Favorite
                    checked={favoriteOrders.has("demo")}
                    onChange={(checked) => {
                      const newFavorites = new Set(favoriteOrders);
                      if (checked) {
                        newFavorites.add("demo");
                      } else {
                        newFavorites.delete("demo");
                      }
                      setFavoriteOrders(newFavorites);
                    }}
                  />
                  <TouchToggles.Like
                    checked={false}
                    onChange={() => {}}
                  />
                  <TouchToggles.Bookmark
                    checked={false}
                    onChange={() => {}}
                  />
                </div>
              </div>

              {/* Long Press Demo */}
              <div>
                <h4 className="text-sm font-medium mb-3">롱프레스 액션</h4>
                <LongPressAction
                  onLongPress={() => alert("롱프레스 실행됨!")}
                  confirmationTitle="롱프레스 확인"
                  confirmationMessage="롱프레스 동작을 실행하시겠습니까?"
                >
                  <Card className="p-4 cursor-pointer border-dashed border-2 border-gray-300 hover:border-primary-400">
                    <p className="text-center text-gray-600">
                      이 카드를 길게 눌러보세요
                    </p>
                  </Card>
                </LongPressAction>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Swipe Actions Demo */}
        <Card className={mobileSpacing.element}>
          <CardHeader>
            <CardTitle>스와이프 액션 카드</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sampleOrders.map((order) => (
                <SwipeActionCard
                  key={order.id}
                  leftAction={{
                    icon: Trash2,
                    label: "삭제",
                    color: "bg-red-500",
                    action: () => alert(`${order.orderNumber} 삭제`),
                  }}
                  rightAction={{
                    icon: Star,
                    label: "즐겨찾기",
                    color: "bg-yellow-500", 
                    action: () => toggleFavorite(order.id),
                  }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{order.orderNumber}</h4>
                          <p className="text-sm text-gray-600">{order.vendor}</p>
                        </div>
                        <SmartStatusBadge type="order" status={order.status} size="sm" />
                      </div>
                    </CardContent>
                  </Card>
                </SwipeActionCard>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              ← 좌로 스와이프: 삭제 | 우로 스와이프: 즐겨찾기 →
            </p>
          </CardContent>
        </Card>

        {/* Pull to Refresh Demo */}
        <Card className={mobileSpacing.element}>
          <CardHeader>
            <CardTitle>Pull-to-Refresh</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <PullToRefresh onRefresh={handleRefresh}>
              <div className="p-6 space-y-3">
                <p className="text-center text-gray-600 mb-4">
                  아래로 당겨서 새로고침
                </p>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium">항목 {i}</p>
                      <p className="text-sm text-gray-600">마지막 업데이트: 방금 전</p>
                    </div>
                  </div>
                ))}
              </div>
            </PullToRefresh>
          </CardContent>
        </Card>

        {/* Responsive Table */}
        <Card className={mobileSpacing.element}>
          <CardHeader>
            <CardTitle>반응형 테이블</CardTitle>
          </CardHeader>
          <CardContent>
            {useResponsiveTableView ? (
              <MobileTable
                data={sampleOrders}
                columns={mobileOrderColumns}
                actions={[
                  {
                    label: "수정",
                    icon: Edit,
                    onClick: (row) => alert(`${row.orderNumber} 수정`),
                  },
                  {
                    label: "삭제",
                    icon: Trash2,
                    onClick: (row) => alert(`${row.orderNumber} 삭제`),
                    variant: "destructive",
                  },
                ]}
                onRowClick={(row) => console.log("Row clicked:", row)}
                rowKey={(row) => row.id}
              />
            ) : (
              <EnhancedTable
                data={sampleOrders}
                columns={desktopOrderColumns}
                searchable
                showPagination
                onRowClick={(row) => console.log("Row clicked:", row)}
                rowKey={(row) => row.id}
              />
            )}
          </CardContent>
        </Card>

        {/* Responsive Form */}
        <ResponsiveForm 
          title="반응형 폼 예시"
          description="화면 크기에 따라 자동으로 조정되는 폼 레이아웃"
          className={mobileSpacing.element}
        >
          <MobileMultiStepForm
            steps={formSteps}
            currentStep={formStep}
            onNext={() => setFormStep(Math.min(formSteps.length - 1, formStep + 1))}
            onPrevious={() => setFormStep(Math.max(0, formStep - 1))}
            onSubmit={() => alert("폼 제출됨!")}
            canProceed={true}
          >
            <TouchInputWrapper>
              {formStep === 0 && (
                <FormSection title="기본 정보" description="연락처 정보를 입력해주세요">
                  <FormGrid columns={2}>
                    <FormField
                      label="이름"
                      name="name"
                      value={formData.name}
                      onChange={(value) => setFormData({...formData, name: value})}
                      required
                      placeholder="이름을 입력하세요"
                    />
                    <FormField
                      label="이메일"
                      name="email"
                      type="email" 
                      value={formData.email}
                      onChange={(value) => setFormData({...formData, email: value})}
                      required
                      placeholder="email@example.com"
                    />
                    <FormFieldWrapper fullWidth>
                      <FormField
                        label="회사명"
                        name="company"
                        value={formData.company}
                        onChange={(value) => setFormData({...formData, company: value})}
                        required
                        placeholder="회사명을 입력하세요"
                      />
                    </FormFieldWrapper>
                  </FormGrid>
                </FormSection>
              )}

              {formStep === 1 && (
                <FormSection title="프로젝트 정보">
                  <FormGrid columns={1}>
                    <FormSelect
                      label="프로젝트 유형"
                      name="project"
                      value={formData.project}
                      onChange={(value) => setFormData({...formData, project: value})}
                      options={[
                        { value: "construction", label: "건설/건축" },
                        { value: "renovation", label: "리모델링" },
                        { value: "maintenance", label: "유지보수" },
                      ]}
                      placeholder="프로젝트 유형을 선택하세요"
                    />
                    <FormField
                      label="프로젝트 설명"
                      name="description"
                      type="textarea"
                      value={formData.description}
                      onChange={(value) => setFormData({...formData, description: value})}
                      placeholder="프로젝트에 대한 상세 설명을 입력하세요"
                      rows={4}
                    />
                  </FormGrid>
                </FormSection>
              )}

              {formStep === 2 && (
                <FormSection title="입력 정보 확인">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900">기본 정보</h4>
                        <dl className="mt-2 space-y-1 text-sm">
                          <div className="flex justify-between">
                            <dt className="text-gray-600">이름:</dt>
                            <dd className="font-medium">{formData.name || "-"}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-600">이메일:</dt>
                            <dd className="font-medium">{formData.email || "-"}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-600">회사:</dt>
                            <dd className="font-medium">{formData.company || "-"}</dd>
                          </div>
                        </dl>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">프로젝트 정보</h4>
                        <dl className="mt-2 space-y-1 text-sm">
                          <div className="flex justify-between">
                            <dt className="text-gray-600">유형:</dt>
                            <dd className="font-medium">{formData.project || "-"}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-600">설명:</dt>
                            <dd className="font-medium">{formData.description || "-"}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  </div>
                </FormSection>
              )}
            </TouchInputWrapper>
          </MobileMultiStepForm>
        </ResponsiveForm>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNavigation />
    </div>
  );
}