import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Phone, Mail, MapPin, User, Building, Search, ChevronUp, ChevronDown, Edit, Trash2, List, Grid, Hash } from "lucide-react";
import { VendorForm } from "@/components/vendor-form";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/lib/utils";
import { hasPermission } from "@/utils/auth-helpers";
import { ProtectedRoute } from "@/components/auth/protected-route";

export default function Vendors() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // 권한 확인
  const canManageVendors = user && hasPermission(user.role, "canManageVendors");
  const canEditAllVendors = user && hasPermission(user.role, "canEditAllOrders");
  const canDeleteVendors = user && hasPermission(user.role, "canDeleteOrders");

  const { data: vendors, isLoading } = useQuery({
    queryKey: ["/api/vendors"],
  });

  // 검색 및 정렬 기능
  const filteredVendors = useMemo(() => {
    if (!vendors || !Array.isArray(vendors)) return [];
    
    // 검색 필터링
    let filtered = vendors;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = vendors.filter((vendor: any) =>
        vendor.name?.toLowerCase().includes(query) ||
        vendor.businessNumber?.includes(query) ||
        vendor.industry?.toLowerCase().includes(query) ||
        vendor.contactPerson?.toLowerCase().includes(query) ||
        vendor.representative?.toLowerCase().includes(query) ||
        vendor.phone?.includes(query) ||
        vendor.mainContact?.includes(query) ||
        vendor.email?.toLowerCase().includes(query)
      );
    }

    // 타입 필터링
    if (typeFilter !== "all") {
      filtered = filtered.filter((vendor: any) => vendor.type === typeFilter);
    }

    // 정렬
    if (sortField) {
      filtered = [...filtered].sort((a: any, b: any) => {
        let aValue = a[sortField];
        let bValue = b[sortField];
        
        // null/undefined 처리
        if (aValue == null) aValue = "";
        if (bValue == null) bValue = "";
        
        // 문자열로 변환하여 비교
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
        
        if (sortDirection === "asc") {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      });
    }

    return filtered;
  }, [vendors, searchQuery, typeFilter, sortField, sortDirection]);

  const deleteVendorMutation = useMutation({
    mutationFn: async (vendorId: number) => {
      await apiRequest("DELETE", `/api/vendors/${vendorId}`);
    },
    onSuccess: () => {
      toast({
        title: "성공",
        description: "거래처가 삭제되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
    },
    onError: (error: any) => {
      if (error.status === 401) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          navigate("/login");
        }, 500);
        return;
      }
      toast({
        title: "오류",
        description: "거래처 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // 정렬 기능
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  const handleAddVendor = () => {
    setEditingVendor(null);
    setIsFormOpen(true);
  };

  const handleEditVendor = (vendor: any) => {
    setEditingVendor(vendor);
    setIsFormOpen(true);
  };

  const handleDeleteVendor = (vendorId: number) => {
    if (!canDeleteVendors) {
      toast({
        title: "권한 없음",
        description: "거래처를 삭제할 권한이 없습니다.",
        variant: "destructive",
      });
      return;
    }
    
    if (confirm("정말로 이 거래처를 삭제하시겠습니까?")) {
      deleteVendorMutation.mutate(vendorId);
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingVendor(null);
    queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
  };

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6">
        <PageHeader
          title="거래처 관리"
          action={canManageVendors ? (
            <Button onClick={handleAddVendor} className="flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              거래처 추가
            </Button>
          ) : undefined}
        />

        {/* Search and Filter Section */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="거래처명, 사업자번호, 업종, 담당자명으로 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="구분" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="거래처">거래처</SelectItem>
                      <SelectItem value="납품처">납품처</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {filteredVendors.length}개 거래처
                </span>
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <Button
                    variant={viewMode === "table" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                    className="h-8 w-8 p-0"
                    title="목록 보기"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "cards" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("cards")}
                    className="h-8 w-8 p-0"
                    title="카드 보기"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      {/* Vendors Display */}
      {viewMode === "table" ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead 
                    className="h-11 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>거래처명</span>
                      {getSortIcon("name")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="h-11 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort("businessNumber")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>사업자번호</span>
                      {getSortIcon("businessNumber")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="h-11 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort("industry")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>업종</span>
                      {getSortIcon("industry")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="h-11 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort("type")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>구분</span>
                      {getSortIcon("type")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="h-11 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort("contactPerson")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>담당자</span>
                      {getSortIcon("contactPerson")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="h-11 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort("mainContact")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>대표연락처</span>
                      {getSortIcon("mainContact")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="h-11 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort("createdAt")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>등록일</span>
                      {getSortIcon("createdAt")}
                    </div>
                  </TableHead>
                  {(canManageVendors || canEditAllVendors) && (
                    <TableHead className="h-11 px-4 text-sm font-semibold text-gray-700 text-right">
                      관리
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      {user?.role === "admin" && <TableCell></TableCell>}
                    </TableRow>
                  ))
                ) : filteredVendors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={(canManageVendors || canEditAllVendors) ? 8 : 7} className="text-center py-8 text-gray-500">
                      {searchQuery ? "검색 결과가 없습니다" : "등록된 거래처가 없습니다"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVendors.map((vendor: any) => (
                    <TableRow key={vendor.id} className="h-12 hover:bg-gray-50 border-b border-gray-100">
                      <TableCell className="py-2 px-4">
                        <div 
                          className="text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800 hover:underline overflow-hidden text-ellipsis whitespace-nowrap"
                          onClick={() => navigate(`/vendors/${vendor.id}`)}
                          title={vendor.name}
                        >
                          {vendor.name}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-4">
                        <div className="text-sm text-gray-600">
                          {vendor.businessNumber || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-4">
                        {vendor.industry ? (
                          <Badge variant="outline" className="text-xs">
                            {vendor.industry}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="py-2 px-4">
                        <Badge 
                          variant={vendor.type === '거래처' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {vendor.type || '거래처'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 px-4">
                        <div className="text-sm text-gray-600">
                          {vendor.contactPerson || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-4">
                        <div className="text-sm text-gray-600">
                          {vendor.mainContact || vendor.phone || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-4">
                        <div className="text-sm text-gray-600">
                          {formatDate(vendor.createdAt)}
                        </div>
                      </TableCell>
                      {(canManageVendors || canEditAllVendors) && (
                        <TableCell className="py-2 px-4">
                          <div className="flex items-center justify-end gap-1">
                            {canEditAllVendors && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditVendor(vendor)}
                                className="h-7 w-7 p-0"
                                title="수정"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            )}
                            {canDeleteVendors && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteVendor(vendor.id)}
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                title="삭제"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="h-5 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredVendors.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Building className="mx-auto h-12 w-12 text-gray-400" />
              <p className="text-gray-500 mt-2">등록된 거래처가 없습니다.</p>
            </div>
          ) : (
            filteredVendors.map((vendor: any) => (
              <Card key={vendor.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600" onClick={() => navigate(`/vendors/${vendor.id}`)}>
                      {vendor.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant={vendor.type === '거래처' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {vendor.type || '거래처'}
                      </Badge>
                      {vendor.industry && (
                        <Badge variant="outline" className="text-xs">
                          {vendor.industry}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge 
                    variant={vendor.isActive ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {vendor.isActive ? "활성" : "비활성"}
                  </Badge>
                </div>
                
                <div className="space-y-2 mb-3">
                  <div className="flex items-center text-sm text-gray-600 gap-2">
                    <Hash className="h-4 w-4" />
                    <span className="font-medium">사업자번호:</span>
                    <span className="ml-1">{vendor.businessNumber || '-'}</span>
                  </div>
                  {vendor.representative && (
                    <div className="flex items-center text-sm text-gray-600 gap-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">대표자:</span>
                      <span className="ml-1">{vendor.representative}</span>
                    </div>
                  )}
                  {vendor.contactPerson && (
                    <div className="flex items-center text-sm text-gray-600 gap-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">담당자:</span>
                      <span className="ml-1">{vendor.contactPerson}</span>
                    </div>
                  )}
                  {(vendor.mainContact || vendor.phone) && (
                    <div className="flex items-center text-sm text-gray-600 gap-2">
                      <Phone className="h-4 w-4" />
                      <span className="font-medium">연락처:</span>
                      <span className="ml-1">{vendor.mainContact || vendor.phone}</span>
                    </div>
                  )}
                  {vendor.email && (
                    <div className="flex items-center text-sm text-gray-600 gap-2">
                      <Mail className="h-4 w-4" />
                      <span className="font-medium">이메일:</span>
                      <span className="ml-1">{vendor.email}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>등록일: {formatDate(vendor.createdAt)}</span>
                </div>
                
                {(canManageVendors || canEditAllVendors) && (
                  <div className="flex items-center justify-end -space-x-1 pt-2 border-t">
                    {canEditAllVendors && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditVendor(vendor)}
                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="수정"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                    {canDeleteVendors && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteVendor(vendor.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="삭제"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}

        {/* Vendor Form Modal */}
        {isFormOpen && (
          <VendorForm
            isOpen={isFormOpen}
            vendor={editingVendor}
            onClose={() => setIsFormOpen(false)}
            onSuccess={handleFormSuccess}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}