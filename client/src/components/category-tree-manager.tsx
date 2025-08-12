import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Move,
  Copy,
  MoreHorizontal
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

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

interface TreeNode extends ItemCategory {
  children: TreeNode[];
  level: number;
}

interface CategoryTreeManagerProps {
  onCategorySelect?: (category: ItemCategory) => void;
  selectedCategory?: ItemCategory | null;
  allowMultiSelect?: boolean;
}

function CategoryTreeManager({ 
  onCategorySelect, 
  selectedCategory,
  allowMultiSelect = false 
}: CategoryTreeManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [editingNodeId, setEditingNodeId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [selectedNodes, setSelectedNodes] = useState<Set<number>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormParentId, setAddFormParentId] = useState<number | null>(null);
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
      setShowAddForm(false);
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
      setEditingNodeId(null);
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
      setSelectedNodes(new Set());
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

  // 계층 구조 트리 생성
  const treeData = useMemo(() => {
    const buildTree = (parentId: number | null, level: number = 0): TreeNode[] => {
      return categories
        .filter((cat: ItemCategory) => cat.parentId === parentId)
        .sort((a: ItemCategory, b: ItemCategory) => a.displayOrder - b.displayOrder)
        .map((cat: ItemCategory) => ({
          ...cat,
          level,
          children: buildTree(cat.id, level + 1)
        }));
    };
    
    return buildTree(null);
  }, [categories]);

  // 트리 노드 토글
  const toggleNode = (nodeId: number) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // 모든 노드 확장/축소
  const toggleAllNodes = (expand: boolean) => {
    if (expand) {
      const allIds = categories.map((cat: ItemCategory) => cat.id);
      setExpandedNodes(new Set(allIds));
    } else {
      setExpandedNodes(new Set());
    }
  };

  // 인라인 편집 시작
  const startEditing = (node: TreeNode) => {
    setEditingNodeId(node.id);
    setEditingValue(node.categoryName);
  };

  // 인라인 편집 저장
  const saveEdit = () => {
    if (!editingValue.trim()) {
      toast({
        title: "입력 오류",
        description: "분류명을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    updateCategoryMutation.mutate({
      id: editingNodeId!,
      data: { categoryName: editingValue.trim() }
    });
  };

  // 인라인 편집 취소
  const cancelEdit = () => {
    setEditingNodeId(null);
    setEditingValue('');
  };

  // 노드 선택 처리
  const handleNodeSelect = (node: TreeNode, isChecked: boolean) => {
    const newSelected = new Set(selectedNodes);
    
    if (allowMultiSelect) {
      if (isChecked) {
        newSelected.add(node.id);
      } else {
        newSelected.delete(node.id);
      }
      setSelectedNodes(newSelected);
    } else {
      onCategorySelect?.(node);
    }
  };

  // 새 분류 추가 폼 표시
  const showAddFormForParent = (parentId: number | null, categoryType: 'major' | 'middle' | 'minor') => {
    setAddFormParentId(parentId);
    setNewCategory({
      categoryType,
      categoryName: '',
      parentId,
      displayOrder: 0
    });
    setShowAddForm(true);
  };

  // 새 분류 추가
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

  // 선택된 항목들 일괄 삭제
  const handleBulkDelete = () => {
    if (selectedNodes.size === 0) return;
    
    if (confirm(`선택된 ${selectedNodes.size}개의 분류를 삭제하시겠습니까?`)) {
      selectedNodes.forEach(id => {
        deleteCategoryMutation.mutate(id);
      });
    }
  };

  // 트리 노드 렌더링
  const renderTreeNode = (node: TreeNode): JSX.Element => {
    const isExpanded = expandedNodes.has(node.id);
    const isEditing = editingNodeId === node.id;
    const isSelected = selectedNodes.has(node.id) || selectedCategory?.id === node.id;
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id} className="select-none">
        <div 
          className={`flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 group ${
            isSelected ? 'bg-blue-50 border border-blue-200' : ''
          }`}
          style={{ paddingLeft: `${(node.level * 24) + 8}px` }}
        >
          {/* 확장/축소 버튼 */}
          <div className="w-4 h-4 flex items-center justify-center">
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="w-4 h-4 p-0"
                onClick={() => toggleNode(node.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </Button>
            )}
          </div>

          {/* 체크박스 (다중 선택 모드) */}
          {allowMultiSelect && (
            <Checkbox
              checked={selectedNodes.has(node.id)}
              onCheckedChange={(checked) => handleNodeSelect(node, !!checked)}
            />
          )}

          {/* 분류 유형 표시 */}
          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
            node.categoryType === 'major' ? 'bg-blue-100 text-blue-800' :
            node.categoryType === 'middle' ? 'bg-green-100 text-green-800' :
            'bg-orange-100 text-orange-800'
          }`}>
            {node.categoryType === 'major' ? '대' :
             node.categoryType === 'middle' ? '중' : '소'}
          </span>

          {/* 분류명 (편집 모드) */}
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                className="h-8"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit();
                  if (e.key === 'Escape') cancelEdit();
                }}
                autoFocus
              />
              <Button size="sm" onClick={saveEdit}>
                <Save className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="outline" onClick={cancelEdit}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <span 
              className={`flex-1 cursor-pointer hover:text-blue-600 ${
                isSelected ? 'text-blue-600 font-semibold' : ''
              }`}
              onClick={() => !allowMultiSelect && onCategorySelect?.(node)}
            >
              {node.categoryName}
            </span>
          )}

          {/* 액션 버튼들 */}
          {!isEditing && (
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => startEditing(node)}
                className="h-6 w-6 p-0"
              >
                <Edit className="w-3 h-3" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <MoreHorizontal className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {node.categoryType !== 'minor' && (
                    <DropdownMenuItem onClick={() => {
                      const nextType = node.categoryType === 'major' ? 'middle' : 'minor';
                      showAddFormForParent(node.id, nextType);
                    }}>
                      <Plus className="w-3 h-3 mr-2" />
                      하위 분류 추가
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => deleteCategoryMutation.mutate(node.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-3 h-3 mr-2" />
                    삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* 자식 노드들 */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>품목 분류 관리</CardTitle>
          <div className="flex items-center gap-2">
            {allowMultiSelect && selectedNodes.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                선택 삭제 ({selectedNodes.size})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAllNodes(expandedNodes.size === 0)}
            >
              {expandedNodes.size === 0 ? '모두 확장' : '모두 축소'}
            </Button>
            <Button
              size="sm"
              onClick={() => showAddFormForParent(null, 'major')}
            >
              <Plus className="w-4 h-4 mr-2" />
              대분류 추가
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* 새 분류 추가 폼 */}
        {showAddForm && (
          <div className="mb-4 p-4 border rounded-lg bg-gray-50">
            <h4 className="font-medium mb-3">새 분류 추가</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>분류 유형</Label>
                <Select 
                  value={newCategory.categoryType} 
                  onValueChange={(value: any) => setNewCategory({...newCategory, categoryType: value})}
                >
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
              <div>
                <Label>분류명</Label>
                <Input
                  value={newCategory.categoryName}
                  onChange={(e) => setNewCategory({...newCategory, categoryName: e.target.value})}
                  placeholder="분류명을 입력하세요"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={handleAddCategory}>
                추가
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}>
                취소
              </Button>
            </div>
          </div>
        )}

        {/* 트리 뷰 */}
        <div className="space-y-1 max-h-[600px] overflow-y-auto">
          {treeData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              등록된 분류가 없습니다.
            </div>
          ) : (
            treeData.map(node => renderTreeNode(node))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default CategoryTreeManager;