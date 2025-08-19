import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  Move,
  Copy,
  Download,
  Upload,
  Undo,
  Redo,
  Eye,
  EyeOff,
  ChevronUp,
  Grid,
  TreePine,
  FolderPlus,
  Settings,
  ZoomIn,
  ZoomOut,
  Target,
  Layers,
  Archive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

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
  path: number[];
  isExpanded?: boolean;
  isVisible?: boolean;
  isEditing?: boolean;
  isSelected?: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
}

interface HistoryState {
  categories: ItemCategory[];
  timestamp: number;
  action: string;
}

interface FilterOptions {
  searchTerm: string;
  categoryType: 'all' | 'major' | 'middle' | 'minor';
  isActive: 'all' | 'active' | 'inactive';
  parentId: number | null;
}

// Category Type Configurations
const CATEGORY_CONFIGS = {
  major: {
    label: '대분류',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: '🏗️',
    maxLevel: 0,
    canHaveChildren: true,
  },
  middle: {
    label: '중분류',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: '📁',
    maxLevel: 1,
    canHaveChildren: true,
  },
  minor: {
    label: '소분류',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: '📄',
    maxLevel: 2,
    canHaveChildren: false,
  },
};

// Enhanced Category Node Component
function EnhancedCategoryNode({ 
  node, 
  onEdit, 
  onDelete, 
  onToggle, 
  onSelect, 
  onAddChild,
  onMove,
  searchTerm,
  isMultiSelectMode,
  selectedNodes 
}: {
  node: TreeNode;
  onEdit: (node: TreeNode) => void;
  onDelete: (node: TreeNode) => void;
  onToggle: (node: TreeNode) => void;
  onSelect: (node: TreeNode, isMulti?: boolean) => void;
  onAddChild: (parent: TreeNode) => void;
  onMove: (draggedNode: TreeNode, targetNode: TreeNode, position: 'before' | 'after' | 'inside') => void;
  searchTerm: string;
  isMultiSelectMode: boolean;
  selectedNodes: Set<number>;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedOver, setDraggedOver] = useState<'before' | 'after' | 'inside' | null>(null);

  // Native HTML5 drag and drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    console.log('Drag started for:', node.categoryName);
    setIsDragging(true);
    
    // Set multiple data formats for better browser compatibility
    const dragData = {
      id: node.id,
      categoryName: node.categoryName,
      categoryType: node.categoryType,
      parentId: node.parentId,
      displayOrder: node.displayOrder,
      node: {
        id: node.id,
        categoryName: node.categoryName,
        categoryType: node.categoryType,
        parentId: node.parentId,
        displayOrder: node.displayOrder,
        isActive: node.isActive
      }
    };
    
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.setData('text/plain', `category-${node.id}`);
    e.dataTransfer.effectAllowed = 'move';
    
    // Create custom drag image for better visual feedback
    if (nodeRef.current) {
      const dragImage = nodeRef.current.cloneNode(true) as HTMLElement;
      dragImage.style.transform = 'rotate(2deg)';
      dragImage.style.opacity = '0.9';
      dragImage.style.backgroundColor = '#3b82f6';
      dragImage.style.color = 'white';
      dragImage.style.borderRadius = '8px';
      dragImage.style.padding = '8px';
      dragImage.style.position = 'absolute';
      dragImage.style.top = '-1000px';
      dragImage.style.left = '-1000px';
      dragImage.style.pointerEvents = 'none';
      dragImage.style.maxWidth = '250px';
      dragImage.style.zIndex = '9999';
      
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 20, 20);
      
      // Clean up drag image after a short delay
      setTimeout(() => {
        if (document.body.contains(dragImage)) {
          document.body.removeChild(dragImage);
        }
      }, 100);
    }
  };

  const handleDragEnd = () => {
    console.log('Drag ended for:', node.categoryName);
    setIsDragging(false);
    setDraggedOver(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Set drop effect first
    e.dataTransfer.dropEffect = 'move';

    if (nodeRef.current) {
      const rect = nodeRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = rect.height;

      // More precise position detection
      if (y < height * 0.25) {
        setDraggedOver('before');
      } else if (y > height * 0.75) {
        setDraggedOver('after');
      } else {
        // Check if node can have children for 'inside' drop
        if (CATEGORY_CONFIGS[node.categoryType].canHaveChildren) {
          setDraggedOver('inside');
        } else {
          // If can't have children, determine before/after based on middle position
          setDraggedOver(y < height * 0.5 ? 'before' : 'after');
        }
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only reset draggedOver if we're actually leaving the element
    // This prevents flickering during dragover events on child elements
    if (nodeRef.current && !nodeRef.current.contains(e.relatedTarget as Node)) {
      setDraggedOver(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const currentDraggedOver = draggedOver;
    setDraggedOver(null);

    try {
      const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
      console.log('Drop data:', dragData, 'Target:', node, 'Position:', currentDraggedOver);
      
      if (dragData.node && dragData.node.id !== node.id && currentDraggedOver) {
        // Additional validation
        if (dragData.node.id === node.id) {
          console.log('Cannot drop on self');
          return;
        }
        
        // Check for valid drop position
        if (currentDraggedOver === 'inside' && !CATEGORY_CONFIGS[node.categoryType].canHaveChildren) {
          console.log('Target cannot have children');
          return;
        }
        
        console.log('Executing move:', dragData.node.categoryName, currentDraggedOver, node.categoryName);
        onMove(dragData.node, node, currentDraggedOver);
      }
    } catch (error) {
      console.error('Error parsing drag data:', error);
    }
  };

  // Highlight search terms
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;
    const regex = new RegExp(`(${search})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  const config = CATEGORY_CONFIGS[node.categoryType];
  const hasChildren = node.children.length > 0;
  const isSelected = selectedNodes.has(node.id);
  const canAddChildren = config.canHaveChildren;

  return (
    <div 
      ref={nodeRef}
      className={`relative ${isDragging ? 'opacity-50' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop indicators */}
      {draggedOver === 'before' && (
        <div className="absolute -top-1 left-0 right-0 h-1 bg-blue-500 rounded-full shadow-lg z-10 animate-pulse" />
      )}
      {draggedOver === 'after' && (
        <div className="absolute -bottom-1 left-0 right-0 h-1 bg-blue-500 rounded-full shadow-lg z-10 animate-pulse" />
      )}
      
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className={`
              flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer
              ${isSelected ? 'bg-blue-50 border-blue-300 shadow-sm' : 'hover:bg-gray-50 border-gray-200'}
              ${draggedOver === 'inside' ? 'bg-blue-100 border-blue-400 shadow-lg' : ''}
              ${isDragging ? 'shadow-lg transform scale-95' : ''}
              ${draggedOver ? 'ring-2 ring-blue-300 ring-opacity-50' : ''}
            `}
            style={{ marginLeft: `${node.level * 24}px` }}
            onClick={(e) => {
              e.preventDefault();
              onSelect(node, e.ctrlKey || e.metaKey || isMultiSelectMode);
            }}
          >
            {/* Expand/Collapse Button */}
            <div className="w-6 h-6 flex items-center justify-center">
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-5 h-5 p-0 hover:bg-gray-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(node);
                  }}
                >
                  {node.isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>

            {/* Multi-select checkbox */}
            {isMultiSelectMode && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onSelect(node, true)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
            )}

            {/* Category Type Badge */}
            <Badge 
              variant="secondary" 
              className={`${config.color} text-xs font-medium px-2 py-1 border`}
            >
              <span className="mr-1">{config.icon}</span>
              {config.label}
            </Badge>

            {/* Category Name */}
            <span className="flex-1 font-medium text-gray-900">
              {highlightText(node.categoryName, searchTerm)}
              {isDragging && <span className="ml-2 text-xs text-blue-600">(드래그 중)</span>}
            </span>

            {/* Status Indicators */}
            <div className="flex items-center gap-2">
              {!node.isActive && (
                <Badge variant="outline" className="text-gray-500 border-gray-300">
                  비활성
                </Badge>
              )}
              
              {hasChildren && (
                <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">
                  {node.children.length}개
                </Badge>
              )}
            </div>

            {/* Action Buttons (shown on hover or when selected) */}
            {(isHovered || isSelected) && (
              <div className="flex items-center gap-1 transition-opacity duration-200">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-8 h-8 p-0 hover:bg-blue-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(node);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>편집</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {canAddChildren && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-8 h-8 p-0 hover:bg-green-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddChild(node);
                          }}
                        >
                          <FolderPlus className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>하위 분류 추가</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-8 h-8 p-0 hover:bg-red-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(node);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>삭제</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        </ContextMenuTrigger>
        
        <ContextMenuContent className="w-56">
          <ContextMenuItem onClick={() => onEdit(node)}>
            <Edit className="w-4 h-4 mr-2" />
            편집
          </ContextMenuItem>
          
          {canAddChildren && (
            <ContextMenuItem onClick={() => onAddChild(node)}>
              <Plus className="w-4 h-4 mr-2" />
              하위 분류 추가
            </ContextMenuItem>
          )}
          
          <ContextMenuSeparator />
          
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Copy className="w-4 h-4 mr-2" />
              복사
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem>이름만 복사</ContextMenuItem>
              <ContextMenuItem>구조와 함께 복사</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
          
          <ContextMenuItem>
            <Move className="w-4 h-4 mr-2" />
            이동
          </ContextMenuItem>
          
          <ContextMenuSeparator />
          
          <ContextMenuItem 
            onClick={() => onDelete(node)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            삭제
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Children */}
      {hasChildren && node.isExpanded && (
        <div className="mt-2 space-y-1">
          {node.children.map((child) => (
            <EnhancedCategoryNode
              key={child.id}
              node={child}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggle={onToggle}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onMove={onMove}
              searchTerm={searchTerm}
              isMultiSelectMode={isMultiSelectMode}
              selectedNodes={selectedNodes}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Main Category Hierarchy Builder Component
export default function CategoryHierarchyBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State Management
  const [viewMode, setViewMode] = useState<'tree' | 'grid'>('tree');
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<Set<number>>(new Set());
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [editingNode, setEditingNode] = useState<TreeNode | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addParent, setAddParent] = useState<TreeNode | null>(null);
  const [isDragOperationInProgress, setIsDragOperationInProgress] = useState(false);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    categoryType: 'all',
    isActive: 'all',
    parentId: null,
  });
  const [zoom, setZoom] = useState(100);
  const [showInactive, setShowInactive] = useState(true);

  // Form State
  const [newCategory, setNewCategory] = useState({
    categoryType: 'major' as 'major' | 'middle' | 'minor',
    categoryName: '',
    parentId: null as number | null,
    displayOrder: 0,
    isActive: true,
  });

  // API Queries and Mutations
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['/api/item-categories'],
    queryFn: () => apiRequest('GET', '/api/item-categories'),
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/item-categories', data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/item-categories'] });
      setIsAddDialogOpen(false);
      resetForm();
      addToHistory('Created category: ' + data.categoryName);
      toast({ title: "분류 추가 완료", description: "새로운 분류가 추가되었습니다." });
    },
    onError: () => {
      toast({ title: "오류", description: "분류 추가 중 오류가 발생했습니다.", variant: "destructive" });
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest('PUT', `/api/item-categories/${id}`, data),
    onSuccess: (data) => {
      // Force refetch to ensure UI is updated immediately
      queryClient.invalidateQueries({ queryKey: ['/api/item-categories'] });
      queryClient.refetchQueries({ queryKey: ['/api/item-categories'] });
      setEditingNode(null);
      addToHistory('Updated category: ' + (data.categoryName || 'Unknown'));
      console.log('Category updated successfully:', data);
    },
    onError: (error) => {
      console.error('Category update error:', error);
      toast({ title: "오류", description: "분류 수정 중 오류가 발생했습니다.", variant: "destructive" });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/item-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/item-categories'] });
      setSelectedNodes(new Set());
      addToHistory('Deleted category');
      toast({ title: "분류 삭제 완료", description: "분류가 삭제되었습니다." });
    },
    onError: () => {
      toast({ title: "오류", description: "분류 삭제 중 오류가 발생했습니다.", variant: "destructive" });
    }
  });

  // Build tree structure
  const treeData = useMemo(() => {
    const buildTree = (parentId: number | null, level: number = 0): TreeNode[] => {
      return categories
        .filter((cat: ItemCategory) => cat.parentId === parentId)
        .filter((cat: ItemCategory) => {
          // Apply filters
          if (!showInactive && !cat.isActive) return false;
          if (filters.categoryType !== 'all' && cat.categoryType !== filters.categoryType) return false;
          if (filters.isActive !== 'all') {
            if (filters.isActive === 'active' && !cat.isActive) return false;
            if (filters.isActive === 'inactive' && cat.isActive) return false;
          }
          if (searchTerm && !cat.categoryName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
          return true;
        })
        .sort((a: ItemCategory, b: ItemCategory) => a.displayOrder - b.displayOrder)
        .map((cat: ItemCategory) => ({
          ...cat,
          level,
          path: [], // Would be calculated properly in real implementation
          children: buildTree(cat.id, level + 1),
          isExpanded: expandedNodes.has(cat.id),
          isVisible: true,
          isEditing: false,
          isSelected: selectedNodes.has(cat.id),
          isDragging: false,
          isDropTarget: false,
        }));
    };
    
    return buildTree(null);
  }, [categories, expandedNodes, selectedNodes, showInactive, filters, searchTerm]);

  // History Management
  const addToHistory = useCallback((action: string) => {
    const newState: HistoryState = {
      categories: [...categories],
      timestamp: Date.now(),
      action,
    };
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    
    // Keep only last 50 actions
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [categories, history, historyIndex]);

  // Event Handlers
  const handleNodeSelect = useCallback((node: TreeNode, isMulti = false) => {
    if (isMulti || isMultiSelectMode) {
      const newSelected = new Set(selectedNodes);
      if (newSelected.has(node.id)) {
        newSelected.delete(node.id);
      } else {
        newSelected.add(node.id);
      }
      setSelectedNodes(newSelected);
    } else {
      setSelectedNodes(new Set([node.id]));
    }
  }, [selectedNodes, isMultiSelectMode]);

  const handleNodeToggle = useCallback((node: TreeNode) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(node.id)) {
      newExpanded.delete(node.id);
    } else {
      newExpanded.add(node.id);
    }
    setExpandedNodes(newExpanded);
  }, [expandedNodes]);

  const handleEdit = useCallback((node: TreeNode) => {
    setEditingNode(node);
    setNewCategory({
      categoryType: node.categoryType,
      categoryName: node.categoryName,
      parentId: node.parentId,
      displayOrder: node.displayOrder,
      isActive: node.isActive,
    });
    setIsAddDialogOpen(true);
  }, []);

  const handleAddChild = useCallback((parent: TreeNode) => {
    const nextType = parent.categoryType === 'major' ? 'middle' : 'minor';
    setAddParent(parent);
    setNewCategory({
      categoryType: nextType,
      categoryName: '',
      parentId: parent.id,
      displayOrder: parent.children.length,
      isActive: true,
    });
    setIsAddDialogOpen(true);
  }, []);

  // Helper function to check if a node is descendant of another
  const isDescendant = useCallback((potentialChild: TreeNode, potentialParent: TreeNode): boolean => {
    if (potentialChild.parentId === potentialParent.id) {
      return true;
    }
    if (potentialChild.parentId === null) {
      return false;
    }
    const parent = categories.find((cat: ItemCategory) => cat.id === potentialChild.parentId);
    if (!parent) {
      return false;
    }
    return isDescendant(parent as TreeNode, potentialParent);
  }, [categories]);

  const handleMove = useCallback(async (draggedNode: TreeNode, targetNode: TreeNode, position: 'before' | 'after' | 'inside') => {
    if (isDragOperationInProgress) {
      console.log('Drag operation already in progress, skipping...');
      return;
    }
    
    console.log(`Starting move operation: ${draggedNode.categoryName} ${position} ${targetNode.categoryName}`);
    setIsDragOperationInProgress(true);
    
    try {
      let newParentId: number | null = null;
      let newDisplayOrder: number = 0;

      // Validate the move first
      if (position === 'inside') {
        // Moving inside target node (as child)
        if (!CATEGORY_CONFIGS[targetNode.categoryType].canHaveChildren) {
          toast({ 
            title: "이동 불가", 
            description: `${CATEGORY_CONFIGS[targetNode.categoryType].label}는 하위 분류를 가질 수 없습니다.`, 
            variant: "destructive" 
          });
          return;
        }
        
        // Validate hierarchy rules (prevent moving parent to its child)
        if (isDescendant(targetNode, draggedNode)) {
          toast({ 
            title: "이동 불가", 
            description: "상위 분류를 하위 분류로 이동할 수 없습니다.", 
            variant: "destructive" 
          });
          return;
        }

        newParentId = targetNode.id;
        newDisplayOrder = targetNode.children.length; // Add to end of children
        
        console.log(`Moving as child: parentId=${newParentId}, displayOrder=${newDisplayOrder}`);
      } else {
        // Moving before/after target node (as sibling)
        newParentId = targetNode.parentId;
        
        // Find siblings and calculate new display order
        const siblings = categories.filter((cat: ItemCategory) => cat.parentId === newParentId);
        console.log(`Found ${siblings.length} siblings at level ${newParentId}`);
        
        if (position === 'before') {
          newDisplayOrder = targetNode.displayOrder;
          console.log(`Moving before: displayOrder=${newDisplayOrder}`);
        } else { // after
          newDisplayOrder = targetNode.displayOrder + 1;
          console.log(`Moving after: displayOrder=${newDisplayOrder}`);
        }
      }

      // Update the dragged node with new parent and display order
      const updateData = {
        parentId: newParentId,
        displayOrder: newDisplayOrder
      };
      
      console.log('Updating dragged node with data:', updateData);
      
      await updateCategoryMutation.mutateAsync({
        id: draggedNode.id,
        data: updateData
      });

      addToHistory(`Moved "${draggedNode.categoryName}" ${position} "${targetNode.categoryName}"`);
      
      toast({ 
        title: "이동 완료", 
        description: `"${draggedNode.categoryName}"가 "${targetNode.categoryName}" ${position === 'inside' ? '하위로' : position === 'before' ? '앞으로' : '뒤로'} 이동되었습니다.` 
      });

      console.log('Move operation completed successfully');

    } catch (error) {
      console.error('Error moving category:', error);
      toast({ 
        title: "이동 실패", 
        description: "분류 이동 중 오류가 발생했습니다. 콘솔을 확인해주세요.", 
        variant: "destructive" 
      });
    } finally {
      setIsDragOperationInProgress(false);
      console.log('Move operation finished');
    }
  }, [categories, updateCategoryMutation, addToHistory, toast, isDragOperationInProgress, isDescendant]);

  const handleDelete = useCallback((node: TreeNode) => {
    if (confirm(`"${node.categoryName}" 분류를 삭제하시겠습니까?`)) {
      deleteCategoryMutation.mutate(node.id);
    }
  }, [deleteCategoryMutation]);

  const resetForm = () => {
    setNewCategory({
      categoryType: 'major',
      categoryName: '',
      parentId: null,
      displayOrder: 0,
      isActive: true,
    });
    setEditingNode(null);
    setAddParent(null);
  };

  const handleSubmit = () => {
    if (!newCategory.categoryName.trim()) {
      toast({ title: "입력 오류", description: "분류명을 입력해주세요.", variant: "destructive" });
      return;
    }

    if (editingNode) {
      updateCategoryMutation.mutate({
        id: editingNode.id,
        data: newCategory
      });
    } else {
      createCategoryMutation.mutate(newCategory);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              // Redo
              console.log('Redo');
            } else {
              // Undo
              console.log('Undo');
            }
            break;
          case 'a':
            e.preventDefault();
            setIsMultiSelectMode(true);
            setSelectedNodes(new Set(categories.map((c: ItemCategory) => c.id)));
            break;
          case 'f':
            e.preventDefault();
            document.getElementById('search-input')?.focus();
            break;
        }
      }
      
      if (e.key === 'Escape') {
        setSelectedNodes(new Set());
        setIsMultiSelectMode(false);
      }
      
      if (e.key === 'Delete' && selectedNodes.size > 0) {
        if (confirm(`선택된 ${selectedNodes.size}개의 분류를 삭제하시겠습니까?`)) {
          selectedNodes.forEach(id => deleteCategoryMutation.mutate(id));
        }
      }
      
      // Arrow keys for navigation
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const allNodes = categories.filter((cat: ItemCategory) => cat.isActive);
        if (selectedNodes.size === 1) {
          const currentId = Array.from(selectedNodes)[0];
          const currentIndex = allNodes.findIndex((cat: ItemCategory) => cat.id === currentId);
          let nextIndex;
          
          if (e.key === 'ArrowUp') {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : allNodes.length - 1;
          } else {
            nextIndex = currentIndex < allNodes.length - 1 ? currentIndex + 1 : 0;
          }
          
          if (nextIndex >= 0 && nextIndex < allNodes.length) {
            setSelectedNodes(new Set([allNodes[nextIndex].id]));
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [categories, selectedNodes, deleteCategoryMutation]);

  const expandAll = () => {
    const allIds = categories.map((cat: ItemCategory) => cat.id);
    setExpandedNodes(new Set(allIds));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const handleBulkDelete = () => {
    if (selectedNodes.size === 0) return;
    
    if (confirm(`선택된 ${selectedNodes.size}개의 분류를 삭제하시겠습니까?`)) {
      selectedNodes.forEach(id => deleteCategoryMutation.mutate(id));
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(categories, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'categories.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <TooltipProvider>
        <Card className="h-full">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <Layers className="w-6 h-6" />
                계층 분류 관리 시스템
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Target className="w-4 h-4 text-gray-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-md">
                      <div className="space-y-3 text-xs">
                        <div>
                          <p className="font-semibold text-blue-800 mb-2 flex items-center gap-1">
                            🚀 주요 기능
                          </p>
                          <div className="grid grid-cols-1 gap-1 text-gray-700">
                            <div className="flex items-center gap-2">
                              <TreePine className="w-3 h-3 text-blue-600" />
                              <span><strong>드래그 앤 드롭:</strong> 직관적인 재배열</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded bg-green-100 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-green-600 rounded"></div>
                              </div>
                              <span><strong>실시간 편집:</strong> 즉시 반영되는 변경사항</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded bg-purple-100 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-purple-600 rounded"></div>
                              </div>
                              <span><strong>다중 선택:</strong> 일괄 작업 지원</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded bg-orange-100 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-orange-600 rounded"></div>
                              </div>
                              <span><strong>스마트 검색:</strong> 고급 필터링</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <p className="font-semibold text-blue-800 mb-2 flex items-center gap-1">
                            ⌨️ 단축키 및 조작법
                          </p>
                          <div className="space-y-1 text-gray-700">
                            <p><strong>드래그 앤 드롭:</strong> 분류를 드래그하여 재정렬하거나 다른 부모로 이동</p>
                            <p><strong>키보드:</strong> 화살표 키로 탐색, Delete로 삭제, Ctrl+A로 전체 선택</p>
                            <p><strong>다중 선택:</strong> Ctrl+클릭 또는 다중 선택 모드 활성화</p>
                            <p><strong>검색:</strong> Ctrl+F로 빠른 검색, 실시간 필터링</p>
                            <p><strong>확장/축소:</strong> 전체 확장/축소, 줌 조절 기능</p>
                          </div>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
              
              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <Button
                    variant={viewMode === 'tree' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('tree')}
                    className="h-8"
                  >
                    <TreePine className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="h-8"
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                </div>

                {/* Multi-select Mode */}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={isMultiSelectMode}
                    onCheckedChange={setIsMultiSelectMode}
                    id="multi-select"
                  />
                  <Label htmlFor="multi-select" className="text-sm">다중 선택</Label>
                </div>

                {/* History Actions */}
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={historyIndex <= 0}
                        onClick={() => {/* Implement undo */}}
                        className="h-8 w-8 p-0"
                      >
                        <Undo className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>실행 취소 (Ctrl+Z)</p></TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={historyIndex >= history.length - 1}
                        onClick={() => {/* Implement redo */}}
                        className="h-8 w-8 p-0"
                      >
                        <Redo className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>다시 실행 (Ctrl+Shift+Z)</p></TooltipContent>
                  </Tooltip>
                </div>

                <Separator orientation="vertical" className="h-6" />

                {/* Bulk Actions */}
                {selectedNodes.size > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-blue-600">
                      {selectedNodes.size}개 선택됨
                    </Badge>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                      className="h-8"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      일괄 삭제
                    </Button>
                  </div>
                )}

                {/* Main Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportData}
                    className="h-8"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    내보내기
                  </Button>
                  
                  <Button
                    size="sm"
                    onClick={() => {
                      resetForm();
                      setIsAddDialogOpen(true);
                    }}
                    className="h-8"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    분류 추가
                  </Button>
                </div>
              </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex items-center gap-4 mt-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search-input"
                  placeholder="분류명 검색... (Ctrl+F)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filters.categoryType} onValueChange={(value: any) => setFilters({...filters, categoryType: value})}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 유형</SelectItem>
                  <SelectItem value="major">대분류</SelectItem>
                  <SelectItem value="middle">중분류</SelectItem>
                  <SelectItem value="minor">소분류</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.isActive} onValueChange={(value: any) => setFilters({...filters, isActive: value})}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 상태</SelectItem>
                  <SelectItem value="active">활성</SelectItem>
                  <SelectItem value="inactive">비활성</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={expandAll}>
                  <ChevronDown className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll}>
                  <ChevronUp className="w-4 h-4" />
                </Button>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.max(50, zoom - 10))}
                  className="h-8 w-8 p-0"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium w-12 text-center">{zoom}%</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.min(200, zoom + 10))}
                  className="h-8 w-8 p-0"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden relative">
            {/* Loading overlay during drag operations */}
            {isDragOperationInProgress && (
              <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center">
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-lg border">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-medium">분류 이동 중...</span>
                </div>
              </div>
            )}
            
            {/* Tree View */}
            {viewMode === 'tree' && (
              <div 
                className="h-full overflow-auto space-y-2 p-2"
                style={{ fontSize: `${zoom}%` }}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">로딩 중...</div>
                  </div>
                ) : treeData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <Archive className="w-12 h-12 mb-4" />
                    <p className="text-lg font-medium">등록된 분류가 없습니다</p>
                    <p className="text-sm">새로운 분류를 추가해보세요</p>
                  </div>
                ) : (
                  treeData.map((node) => (
                    <EnhancedCategoryNode
                      key={node.id}
                      node={node}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onToggle={handleNodeToggle}
                      onSelect={handleNodeSelect}
                      onAddChild={handleAddChild}
                      onMove={handleMove}
                      searchTerm={searchTerm}
                      isMultiSelectMode={isMultiSelectMode}
                      selectedNodes={selectedNodes}
                    />
                  ))
                )}
              </div>
            )}

            {/* Grid View (placeholder) */}
            {viewMode === 'grid' && (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Grid className="w-12 h-12 mx-auto mb-4" />
                  <p>그리드 뷰는 곧 구현될 예정입니다</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingNode ? '분류 수정' : '새 분류 추가'}
              </DialogTitle>
              <DialogDescription>
                {addParent && `"${addParent.categoryName}" 하위에 `}
                새로운 분류를 {editingNode ? '수정' : '추가'}합니다.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="categoryName">분류명</Label>
                <Input
                  id="categoryName"
                  value={newCategory.categoryName}
                  onChange={(e) => setNewCategory({...newCategory, categoryName: e.target.value})}
                  placeholder="분류명을 입력하세요"
                  autoFocus
                />
              </div>

              <div>
                <Label htmlFor="categoryType">분류 유형</Label>
                <Select 
                  value={newCategory.categoryType} 
                  onValueChange={(value: any) => setNewCategory({...newCategory, categoryType: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="major">
                      <div className="flex items-center gap-2">
                        <span>🏗️</span>
                        대분류
                      </div>
                    </SelectItem>
                    <SelectItem value="middle">
                      <div className="flex items-center gap-2">
                        <span>📁</span>
                        중분류
                      </div>
                    </SelectItem>
                    <SelectItem value="minor">
                      <div className="flex items-center gap-2">
                        <span>📄</span>
                        소분류
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={newCategory.isActive}
                  onCheckedChange={(checked) => setNewCategory({...newCategory, isActive: checked})}
                />
                <Label htmlFor="isActive">활성 상태</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleSubmit} disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}>
                {editingNode ? '수정' : '추가'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
  );
}