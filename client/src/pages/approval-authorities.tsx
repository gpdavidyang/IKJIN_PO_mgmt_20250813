/**
 * Approval Authorities Management Page
 * 승인 권한 관리 페이지
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Edit, Plus, Shield, DollarSign, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ApprovalAuthority {
  id: number;
  role: string;
  maxAmount: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const roleLabels: { [key: string]: string } = {
  'admin': '관리자',
  'executive': '임원',
  'hq_management': '본사 관리자',
  'project_manager': '프로젝트 매니저',
  'field_worker': '현장 작업자'
};

const roleOptions = [
  { value: 'admin', label: '관리자' },
  { value: 'executive', label: '임원' },
  { value: 'hq_management', label: '본사 관리자' },
  { value: 'project_manager', label: '프로젝트 매니저' },
  { value: 'field_worker', label: '현장 작업자' }
];

export default function ApprovalAuthorities() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAuthority, setEditingAuthority] = useState<ApprovalAuthority | null>(null);
  const [formData, setFormData] = useState({
    role: '',
    maxAmount: '',
    description: ''
  });

  // Fetch approval authorities
  const { data: authorities, isLoading, error } = useQuery<ApprovalAuthority[]>({
    queryKey: ['approval-authorities'],
    queryFn: async () => {
      const response = await fetch('/api/approval-authorities', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch approval authorities');
      }
      
      return response.json();
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: { role: string; maxAmount: string; description?: string }) => {
      const response = await fetch('/api/approval-authorities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          role: data.role,
          maxAmount: data.maxAmount,
          description: data.description,
          isActive: true
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create approval authority');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-authorities'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "성공",
        description: "승인 권한이 생성되었습니다."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "오류",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; role: string; maxAmount: string; description?: string }) => {
      const response = await fetch(`/api/approval-authorities/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          role: data.role,
          maxAmount: data.maxAmount,
          description: data.description,
          isActive: true
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update approval authority');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-authorities'] });
      setEditingAuthority(null);
      resetForm();
      toast({
        title: "성공",
        description: "승인 권한이 수정되었습니다."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "오류",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/approval-authorities/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete approval authority');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-authorities'] });
      toast({
        title: "성공",
        description: "승인 권한이 삭제되었습니다."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "오류",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({ role: '', maxAmount: '', description: '' });
  };

  const handleEdit = (authority: ApprovalAuthority) => {
    setEditingAuthority(authority);
    setFormData({
      role: authority.role,
      maxAmount: authority.maxAmount.toString(),
      description: authority.description || ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.role || !formData.maxAmount) {
      toast({
        title: "오류",
        description: "역할과 승인 한도를 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    if (editingAuthority) {
      updateMutation.mutate({
        id: editingAuthority.id,
        ...formData
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              승인 권한 데이터를 불러오는 중 오류가 발생했습니다.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">승인 권한 관리</h1>
          <p className="text-gray-600 mt-2">사용자 역할별 승인 권한과 한도를 관리합니다</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingAuthority(null); }}>
              <Plus className="w-4 h-4 mr-2" />
              새 권한 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>승인 권한 추가</DialogTitle>
              <DialogDescription>
                새로운 역할의 승인 권한을 설정합니다.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="role">역할</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="역할을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="maxAmount">승인 한도 (원)</Label>
                <Input
                  id="maxAmount"
                  type="number"
                  value={formData.maxAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxAmount: e.target.value }))}
                  placeholder="승인 가능한 최대 금액"
                />
              </div>
              
              <div>
                <Label htmlFor="description">설명 (선택사항)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="승인 권한에 대한 설명"
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  취소
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "생성 중..." : "생성"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 권한 수</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{authorities?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활성 권한</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {authorities?.filter(auth => auth.isActive).length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">최고 한도</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {authorities && authorities.length > 0 
                ? `${Math.max(...authorities.map(a => a.maxAmount)).toLocaleString()}원`
                : '0원'
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Authorities List */}
      <Card>
        <CardHeader>
          <CardTitle>승인 권한 목록</CardTitle>
          <CardDescription>
            각 역할별로 설정된 승인 권한과 한도를 확인할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {authorities && authorities.length > 0 ? (
            <div className="space-y-4">
              {authorities.map((authority) => (
                <div key={authority.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <Badge variant={authority.isActive ? "default" : "secondary"}>
                        {roleLabels[authority.role] || authority.role}
                      </Badge>
                      <div className="text-lg font-semibold">
                        {authority.maxAmount.toLocaleString()}원
                      </div>
                      {!authority.isActive && (
                        <Badge variant="outline">비활성</Badge>
                      )}
                    </div>
                    {authority.description && (
                      <p className="text-gray-600 mt-1 text-sm">{authority.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      생성일: {new Date(authority.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEdit(authority)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>승인 권한 수정</DialogTitle>
                          <DialogDescription>
                            {roleLabels[authority.role]} 역할의 승인 권한을 수정합니다.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                          <div>
                            <Label htmlFor="edit-role">역할</Label>
                            <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {roleOptions.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label htmlFor="edit-maxAmount">승인 한도 (원)</Label>
                            <Input
                              id="edit-maxAmount"
                              type="number"
                              value={formData.maxAmount}
                              onChange={(e) => setFormData(prev => ({ ...prev, maxAmount: e.target.value }))}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="edit-description">설명</Label>
                            <Textarea
                              id="edit-description"
                              value={formData.description}
                              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                              rows={3}
                            />
                          </div>
                          
                          <div className="flex justify-end space-x-2">
                            <DialogTrigger asChild>
                              <Button type="button" variant="outline">취소</Button>
                            </DialogTrigger>
                            <Button type="submit" disabled={updateMutation.isPending}>
                              {updateMutation.isPending ? "수정 중..." : "수정"}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>승인 권한 삭제</AlertDialogTitle>
                          <AlertDialogDescription>
                            {roleLabels[authority.role]} 역할의 승인 권한을 삭제하시겠습니까?
                            이 작업은 되돌릴 수 없습니다.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(authority.id)}
                            disabled={deleteMutation.isPending}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {deleteMutation.isPending ? "삭제 중..." : "삭제"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              설정된 승인 권한이 없습니다. 새 권한을 추가해보세요.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}