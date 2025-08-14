import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Users, Hash, Settings, Building, Calendar, List, Grid3X3, Layers } from "lucide-react";
import { usePositions, useCreatePosition, useUpdatePosition, useDeletePosition } from "@/hooks/use-positions";
import type { Position, InsertPosition } from "@shared/schema";
import { useTheme } from "@/components/ui/theme-provider";

export default function PositionsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [formData, setFormData] = useState({
    positionCode: "",
    positionName: "",
    level: 1,
    department: "",
    description: "",
    isActive: true,
  });

  const { data: positions = [], isLoading } = usePositions();
  const createPosition = useCreatePosition();
  const updatePosition = useUpdatePosition();
  const deletePosition = useDeletePosition();

  const filteredPositions = positions.filter((position) =>
    position.positionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    position.positionCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (position.department && position.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const resetForm = () => {
    setFormData({
      positionCode: "",
      positionName: "",
      level: 1,
      department: "",
      description: "",
      isActive: true,
    });
  };

  const handleEdit = (position: Position) => {
    setEditingPosition(position);
    setFormData({
      positionCode: position.positionCode,
      positionName: position.positionName,
      level: position.level,
      department: position.department || "",
      description: position.description || "",
      isActive: position.isActive ?? true,
    });
    setIsCreateDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPosition) {
        await updatePosition.mutateAsync({ id: editingPosition.id, data: formData });
      } else {
        await createPosition.mutateAsync(formData);
      }
      setIsCreateDialogOpen(false);
      setEditingPosition(null);
      resetForm();
    } catch (error) {
      console.error("Failed to save position:", error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deletePosition.mutateAsync(id);
    } catch (error) {
      console.error("Failed to delete position:", error);
    }
  };

  const getLevelBadgeColor = (level: number) => {
    if (level <= 2) return "bg-red-100 text-red-800 border-red-200";
    if (level <= 4) return "bg-orange-100 text-orange-800 border-orange-200";
    if (level <= 6) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (level <= 8) return "bg-green-100 text-green-800 border-green-200";
    return "bg-blue-100 text-blue-800 border-blue-200";
  };

  const getLevelText = (level: number) => {
    if (level <= 2) return "임원급";
    if (level <= 4) return "부장급";
    if (level <= 6) return "차장급";
    if (level <= 8) return "과장급";
    return "사원급";
  };

  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  if (isLoading) {
    return (
      <div className={`min-h-screen transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-[1366px] mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className={`animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4 transition-colors ${isDarkMode ? 'border-blue-400' : 'border-blue-600'}`}></div>
              <p className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>로딩 중...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-[1366px] mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                <Users className={`h-6 w-6 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
              <div>
                <h1 className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>직급 관리</h1>
                <p className={`text-sm mt-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  조직 내 직급 체계를 관리하고 설정합니다
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge 
                variant="outline" 
                className={`text-sm transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}
              >
                총 {filteredPositions.length}개
              </Badge>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className={`shadow-md hover:shadow-lg transition-all duration-200 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                  onClick={() => {
                    setEditingPosition(null);
                    resetForm();
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  직급 추가
                </Button>
              </DialogTrigger>
              <DialogContent className={`max-w-lg transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <DialogHeader>
                  <DialogTitle className={`transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {editingPosition ? "직급 편집" : "새 직급 추가"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="positionCode" className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        직급 코드
                      </Label>
                      <Input
                        id="positionCode"
                        value={formData.positionCode}
                        onChange={(e) => setFormData(prev => ({ ...prev, positionCode: e.target.value }))}
                        placeholder="예: CEO, VP_ENG"
                        className={`mt-1 transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="positionName" className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        직급명
                      </Label>
                      <Input
                        id="positionName"
                        value={formData.positionName}
                        onChange={(e) => setFormData(prev => ({ ...prev, positionName: e.target.value }))}
                        placeholder="예: 최고경영자, 개발팀장"
                        className={`mt-1 transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="level" className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        레벨
                      </Label>
                      <Input
                        id="level"
                        type="number"
                        min="1"
                        max="10"
                        value={formData.level}
                        onChange={(e) => setFormData(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
                        className={`mt-1 transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="department" className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        부서
                      </Label>
                      <Input
                        id="department"
                        value={formData.department || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                        placeholder="예: 경영진, 개발팀"
                        className={`mt-1 transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description" className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      설명
                    </Label>
                    <Input
                      id="description"
                      value={formData.description || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="직급에 대한 설명을 입력하세요"
                      className={`mt-1 transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label htmlFor="isActive" className={`text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      활성 상태
                    </Label>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      className={`transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                      취소
                    </Button>
                    <Button 
                      type="submit" 
                      className={`shadow-md hover:shadow-lg transition-all duration-200 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                      disabled={createPosition.isPending || updatePosition.isPending}
                    >
                      {editingPosition ? "수정" : "추가"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        </div>
      </div>

      {/* Search and View Toggle Section */}
      <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              <Input
                placeholder="직급 이름, 코드, 부서로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`h-10 transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
              />
            </div>
            <div className={`flex items-center rounded-lg p-1 transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className={`h-8 w-8 p-0 transition-colors ${viewMode === 'table' 
                  ? (isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white')
                  : (isDarkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-200')
                }`}
                title="테이블 보기"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'card' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('card')}
                className={`h-8 w-8 p-0 transition-colors ${viewMode === 'card' 
                  ? (isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white')
                  : (isDarkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-200')
                }`}
                title="카드 보기"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Display */}
      {viewMode === 'table' ? (
        <div className={`shadow-sm rounded-lg border overflow-hidden transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="p-0">
            <Table>
              <TableHeader>
                <TableRow className={`border-b transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50/50 border-gray-200'}`}>
                  <TableHead className={`text-left py-3 px-4 text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>직급명</TableHead>
                  <TableHead className={`text-left py-3 px-4 text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>코드</TableHead>
                  <TableHead className={`text-left py-3 px-4 text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>레벨</TableHead>
                  <TableHead className={`text-left py-3 px-4 text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>부서</TableHead>
                  <TableHead className={`text-left py-3 px-4 text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>상태</TableHead>
                  <TableHead className={`text-left py-3 px-4 text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPositions.map((position) => (
                  <TableRow key={position.id} className={`border-b transition-colors ${isDarkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50/50'}`}>
                    <TableCell className="py-3 px-4 text-sm">
                      <div className={`font-medium transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{position.positionName}</div>
                    </TableCell>
                    <TableCell className={`py-3 px-4 text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {position.positionCode}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-sm">
                      <Badge className={getLevelBadgeColor(position.level)}>
                        {getLevelText(position.level)}
                      </Badge>
                    </TableCell>
                    <TableCell className={`py-3 px-4 text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {position.department || '-'}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-sm">
                      <Badge variant={position.isActive ? 'default' : 'secondary'}>
                        {position.isActive ? '활성' : '비활성'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-sm">
                      <div className="flex items-center gap-1 -space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(position)}
                          className={`h-8 w-8 p-0 transition-colors ${isDarkMode ? 'text-blue-400 hover:bg-blue-900/20' : 'text-blue-600 hover:bg-blue-50'}`}
                          title="편집"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-8 w-8 p-0 transition-colors ${isDarkMode ? 'text-red-400 hover:bg-red-900/20' : 'text-red-600 hover:bg-red-50'}`}
                              title="삭제"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                            <AlertDialogHeader>
                              <AlertDialogTitle className={`transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>직급 삭제</AlertDialogTitle>
                              <AlertDialogDescription className={`transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                이 직급을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className={`transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>취소</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(position.id)}
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                삭제
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPositions.map((position) => (
            <div key={position.id} className={`p-4 shadow-sm rounded-lg border transition-all hover:shadow-lg ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="space-y-3">
                {/* Header Section - Standardized */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold truncate transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                      {position.positionName}
                    </h3>
                  </div>
                  <Badge variant={position.isActive ? 'default' : 'secondary'}>
                    {position.isActive ? '활성' : '비활성'}
                  </Badge>
                </div>

                {/* Content Section - Standardized */}
                <div className="space-y-2 mb-3">
                  <div className={`flex items-center text-sm gap-2 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Hash className="h-4 w-4" />
                    <span className="font-medium">코드:</span>
                    <span>{position.positionCode}</span>
                  </div>
                  <div className={`flex items-center text-sm gap-2 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Settings className="h-4 w-4" />
                    <span className="font-medium">레벨:</span>
                    <Badge className={getLevelBadgeColor(position.level)}>
                      {getLevelText(position.level)}
                    </Badge>
                  </div>
                  <div className={`flex items-center text-sm gap-2 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Building className="h-4 w-4" />
                    <span className="font-medium">부서:</span>
                    <span>{position.department || '-'}</span>
                  </div>
                </div>
                {position.description && (
                  <div className={`pt-2 border-t transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                    <p className={`text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{position.description}</p>
                  </div>
                )}
                
                {/* Footer Section - Standardized */}
                <div className={`flex items-center justify-between text-xs mb-3 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  <span>등록: 직급 관리</span>
                </div>

                {/* Action Buttons - Standardized */}
                <div className={`flex items-center justify-end pt-2 border-t transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                  <div className="flex items-center -space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(position)}
                      className={`h-8 w-8 p-0 transition-colors ${isDarkMode ? 'text-blue-400 hover:bg-blue-900/20' : 'text-blue-600 hover:bg-blue-50'}`}
                      title="편집"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-8 w-8 p-0 transition-colors ${isDarkMode ? 'text-red-400 hover:bg-red-900/20' : 'text-red-600 hover:bg-red-50'}`}
                          title="삭제"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <AlertDialogHeader>
                          <AlertDialogTitle className={`transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>직급 삭제</AlertDialogTitle>
                          <AlertDialogDescription className={`transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            이 직급을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className={`transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>취소</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(position.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            삭제
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}