import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Maximize,
  Settings,
  Eye,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

interface MindMapNode extends ItemCategory {
  children: MindMapNode[];
  x: number;
  y: number;
  level: number;
  angle: number;
  radius: number;
  width: number;
  height: number;
}

// Configuration for different category types
const CATEGORY_CONFIGS = {
  major: {
    label: '대분류',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    borderColor: '#DBEAFE',
    icon: '🏗️',
    size: { width: 140, height: 60 },
    fontSize: '14px',
    fontWeight: '600'
  },
  middle: {
    label: '중분류',
    color: '#10B981',
    bgColor: '#ECFDF5',
    borderColor: '#D1FAE5',
    icon: '📁',
    size: { width: 120, height: 50 },
    fontSize: '13px',
    fontWeight: '500'
  },
  minor: {
    label: '소분류',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    borderColor: '#FEF3C7',
    icon: '📄',
    size: { width: 100, height: 40 },
    fontSize: '12px',
    fontWeight: '400'
  },
};

// SVG Node Component
function SVGCategoryNode({ 
  node, 
  isSelected, 
  onSelect, 
  onEdit, 
  onDelete, 
  onAddChild,
  scale = 1 
}: {
  node: MindMapNode;
  isSelected: boolean;
  onSelect: (node: MindMapNode) => void;
  onEdit: (node: MindMapNode) => void;
  onDelete: (node: MindMapNode) => void;
  onAddChild: (parent: MindMapNode) => void;
  scale: number;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const config = CATEGORY_CONFIGS[node.categoryType];

  return (
    <g 
      transform={`translate(${node.x}, ${node.y})`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Node Background */}
      <rect
        x={-node.width / 2}
        y={-node.height / 2}
        width={node.width}
        height={node.height}
        rx={8}
        fill={config.bgColor}
        stroke={isSelected ? config.color : config.borderColor}
        strokeWidth={isSelected ? 3 : 1.5}
        className={`cursor-pointer transition-all duration-200 ${
          isHovered ? 'drop-shadow-md' : ''
        }`}
        onClick={() => onSelect(node)}
      />

      {/* Selection Glow */}
      {isSelected && (
        <rect
          x={-node.width / 2 - 4}
          y={-node.height / 2 - 4}
          width={node.width + 8}
          height={node.height + 8}
          rx={12}
          fill="none"
          stroke={config.color}
          strokeWidth={2}
          opacity={0.3}
          className="animate-pulse"
        />
      )}

      {/* Category Type Badge */}
      <rect
        x={-node.width / 2 + 4}
        y={-node.height / 2 + 4}
        width={60}
        height={16}
        rx={8}
        fill={config.color}
        opacity={0.1}
      />
      <text
        x={-node.width / 2 + 20}
        y={-node.height / 2 + 14}
        fontSize="9px"
        fill={config.color}
        fontWeight="600"
        textAnchor="middle"
      >
        {config.label}
      </text>

      {/* Category Name */}
      <text
        x={0}
        y={0}
        fontSize={config.fontSize}
        fontWeight={config.fontWeight}
        fill="#1F2937"
        textAnchor="middle"
        dominantBaseline="middle"
        className="pointer-events-none select-none"
      >
        {node.categoryName.length > 12 
          ? `${node.categoryName.substring(0, 12)}...` 
          : node.categoryName
        }
      </text>

      {/* Child Count Badge */}
      {node.children.length > 0 && (
        <>
          <circle
            cx={node.width / 2 - 12}
            cy={-node.height / 2 + 12}
            r={8}
            fill={config.color}
          />
          <text
            x={node.width / 2 - 12}
            y={-node.height / 2 + 12}
            fontSize="10px"
            fill="white"
            fontWeight="600"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {node.children.length}
          </text>
        </>
      )}

      {/* Action Buttons (shown on hover) */}
      {(isHovered || isSelected) && (
        <g opacity={0.9}>
          {/* Edit Button */}
          <circle
            cx={-node.width / 2 - 20}
            cy={0}
            r={12}
            fill="white"
            stroke="#6B7280"
            strokeWidth={1}
            className="cursor-pointer hover:fill-blue-50"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(node);
            }}
          />
          <text
            x={-node.width / 2 - 20}
            y={0}
            fontSize="10px"
            fill="#6B7280"
            textAnchor="middle"
            dominantBaseline="middle"
            className="pointer-events-none"
          >
            ✏️
          </text>

          {/* Add Child Button (if allowed) */}
          {node.categoryType !== 'minor' && (
            <>
              <circle
                cx={node.width / 2 + 20}
                cy={0}
                r={12}
                fill="white"
                stroke="#10B981"
                strokeWidth={1}
                className="cursor-pointer hover:fill-green-50"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddChild(node);
                }}
              />
              <text
                x={node.width / 2 + 20}
                y={0}
                fontSize="10px"
                fill="#10B981"
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none"
              >
                ➕
              </text>
            </>
          )}

          {/* Delete Button */}
          <circle
            cx={0}
            cy={node.height / 2 + 20}
            r={12}
            fill="white"
            stroke="#EF4444"
            strokeWidth={1}
            className="cursor-pointer hover:fill-red-50"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node);
            }}
          />
          <text
            x={0}
            y={node.height / 2 + 20}
            fontSize="10px"
            fill="#EF4444"
            textAnchor="middle"
            dominantBaseline="middle"
            className="pointer-events-none"
          >
            🗑️
          </text>
        </g>
      )}
    </g>
  );
}

// Connection Line Component
function ConnectionLine({ 
  from, 
  to, 
  color = '#6B7280' 
}: { 
  from: MindMapNode; 
  to: MindMapNode; 
  color?: string; 
}) {
  // Calculate connection points
  const fromX = from.x;
  const fromY = from.y;
  const toX = to.x;
  const toY = to.y;

  // Create a curved path
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;
  const controlX = midX;
  const controlY = fromY;

  return (
    <g>
      {/* Connection Line */}
      <path
        d={`M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`}
        stroke={color}
        strokeWidth={2}
        fill="none"
        opacity={0.6}
        className="pointer-events-none"
      />
      
      {/* Arrow */}
      <circle
        cx={toX}
        cy={toY}
        r={3}
        fill={color}
        opacity={0.6}
      />
    </g>
  );
}

// Main Mind Map Component
export default function CategoryMindMapView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // State
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1000, height: 600 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });

  // API Queries
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['/api/item-categories'],
    queryFn: () => apiRequest('GET', '/api/item-categories'),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/item-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/item-categories'] });
      setSelectedNode(null);
      toast({ title: "분류 삭제 완료", description: "분류가 삭제되었습니다." });
    },
    onError: () => {
      toast({ title: "오류", description: "분류 삭제 중 오류가 발생했습니다.", variant: "destructive" });
    }
  });

  // Build mind map structure
  const mindMapData = useMemo(() => {
    const buildMindMap = (parentId: number | null, level: number = 0, angle: number = 0, radius: number = 0): MindMapNode[] => {
      const children = categories
        .filter((cat: ItemCategory) => cat.parentId === parentId)
        .sort((a: ItemCategory, b: ItemCategory) => a.displayOrder - b.displayOrder);

      const angleStep = children.length > 1 ? (Math.PI * 2) / children.length : 0;
      
      return children.map((cat: ItemCategory, index: number) => {
        const config = CATEGORY_CONFIGS[cat.categoryType];
        const nodeAngle = level === 0 ? 0 : angle + (index - (children.length - 1) / 2) * angleStep;
        const nodeRadius = level === 0 ? 0 : radius + 150;
        
        const x = level === 0 ? 500 : 500 + Math.cos(nodeAngle) * nodeRadius;
        const y = level === 0 ? 300 : 300 + Math.sin(nodeAngle) * nodeRadius;

        const childNodes = buildMindMap(cat.id, level + 1, nodeAngle, nodeRadius);

        return {
          ...cat,
          children: childNodes,
          x,
          y,
          level,
          angle: nodeAngle,
          radius: nodeRadius,
          width: config.size.width,
          height: config.size.height,
        };
      });
    };

    return buildMindMap(null);
  }, [categories]);

  // Get all nodes (flattened)
  const allNodes = useMemo(() => {
    const flatten = (nodes: MindMapNode[]): MindMapNode[] => {
      return nodes.reduce((acc, node) => {
        return [...acc, node, ...flatten(node.children)];
      }, [] as MindMapNode[]);
    };
    return flatten(mindMapData);
  }, [mindMapData]);

  // Get all connections
  const connections = useMemo(() => {
    const getConnections = (nodes: MindMapNode[]): Array<{ from: MindMapNode; to: MindMapNode }> => {
      const connections: Array<{ from: MindMapNode; to: MindMapNode }> = [];
      
      const traverse = (node: MindMapNode) => {
        node.children.forEach(child => {
          connections.push({ from: node, to: child });
          traverse(child);
        });
      };

      nodes.forEach(traverse);
      return connections;
    };

    return getConnections(mindMapData);
  }, [mindMapData]);

  // Event Handlers
  const handleNodeSelect = useCallback((node: MindMapNode) => {
    setSelectedNode(selectedNode?.id === node.id ? null : node);
  }, [selectedNode]);

  const handleEdit = useCallback((node: MindMapNode) => {
    console.log('Edit node:', node);
    // Implement edit functionality
  }, []);

  const handleDelete = useCallback((node: MindMapNode) => {
    if (confirm(`"${node.categoryName}" 분류를 삭제하시겠습니까?`)) {
      deleteCategoryMutation.mutate(node.id);
    }
  }, [deleteCategoryMutation]);

  const handleAddChild = useCallback((parent: MindMapNode) => {
    console.log('Add child to:', parent);
    // Implement add child functionality
  }, []);

  const handleZoomIn = () => setScale(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev / 1.2, 0.3));
  const handleResetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setViewBox({ x: 0, y: 0, width: 1000, height: 600 });
  };

  const handleExport = () => {
    if (!svgRef.current) return;
    
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      const link = document.createElement('a');
      link.download = 'category-mindmap.png';
      link.href = canvas.toDataURL();
      link.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  // Pan functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      
      setViewBox(prev => ({
        ...prev,
        x: prev.x - deltaX / scale,
        y: prev.y - deltaY / scale,
      }));
      
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedNode(null);
      }
      if (e.key === 'Delete' && selectedNode) {
        handleDelete(selectedNode);
      }
      if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      }
      if (e.key === '-') {
        handleZoomOut();
      }
      if (e.key === '0') {
        handleResetView();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, handleDelete]);

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-gray-500">마인드맵 로딩 중...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-600" />
              분류 마인드맵 뷰
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={handleZoomOut} className="h-8 w-8 p-0">
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>축소 (-)</p></TooltipContent>
                </Tooltip>
                
                <span className="text-sm font-medium px-2 min-w-[60px] text-center">
                  {Math.round(scale * 100)}%
                </span>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={handleZoomIn} className="h-8 w-8 p-0">
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>확대 (+)</p></TooltipContent>
                </Tooltip>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleResetView} className="h-8">
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>뷰 초기화 (0)</p></TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleExport} className="h-8">
                    <Download className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>이미지로 내보내기</p></TooltipContent>
              </Tooltip>
            </div>
          </div>

          {selectedNode && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className={`${CATEGORY_CONFIGS[selectedNode.categoryType].bgColor} ${CATEGORY_CONFIGS[selectedNode.categoryType].color} border`}>
                    {CATEGORY_CONFIGS[selectedNode.categoryType].icon} {CATEGORY_CONFIGS[selectedNode.categoryType].label}
                  </Badge>
                  <span className="font-medium">{selectedNode.categoryName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>{selectedNode.children.length}개 하위 분류</span>
                  <Badge variant={selectedNode.isActive ? "default" : "secondary"}>
                    {selectedNode.isActive ? "활성" : "비활성"}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden">
          <div 
            ref={containerRef}
            className="w-full h-full relative bg-gray-50"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => setIsPanning(false)}
            style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
          >
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
              className="select-none"
            >
              {/* Grid Background */}
              <defs>
                <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#E5E7EB" strokeWidth="1" opacity="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Connection Lines */}
              {connections.map((conn, index) => (
                <ConnectionLine
                  key={index}
                  from={conn.from}
                  to={conn.to}
                  color={CATEGORY_CONFIGS[conn.to.categoryType].color}
                />
              ))}

              {/* Category Nodes */}
              {allNodes.map((node) => (
                <SVGCategoryNode
                  key={node.id}
                  node={node}
                  isSelected={selectedNode?.id === node.id}
                  onSelect={handleNodeSelect}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onAddChild={handleAddChild}
                  scale={scale}
                />
              ))}
            </svg>

            {/* Empty State */}
            {allNodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Layers className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">등록된 분류가 없습니다</p>
                  <p className="text-sm">새로운 분류를 추가하여 마인드맵을 시작하세요</p>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm border text-xs text-gray-600">
              <p className="font-medium mb-1">조작 방법:</p>
              <ul className="space-y-1">
                <li>• 드래그: 화면 이동</li>
                <li>• +/- 키: 확대/축소</li>
                <li>• 0 키: 뷰 초기화</li>
                <li>• ESC: 선택 해제</li>
                <li>• Delete: 선택 삭제</li>
              </ul>
            </div>

            {/* Scale Indicator */}
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border text-sm font-medium">
              {Math.round(scale * 100)}%
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}