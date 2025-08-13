import { useMutation } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Phone, Mail, MapPin, User, Building, Search, ChevronUp, ChevronDown, Edit, Trash2, List, Grid, Hash } from "lucide-react";
import { VendorForm } from "@/components/vendor-form";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useVendors } from "@/hooks/use-enhanced-queries";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/lib/utils";

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

  const { data: vendors, isLoading, error } = useVendors();

  // 디버깅 로그 추가
  console.log('🔍 거래처 목록 디버그:', {
    isLoading,
    error,
    errorMessage: error?.message,
    errorStack: error?.stack,
    vendors: vendors?.length || 0,
    vendorsType: typeof vendors,
    isArray: Array.isArray(vendors),
    firstVendor: vendors?.[0],
    userAuthenticated: !!user,
    userDetails: user ? { id: user.id, email: user.email, role: user.role } : null
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
        vendor.phone?.includes(query) ||
        vendor.email?.toLowerCase().includes(query) ||
        (vendor.aliases && Array.isArray(vendor.aliases) && 
          vendor.aliases.some((alias: string) => alias.toLowerCase().includes(query)))
      );
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
  }, [vendors, searchQuery, sortField, sortDirection]);

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1366px] mx-auto p-6">
        {/* Page Header - 표준화된 구조 */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-2xl font-bold text-gray-900">거래처 관리</h1>
            {user?.role === "admin" && (
              <Button 
                onClick={handleAddVendor} 
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                거래처 추가
              </Button>
            )}
          </div>
          <p className="text-sm text-gray-600">거래처 정보를 조회하고 관리하세요</p>
        </div>

        {/* Search Section */}
        <div className="mb-6">
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col xl:flex-row xl:items-end gap-3">
                {/* Search Section */}
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-700 block mb-1">검색</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="거래처명, 사업자번호로 검색..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`pl-8 h-10 text-sm ${searchQuery ? "border-blue-500 bg-blue-50" : ""}`}
                    />
                  </div>
                </div>

                {/* View Mode & Count */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">
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
        </div>

      {/* TOSS-style High-Density Vendors Display */}
      {viewMode === "table" ? (
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-200">
                  <TableHead 
                    className="px-6 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      <span>거래처명</span>
                      {getSortIcon("name")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="px-6 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort("businessNumber")}
                  >
                    <div className="flex items-center gap-1">
                      <span>사업자번호</span>
                      {getSortIcon("businessNumber")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="px-6 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort("industry")}
                  >
                    <div className="flex items-center gap-1">
                      <span>업종</span>
                      {getSortIcon("industry")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="px-6 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort("contactPerson")}
                  >
                    <div className="flex items-center gap-1">
                      <span>담당자</span>
                      {getSortIcon("contactPerson")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="px-6 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort("phone")}
                  >
                    <div className="flex items-center gap-1">
                      <span>연락처</span>
                      {getSortIcon("phone")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="px-6 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort("createdAt")}
                  >
                    <div className="flex items-center gap-1">
                      <span>등록일</span>
                      {getSortIcon("createdAt")}
                    </div>
                  </TableHead>
                  {user?.role === "admin" && (
                    <TableHead className="px-6 py-3 text-sm font-medium text-gray-600 text-right">
                      관리
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-3 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-3 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-3 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-3 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-3 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-3 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      {user?.role === "admin" && <TableCell></TableCell>}
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={user?.role === "admin" ? 7 : 6} className="text-center py-6 text-sm text-red-500">
                      오류: {error?.message || "거래처 데이터를 불러올 수 없습니다"}
                    </TableCell>
                  </TableRow>
                ) : filteredVendors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={user?.role === "admin" ? 7 : 6} className="text-center py-6 text-sm text-gray-500">
                      {searchQuery ? "검색 결과가 없습니다" : "등록된 거래처가 없습니다"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVendors.map((vendor: any) => (
                    <TableRow key={vendor.id} className="hover:bg-gray-50 border-b border-gray-100">
                      <TableCell className="py-4 px-6">
                        <div 
                          className="text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-700 overflow-hidden text-ellipsis whitespace-nowrap"
                          onClick={() => navigate(`/vendors/${vendor.id}`)}
                          title={vendor.name}
                        >
                          {vendor.name}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="text-sm text-gray-900">
                          {vendor.businessNumber || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        {vendor.industry ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-800">
                            {vendor.industry}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-900">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="text-sm text-gray-900">
                          {vendor.contactPerson || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="text-sm text-gray-900">
                          {vendor.phone || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="text-sm text-gray-900">
                          {formatDate(vendor.createdAt)}
                        </div>
                      </TableCell>
                      {user?.role === "admin" && (
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditVendor(vendor)}
                              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                              title="수정"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteVendor(vendor.id)}
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              title="삭제"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2">
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <Card key={i} className="shadow-sm">
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredVendors.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <Building className="mx-auto h-8 w-8 text-gray-400" />
              <p className="text-xs text-gray-500 mt-2">등록된 거래처가 없습니다.</p>
            </div>
          ) : (
            filteredVendors.map((vendor: any) => (
              <Card key={vendor.id} className="p-3 hover:shadow-md transition-shadow shadow-sm">
                {/* TOSS-style Card Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Building className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 cursor-pointer hover:text-blue-600" onClick={() => navigate(`/vendors/${vendor.id}`)}>
                        {vendor.name}
                      </h3>
                      {vendor.industry && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-800 mt-1">
                          {vendor.industry}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${vendor.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {vendor.isActive ? "활성" : "비활성"}
                  </span>
                </div>
                
                {/* TOSS-style Content Section */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center text-xs text-gray-600 gap-2">
                    <Hash className="h-3 w-3 text-gray-400" />
                    <span className="font-medium">사업자번호:</span>
                    <span className="ml-1">{vendor.businessNumber || '-'}</span>
                  </div>
                  {vendor.contactPerson && (
                    <div className="flex items-center text-xs text-gray-600 gap-2">
                      <User className="h-3 w-3 text-gray-400" />
                      <span className="font-medium">담당자:</span>
                      <span className="ml-1">{vendor.contactPerson}</span>
                    </div>
                  )}
                  {vendor.phone && (
                    <div className="flex items-center text-xs text-gray-600 gap-2">
                      <Phone className="h-3 w-3 text-gray-400" />
                      <span className="font-medium">전화번호:</span>
                      <span className="ml-1">{vendor.phone}</span>
                    </div>
                  )}
                </div>
                
                {/* TOSS-style Footer */}
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>등록일: {formatDate(vendor.createdAt)}</span>
                </div>
                
                {/* TOSS-style Admin Actions */}
                {user?.role === "admin" && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditVendor(vendor)}
                      className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                      title="수정"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteVendor(vendor.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      title="삭제"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
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
    </div>
  );
}