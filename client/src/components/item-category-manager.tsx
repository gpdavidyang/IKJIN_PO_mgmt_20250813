import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, Plus, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ItemCategory {
  id: number;
  categoryType: 'major' | 'middle' | 'minor';
  categoryName: string;
  parentId: number | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CategoryManagerProps {
  onCategorySelect?: (category: ItemCategory) => void;
  selectedCategory?: ItemCategory | null;
}

export function ItemCategoryManager({ onCategorySelect, selectedCategory }: CategoryManagerProps = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ItemCategory | null>(null);
  const [newCategory, setNewCategory] = useState({
    categoryType: 'major' as 'major' | 'middle' | 'minor',
    categoryName: '',
    parentId: null as number | null,
    displayOrder: 0
  });

  // 모든 분류 조회
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/item-categories'],
    queryFn: () => apiRequest('GET', '/api/item-categories')
  });

  // 분류 생성 mutation
  const createCategoryMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/item-categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/item-categories'] });
      setIsAddDialogOpen(false);
      setNewCategory({
        categoryType: 'major',
        categoryName: '',
        parentId: null,
        displayOrder: 0
      });
      toast({
        title: "분류 추가 완료",
        description: "새로운 분류가 추가되었습니다."
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "분류 추가 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  // 분류 수정 mutation
  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest('PUT', `/api/item-categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/item-categories'] });
      setEditingCategory(null);
      toast({
        title: "분류 수정 완료",
        description: "분류가 수정되었습니다."
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "분류 수정 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  // 분류 삭제 mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/item-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/item-categories'] });
      toast({
        title: "분류 삭제 완료",
        description: "분류가 삭제되었습니다."
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "분류 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  // 분류별로 그룹화
  const majorCategories = categories.filter((c: ItemCategory) => c.categoryType === 'major');
  const middleCategories = categories.filter((c: ItemCategory) => c.categoryType === 'middle');
  const minorCategories = categories.filter((c: ItemCategory) => c.categoryType === 'minor');

  const handleAddCategory = () => {
    if (!newCategory.categoryName.trim()) {
      toast({
        title: "입력 오류",
        description: "분류명을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    createCategoryMutation.mutate(newCategory);
  };

  const handleEditCategory = (category: ItemCategory) => {
    setEditingCategory(category);
  };

  const handleUpdateCategory = () => {
    if (!editingCategory) return;

    updateCategoryMutation.mutate({
      id: editingCategory.id,
      data: {
        categoryName: editingCategory.categoryName,
        displayOrder: editingCategory.displayOrder
      }
    });
  };

  const handleDeleteCategory = (id: number) => {
    if (confirm('정말로 이 분류를 삭제하시겠습니까?')) {
      deleteCategoryMutation.mutate(id);
    }
  };

  const getParentOptions = (type: 'major' | 'middle' | 'minor') => {
    if (type === 'major') return [];
    if (type === 'middle') return majorCategories;
    if (type === 'minor') return middleCategories;
    return [];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">품목 분류 관리</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              분류 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 분류 추가</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="categoryType">분류 유형</Label>
                <Select value={newCategory.categoryType} onValueChange={(value: any) => 
                  setNewCategory({...newCategory, categoryType: value, parentId: null})
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="major">대분류</SelectItem>
                    <SelectItem value="middle">중분류</SelectItem>
                    <SelectItem value="minor">소분류</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newCategory.categoryType !== 'major' && (
                <div>
                  <Label htmlFor="parentId">상위 분류</Label>
                  <Select value={newCategory.parentId?.toString() || ''} onValueChange={(value) => 
                    setNewCategory({...newCategory, parentId: value ? parseInt(value) : null})
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="상위 분류를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {getParentOptions(newCategory.categoryType).map((parent: ItemCategory) => (
                        <SelectItem key={parent.id} value={parent.id.toString()}>
                          {parent.categoryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="categoryName">분류명</Label>
                <Input
                  id="categoryName"
                  value={newCategory.categoryName}
                  onChange={(e) => setNewCategory({...newCategory, categoryName: e.target.value})}
                  placeholder="분류명을 입력하세요"
                />
              </div>

              <div>
                <Label htmlFor="displayOrder">표시 순서</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  value={newCategory.displayOrder}
                  onChange={(e) => setNewCategory({...newCategory, displayOrder: parseInt(e.target.value) || 0})}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleAddCategory} disabled={createCategoryMutation.isPending}>
                  추가
                </Button>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  취소
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 대분류 */}
        <Card>
          <CardHeader>
            <CardTitle>대분류</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {majorCategories.map((category: ItemCategory) => (
                <div key={category.id} className="flex items-center justify-between p-2 border rounded">
                  {editingCategory?.id === category.id ? (
                    <div className="flex-1 flex gap-2">
                      <Input
                        value={editingCategory.categoryName}
                        onChange={(e) => setEditingCategory({...editingCategory, categoryName: e.target.value})}
                        className="h-8"
                      />
                      <Button size="sm" onClick={handleUpdateCategory}>저장</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingCategory(null)}>취소</Button>
                    </div>
                  ) : (
                    <>
                      <span 
                        className={`cursor-pointer hover:text-blue-600 ${
                          selectedCategory?.id === category.id ? 'text-blue-600 font-semibold' : ''
                        }`}
                        onClick={() => onCategorySelect?.(category)}
                      >
                        {category.categoryName}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditCategory(category)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 중분류 */}
        <Card>
          <CardHeader>
            <CardTitle>중분류</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {middleCategories.map((category: ItemCategory) => (
                <div key={category.id} className="flex items-center justify-between p-2 border rounded">
                  {editingCategory?.id === category.id ? (
                    <div className="flex-1 flex gap-2">
                      <Input
                        value={editingCategory.categoryName}
                        onChange={(e) => setEditingCategory({...editingCategory, categoryName: e.target.value})}
                        className="h-8"
                      />
                      <Button size="sm" onClick={handleUpdateCategory}>저장</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingCategory(null)}>취소</Button>
                    </div>
                  ) : (
                    <>
                      <span 
                        className={`cursor-pointer hover:text-blue-600 ${
                          selectedCategory?.id === category.id ? 'text-blue-600 font-semibold' : ''
                        }`}
                        onClick={() => onCategorySelect?.(category)}
                      >
                        {category.categoryName}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditCategory(category)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 소분류 */}
        <Card>
          <CardHeader>
            <CardTitle>소분류</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {minorCategories.map((category: ItemCategory) => (
                <div key={category.id} className="flex items-center justify-between p-2 border rounded">
                  {editingCategory?.id === category.id ? (
                    <div className="flex-1 flex gap-2">
                      <Input
                        value={editingCategory.categoryName}
                        onChange={(e) => setEditingCategory({...editingCategory, categoryName: e.target.value})}
                        className="h-8"
                      />
                      <Button size="sm" onClick={handleUpdateCategory}>저장</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingCategory(null)}>취소</Button>
                    </div>
                  ) : (
                    <>
                      <span 
                        className={`cursor-pointer hover:text-blue-600 ${
                          selectedCategory?.id === category.id ? 'text-blue-600 font-semibold' : ''
                        }`}
                        onClick={() => onCategorySelect?.(category)}
                      >
                        {category.categoryName}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditCategory(category)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 편집 다이얼로그 */}
      <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>분류 수정</DialogTitle>
          </DialogHeader>
          {editingCategory && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editCategoryName">분류명</Label>
                <Input
                  id="editCategoryName"
                  value={editingCategory.categoryName}
                  onChange={(e) => setEditingCategory({...editingCategory, categoryName: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="editDisplayOrder">표시 순서</Label>
                <Input
                  id="editDisplayOrder"
                  type="number"
                  value={editingCategory.displayOrder}
                  onChange={(e) => setEditingCategory({...editingCategory, displayOrder: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdateCategory} disabled={updateCategoryMutation.isPending}>
                  저장
                </Button>
                <Button variant="outline" onClick={() => setEditingCategory(null)}>
                  취소
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}