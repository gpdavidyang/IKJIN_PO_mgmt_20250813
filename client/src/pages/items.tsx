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
import { useTheme } from "@/components/ui/theme-provider";
import type { Item } from "@shared/schema";

export default function Items() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
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
    <div className={`min-h-screen transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
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
      <Card className={`shadow-sm transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                <Input
                  placeholder="품목명, 카테고리, 규격으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-10 h-10 transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder:text-gray-400' : 'bg-white border-gray-300'}`}
                />
              </div>
              <div className="w-full sm:w-48">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className={`h-10 transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}>
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
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
              <span className={`text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {filteredItems.length}개 품목
              </span>
              
              {/* View Toggle Buttons */}
              <div className={`flex items-center rounded-lg p-1 transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
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
        <Card className={`shadow-sm transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className={`border-b transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                    <TableHead 
                      className={`h-11 px-4 text-sm font-semibold cursor-pointer select-none transition-colors ${
                        isDarkMode 
                          ? 'text-gray-400 hover:bg-gray-700' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>품목명</span>
                        {getSortIcon("name")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className={`h-11 px-4 text-sm font-semibold cursor-pointer select-none transition-colors ${
                        isDarkMode 
                          ? 'text-gray-400 hover:bg-gray-700' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => handleSort("category")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>카테고리</span>
                        {getSortIcon("category")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className={`h-11 px-4 text-sm font-semibold cursor-pointer select-none transition-colors ${
                        isDarkMode 
                          ? 'text-gray-400 hover:bg-gray-700' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => handleSort("specification")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>규격</span>
                        {getSortIcon("specification")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className={`h-11 px-4 text-sm font-semibold cursor-pointer select-none transition-colors ${
                        isDarkMode 
                          ? 'text-gray-400 hover:bg-gray-700' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => handleSort("unit")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>단위</span>
                        {getSortIcon("unit")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className={`h-11 px-4 text-sm font-semibold cursor-pointer select-none transition-colors ${
                        isDarkMode 
                          ? 'text-gray-400 hover:bg-gray-700' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => handleSort("standardPrice")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>단가</span>
                        {getSortIcon("standardPrice")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className={`h-11 px-4 text-sm font-semibold cursor-pointer select-none transition-colors ${
                        isDarkMode 
                          ? 'text-gray-400 hover:bg-gray-700' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => handleSort("createdAt")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>등록일</span>
                        {getSortIcon("createdAt")}
                      </div>
                    </TableHead>
                    {user?.role === "admin" && (
                      <TableHead className={`h-11 px-4 text-sm font-semibold text-right transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                        관리
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className={`h-4 rounded animate-pulse ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div></TableCell>
                      <TableCell><div className={`h-4 rounded animate-pulse ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div></TableCell>
                      <TableCell><div className={`h-4 rounded animate-pulse ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div></TableCell>
                      <TableCell><div className={`h-4 rounded animate-pulse ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div></TableCell>
                      <TableCell><div className={`h-4 rounded animate-pulse ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div></TableCell>
                      <TableCell><div className={`h-4 rounded animate-pulse ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div></TableCell>
                      {user?.role === "admin" && <TableCell></TableCell>}
                    </TableRow>
                  ))
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={user?.role === "admin" ? 7 : 6} className={`text-center py-8 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {searchQuery || selectedCategory !== "all" ? "검색 결과가 없습니다" : "등록된 품목이 없습니다"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item: any) => (
                    <TableRow key={item.id} className={`h-12 border-b transition-colors ${
                      isDarkMode 
                        ? 'hover:bg-gray-700 border-gray-600' 
                        : 'hover:bg-gray-50 border-gray-100'
                    }`}>
                      <TableCell className="py-2 px-4">
                        <div 
                          className={`text-sm font-medium cursor-pointer hover:underline overflow-hidden text-ellipsis whitespace-nowrap transition-colors ${
                            isDarkMode 
                              ? 'text-blue-400 hover:text-blue-300' 
                              : 'text-blue-600 hover:text-blue-800'
                          }`}
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
                        <div className={`text-sm max-w-32 truncate transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} title={item.specification}>
                          {item.specification || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-4">
                        <div className={`text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {item.unit || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-4">
                        <div className={`text-sm font-semibold transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                          {formatKoreanWon(item.standardPrice)}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-4">
                        <div className={`text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
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
                              className={`h-7 w-7 p-0 transition-colors ${
                                isDarkMode 
                                  ? 'text-red-400 hover:text-red-300' 
                                  : 'text-red-600 hover:text-red-700'
                              }`}
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
              <Card key={i} className={`p-6 shadow-sm transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="animate-pulse">
                  <div className={`h-4 rounded mb-3 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div>
                  <div className={`h-3 rounded w-3/4 mb-2 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div>
                  <div className={`h-3 rounded w-1/2 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div>
                </div>
              </Card>
            ))
          ) : filteredItems.length === 0 ? (
            <div className={`col-span-full text-center py-8 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {searchQuery || selectedCategory !== "all" ? "검색 결과가 없습니다" : "등록된 품목이 없습니다"}
            </div>
          ) : (
            filteredItems.map((item: any) => (
              <Card key={item.id} className={`p-4 hover:shadow-md transition-shadow shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold cursor-pointer truncate transition-colors ${
                      isDarkMode 
                        ? 'text-gray-100 hover:text-blue-400' 
                        : 'text-gray-900 hover:text-blue-600'
                    }`} onClick={() => navigate(`/items/${item.id}`)}>
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
                  <div className={`flex items-center text-sm gap-2 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Ruler className="h-4 w-4" />
                    <span className="font-medium">규격:</span>
                    <span className="ml-1">{item.specification || '-'}</span>
                  </div>
                  <div className={`flex items-center text-sm gap-2 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Scale className="h-4 w-4" />
                    <span className="font-medium">단위:</span>
                    <span className="ml-1">{item.unit || '-'}</span>
                  </div>
                  <div className="flex items-center text-sm gap-2">
                    <DollarSign className={`h-4 w-4 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                    <span className={`font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>단가:</span>
                    <span className={`ml-1 font-semibold transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{formatKoreanWon(item.standardPrice)}</span>
                  </div>
                </div>
                
                <div className={`flex items-center justify-between text-xs mb-3 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <span>등록일: {formatDate(item.createdAt)}</span>
                </div>
                
                {user?.role === "admin" && (
                  <div className={`flex items-center justify-end -space-x-1 pt-2 border-t transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditItem(item)}
                      className={`h-8 w-8 p-0 transition-colors ${
                        isDarkMode 
                          ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-900/20' 
                          : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                      }`}
                      title="수정"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteItem(item.id)}
                      className={`h-8 w-8 p-0 transition-colors ${
                        isDarkMode 
                          ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20' 
                          : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                      }`}
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