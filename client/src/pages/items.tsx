import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Search, ChevronUp, ChevronDown, Edit, Trash2, Package, Grid, List, Ruler, Scale, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate, formatKoreanWon } from "@/lib/utils";
import { ItemForm } from "@/components/item-form";
import type { Item } from "@shared/schema";

export default function Items() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  
  // View state management
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const { data: itemsData = { items: [], total: 0 }, isLoading } = useQuery({
    queryKey: ["/api/items", { category: selectedCategory === "all" ? undefined : selectedCategory, searchText: searchQuery }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: "1000" // Get all items for client-side filtering and sorting
      });
      
      if (selectedCategory !== "all") {
        params.append("category", selectedCategory);
      }
      
      if (searchQuery) {
        params.append("searchText", searchQuery);
      }
      
      const response = await fetch(`/api/items?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch items');
      return response.json();
    }
  });

  const { data: categoriesData = [] } = useQuery({
    queryKey: ["/api/items/categories"],
  });

  // 검색 및 정렬 기능
  const filteredItems = useMemo(() => {
    if (!itemsData.items || !Array.isArray(itemsData.items)) return [];
    
    let filtered = itemsData.items;
    
    // 카테고리 필터링
    if (selectedCategory !== "all") {
      filtered = filtered.filter((item: any) => item.category === selectedCategory);
    }
    
    // 검색 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item: any) =>
        item.name?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query) ||
        item.specification?.toLowerCase().includes(query) ||
        item.unit?.toLowerCase().includes(query)
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
        
        // 가격 필드는 숫자로 처리
        if (sortField === 'unitPrice') {
          aValue = parseFloat(aValue || '0');
          bValue = parseFloat(bValue || '0');
        } else if (sortField === 'createdAt' || sortField === 'updatedAt') {
          aValue = aValue ? new Date(aValue).getTime() : 0;
          bValue = bValue ? new Date(bValue).getTime() : 0;
        } else {
          aValue = String(aValue).toLowerCase();
          bValue = String(bValue).toLowerCase();
        }
        
        if (sortDirection === "asc") {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return bValue < aValue ? -1 : bValue > aValue ? 1 : 0;
        }
      });
    }

    return filtered;
  }, [itemsData.items, selectedCategory, searchQuery, sortField, sortDirection]);

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/items/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "성공",
        description: "품목이 삭제되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
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
        description: "품목 삭제에 실패했습니다.",
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

  const handleAddItem = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleDeleteItem = (id: number) => {
    if (confirm("정말로 이 품목을 삭제하시겠습니까?")) {
      deleteItemMutation.mutate(id);
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingItem(null);
    queryClient.invalidateQueries({ queryKey: ["/api/items"] });
  };



  const getCategoryBadgeVariant = (category: string) => {
    // 카테고리별 색상 구분
    const variants: Record<string, any> = {
      '강재': 'default',
      '강판': 'secondary',
      '단열재': 'outline',
      '도장재': 'destructive',
      '마감재': 'default',
      '방수재': 'secondary',
    };
    return variants[category] || 'outline';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1366px] mx-auto p-6 space-y-6">
      <PageHeader
        title="품목 관리"
        action={user?.role === "admin" ? (
          <Button onClick={handleAddItem} className="flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            품목 추가
          </Button>
        ) : undefined}
      />

      {/* Search and Filter Section */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="품목명, 카테고리, 규격으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
              <div className="w-full sm:w-48">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 카테고리</SelectItem>
                    {categoriesData.map((category: string) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {filteredItems.length}개 품목
              </span>
              
              {/* View Toggle Buttons */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="h-8 w-8 p-0"
                  title="목록 보기"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
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

      {/* Content based on view mode */}
      {viewMode === 'table' ? (
        <Card className="shadow-sm">
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
                        <span>품목명</span>
                        {getSortIcon("name")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="h-11 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                      onClick={() => handleSort("category")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>카테고리</span>
                        {getSortIcon("category")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="h-11 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                      onClick={() => handleSort("specification")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>규격</span>
                        {getSortIcon("specification")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="h-11 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                      onClick={() => handleSort("unit")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>단위</span>
                        {getSortIcon("unit")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="h-11 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                      onClick={() => handleSort("standardPrice")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>단가</span>
                        {getSortIcon("standardPrice")}
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
                    {user?.role === "admin" && (
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
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={user?.role === "admin" ? 7 : 6} className="text-center py-8 text-gray-500">
                      {searchQuery || selectedCategory !== "all" ? "검색 결과가 없습니다" : "등록된 품목이 없습니다"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item: any) => (
                    <TableRow key={item.id} className="h-12 hover:bg-gray-50 border-b border-gray-100">
                      <TableCell className="py-2 px-4">
                        <div 
                          className="text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800 hover:underline overflow-hidden text-ellipsis whitespace-nowrap"
                          onClick={() => navigate(`/items/${item.id}`)}
                          title={item.name}
                        >
                          {item.name}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-4">
                        {item.category ? (
                          <Badge variant={getCategoryBadgeVariant(item.category)} className="text-xs">
                            {item.category}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="py-2 px-4">
                        <div className="text-sm text-gray-600 max-w-32 truncate" title={item.specification}>
                          {item.specification || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-4">
                        <div className="text-sm text-gray-600">
                          {item.unit || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-4">
                        <div className="text-sm font-semibold text-blue-600">
                          {formatKoreanWon(item.standardPrice)}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-4">
                        <div className="text-sm text-gray-600">
                          {formatDate(item.createdAt)}
                        </div>
                      </TableCell>
                      {user?.role === "admin" && (
                        <TableCell className="py-2 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditItem(item)}
                              className="h-7 w-7 p-0"
                              title="수정"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteItem(item.id)}
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <Card key={i} className="p-6 shadow-sm">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-3"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </Card>
            ))
          ) : filteredItems.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              {searchQuery || selectedCategory !== "all" ? "검색 결과가 없습니다" : "등록된 품목이 없습니다"}
            </div>
          ) : (
            filteredItems.map((item: any) => (
              <Card key={item.id} className="p-4 hover:shadow-md transition-shadow shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600 truncate" onClick={() => navigate(`/items/${item.id}`)}>
                      {item.name}
                    </h3>
                    {item.category && (
                      <Badge variant={getCategoryBadgeVariant(item.category)} className="text-xs mt-1">
                        {item.category}
                      </Badge>
                    )}
                  </div>
                  {item.specification && (
                    <Badge variant="outline" className="text-xs ml-2 flex-shrink-0 max-w-[120px] truncate" title={item.specification}>
                      {item.specification}
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-2 mb-3">
                  <div className="flex items-center text-sm text-gray-600 gap-2">
                    <Ruler className="h-4 w-4" />
                    <span className="font-medium">규격:</span>
                    <span className="ml-1">{item.specification || '-'}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600 gap-2">
                    <Scale className="h-4 w-4" />
                    <span className="font-medium">단위:</span>
                    <span className="ml-1">{item.unit || '-'}</span>
                  </div>
                  <div className="flex items-center text-sm gap-2">
                    <DollarSign className="h-4 w-4 text-gray-600" />
                    <span className="font-medium text-gray-600">단가:</span>
                    <span className="ml-1 font-semibold text-blue-600">{formatKoreanWon(item.standardPrice)}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>등록일: {formatDate(item.createdAt)}</span>
                </div>
                
                {user?.role === "admin" && (
                  <div className="flex items-center justify-end -space-x-1 pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditItem(item)}
                      className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      title="수정"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteItem(item.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
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

      {/* Item Form Modal */}
      {isFormOpen && (
        <ItemForm
          isOpen={isFormOpen}
          item={editingItem}
          onClose={() => setIsFormOpen(false)}
          onSuccess={handleFormSuccess}
        />
      )}
      </div>
    </div>
  );
}