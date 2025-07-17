import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { AlertTriangle, Users, FileText } from 'lucide-react';
import type { User } from '@shared/schema';

interface SafeUserDeleteProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface UserReferences {
  canDelete: boolean;
  references: {
    projects: Array<{ id: number; name: string; type: string }>;
    orders: Array<{ id: number; orderNumber: string }>;
  };
}

export function SafeUserDelete({ user, isOpen, onClose, onSuccess }: SafeUserDeleteProps) {
  const [step, setStep] = useState<'checking' | 'warning' | 'reassign' | 'confirm'>('checking');
  const [selectedReplacementUser, setSelectedReplacementUser] = useState<string>('');
  const { toast } = useToast();

  // Check user references
  const { data: references, isLoading: checkingReferences } = useQuery<UserReferences>({
    queryKey: [`/api/users/${user.id}/references`],
    enabled: isOpen,
    retry: false,
  });

  // Get all users for replacement selection
  const { data: allUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: step === 'reassign',
  });

  // Reassign projects mutation
  const reassignMutation = useMutation({
    mutationFn: async (toUserId: string) => {
      return await apiRequest('POST', `/api/users/${user.id}/reassign`, { toUserId });
    },
    onSuccess: () => {
      setStep('confirm');
      toast({
        title: '현장 재배정 완료',
        description: '현장 담당자가 성공적으로 변경되었습니다.',
      });
    },
    onError: (error: any) => {
      toast({
        title: '재배정 실패',
        description: error.message || '현장 재배정에 실패했습니다.',
        variant: 'destructive',
      });
    },
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/users/${user.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      onSuccess();
      onClose();
      toast({
        title: '사용자 삭제 완료',
        description: '사용자가 성공적으로 삭제되었습니다.',
      });
    },
    onError: (error: any) => {
      toast({
        title: '삭제 실패',
        description: error.message || '사용자 삭제에 실패했습니다.',
        variant: 'destructive',
      });
    },
  });

  // Set initial step based on references
  React.useEffect(() => {
    if (references && !checkingReferences) {
      if (references.canDelete) {
        setStep('confirm');
      } else if (references.references.orders.length > 0) {
        // If user has orders, they cannot be deleted at all
        setStep('warning');
      } else {
        // Only projects, can be reassigned
        setStep('warning');
      }
    }
  }, [references, checkingReferences]);

  const handleReassign = () => {
    if (!selectedReplacementUser) {
      toast({
        title: '담당자 선택 필요',
        description: '새로운 담당자를 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }
    reassignMutation.mutate(selectedReplacementUser);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const availableUsers = allUsers?.filter(u => u.id !== user.id && u.isActive) || [];

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            사용자 삭제
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {step === 'checking' && (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p>사용자 참조 관계를 확인하고 있습니다...</p>
                </div>
              )}

              {step === 'warning' && references && (
                <div className="space-y-4">
                  {references.references.orders.length > 0 ? (
                    // User has orders - cannot be deleted
                    <div className="space-y-4">
                      <p className="text-red-600 font-medium">
                        {user.name || user.email} 사용자는 삭제할 수 없습니다.
                      </p>
                      
                      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-red-600" />
                          <span className="font-medium text-red-800">생성한 발주서 ({references.references.orders.length}개)</span>
                        </div>
                        <p className="text-sm text-red-700 mb-2">
                          발주서 기록은 회계 및 감사를 위해 생성자 정보를 보존해야 합니다.
                        </p>
                        <div className="bg-red-100 p-2 rounded text-xs text-red-800">
                          <strong>대안:</strong> 사용자 계정을 비활성화하거나 역할을 변경하여 시스템 접근을 제한하세요.
                        </div>
                      </div>
                      
                      {references.references.projects.length > 0 && (
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-blue-800">연결된 현장 ({references.references.projects.length}개)</span>
                          </div>
                          <ul className="space-y-1 text-sm text-blue-700">
                            {references.references.projects.map((project) => (
                              <li key={project.id} className="flex justify-between">
                                <span>{project.name}</span>
                                <span className="text-blue-500">
                                  {project.type === 'project_manager' ? '현장 관리자' : '현장 멤버'}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    // User only has projects - can be reassigned
                    <div className="space-y-4">
                      <p className="text-amber-600 font-medium">
                        {user.name || user.email} 사용자는 다음 현장과 연결되어 있어 바로 삭제할 수 없습니다:
                      </p>
                      
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-800">연결된 현장 ({references.references.projects.length}개)</span>
                        </div>
                        <ul className="space-y-1 text-sm text-blue-700">
                          {references.references.projects.map((project) => (
                            <li key={project.id} className="flex justify-between">
                              <span>{project.name}</span>
                              <span className="text-blue-500">
                                {project.type === 'project_manager' ? '현장 관리자' : '현장 멤버'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <p className="text-sm text-gray-600">
                        계속 진행하려면 먼저 현장 담당자를 다른 사용자에게 재배정해야 합니다.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {step === 'reassign' && (
                <div className="space-y-4">
                  <p>현장 담당자를 재배정할 새로운 사용자를 선택해주세요:</p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="replacement-user">새로운 담당자</Label>
                    <Select value={selectedReplacementUser} onValueChange={setSelectedReplacementUser}>
                      <SelectTrigger>
                        <SelectValue placeholder="담당자를 선택해주세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.email}) - {user.role === 'admin' ? '관리자' : user.role === 'order_manager' ? '발주 담당자' : '사용자'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {step === 'confirm' && (
                <div className="space-y-4">
                  <p className="text-red-600 font-medium">
                    {user.name || user.email} 사용자를 삭제하시겠습니까?
                  </p>
                  <p className="text-sm text-gray-600">
                    이 작업은 되돌릴 수 없습니다. 사용자의 모든 정보가 영구적으로 삭제됩니다.
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          {step === 'warning' && (
            <>
              <Button variant="outline" onClick={onClose}>
                취소
              </Button>
              {references && references.references.orders.length === 0 && (
                <Button onClick={() => setStep('reassign')}>
                  재배정 진행
                </Button>
              )}
            </>
          )}

          {step === 'reassign' && (
            <>
              <Button variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button 
                onClick={handleReassign}
                disabled={!selectedReplacementUser || reassignMutation.isPending}
              >
                {reassignMutation.isPending ? '재배정 중...' : '재배정 후 삭제'}
              </Button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <Button variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? '삭제 중...' : '삭제'}
              </Button>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}