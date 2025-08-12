import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Plus, 
  X, 
  Edit3, 
  Save, 
  Search,
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
  Building2,
  Mail,
  Phone,
  User
} from 'lucide-react';

export interface EmailRecipient {
  id: string;
  email: string;
  name: string;
  company?: string;
  position?: string;
  phone?: string;
  type: 'vendor' | 'cc' | 'bcc' | 'manager' | 'approver';
  verified: boolean;
  isDefault?: boolean;
  tags?: string[];
  lastUsed?: Date;
}

interface EmailRecipientManagerProps {
  recipients: EmailRecipient[];
  onRecipientsChange: (recipients: EmailRecipient[]) => void;
  isOpen?: boolean;
  onClose?: () => void;
  trigger?: React.ReactNode;
  projectId?: string;
  vendorId?: string;
}

const EmailRecipientManager: React.FC<EmailRecipientManagerProps> = ({
  recipients,
  onRecipientsChange,
  isOpen,
  onClose,
  trigger,
  projectId,
  vendorId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRecipient, setEditingRecipient] = useState<EmailRecipient | null>(null);
  const [newRecipient, setNewRecipient] = useState<Partial<EmailRecipient>>({
    type: 'vendor',
    verified: false
  });
  const [savedRecipients, setSavedRecipients] = useState<EmailRecipient[]>([]);

  // 저장된 수신자 목록 로드
  useEffect(() => {
    loadSavedRecipients();
  }, [projectId, vendorId]);

  const loadSavedRecipients = async () => {
    try {
      // 실제 API 호출 (현재는 localStorage 사용)
      const saved = localStorage.getItem('emailRecipients');
      if (saved) {
        setSavedRecipients(JSON.parse(saved));
      }
    } catch (error) {
      console.error('수신자 목록 로드 실패:', error);
    }
  };

  const saveToLocalStorage = (recipientList: EmailRecipient[]) => {
    try {
      localStorage.setItem('emailRecipients', JSON.stringify(recipientList));
    } catch (error) {
      console.error('수신자 목록 저장 실패:', error);
    }
  };

  // 수신자 추가
  const addRecipient = () => {
    if (!newRecipient.email || !newRecipient.name) return;

    const recipient: EmailRecipient = {
      id: `recipient-${Date.now()}`,
      email: newRecipient.email,
      name: newRecipient.name,
      company: newRecipient.company || '',
      position: newRecipient.position || '',
      phone: newRecipient.phone || '',
      type: newRecipient.type || 'vendor',
      verified: isValidEmail(newRecipient.email),
      tags: newRecipient.tags || [],
      lastUsed: new Date()
    };

    const updatedRecipients = [...recipients, recipient];
    onRecipientsChange(updatedRecipients);

    // 저장된 수신자 목록에도 추가
    const updatedSaved = [...savedRecipients, recipient];
    setSavedRecipients(updatedSaved);
    saveToLocalStorage(updatedSaved);

    // 폼 초기화
    setNewRecipient({ type: 'vendor', verified: false });
  };

  // 수신자 제거
  const removeRecipient = (id: string) => {
    const updatedRecipients = recipients.filter(r => r.id !== id);
    onRecipientsChange(updatedRecipients);
  };

  // 수신자 수정
  const updateRecipient = (updatedRecipient: EmailRecipient) => {
    const updatedRecipients = recipients.map(r =>
      r.id === updatedRecipient.id ? updatedRecipient : r
    );
    onRecipientsChange(updatedRecipients);

    // 저장된 목록도 업데이트
    const updatedSaved = savedRecipients.map(r =>
      r.id === updatedRecipient.id ? updatedRecipient : r
    );
    setSavedRecipients(updatedSaved);
    saveToLocalStorage(updatedSaved);

    setEditingRecipient(null);
  };

  // 저장된 수신자에서 추가
  const addFromSaved = (savedRecipient: EmailRecipient) => {
    if (recipients.find(r => r.id === savedRecipient.id)) return;

    const updatedRecipients = [...recipients, {
      ...savedRecipient,
      lastUsed: new Date()
    }];
    onRecipientsChange(updatedRecipients);
  };

  // 이메일 형식 검증
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // 수신자 필터링
  const filteredSavedRecipients = savedRecipients.filter(recipient =>
    !recipients.find(r => r.id === recipient.id) &&
    (recipient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     recipient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
     recipient.company?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // 수신자 유형별 색상
  const getTypeColor = (type: EmailRecipient['type']) => {
    switch (type) {
      case 'vendor': return 'bg-blue-100 text-blue-800';
      case 'cc': return 'bg-green-100 text-green-800';
      case 'bcc': return 'bg-gray-100 text-gray-800';
      case 'manager': return 'bg-purple-100 text-purple-800';
      case 'approver': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 수신자 유형별 라벨
  const getTypeLabel = (type: EmailRecipient['type']) => {
    switch (type) {
      case 'vendor': return '거래처';
      case 'cc': return '참조';
      case 'bcc': return '숨은참조';
      case 'manager': return '관리자';
      case 'approver': return '승인자';
      default: return '기타';
    }
  };

  // CSV 내보내기
  const exportToCSV = () => {
    const csvContent = [
      ['이름', '이메일', '회사', '직책', '전화번호', '유형'].join(','),
      ...recipients.map(r => [
        r.name,
        r.email,
        r.company || '',
        r.position || '',
        r.phone || '',
        getTypeLabel(r.type)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `email_recipients_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const modalContent = (
    <DialogContent className="max-w-5xl h-[90vh] overflow-hidden">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          이메일 수신자 관리
        </DialogTitle>
      </DialogHeader>
      
      <Tabs defaultValue="current" className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current">현재 수신자 ({recipients.length})</TabsTrigger>
          <TabsTrigger value="add">새 수신자 추가</TabsTrigger>
          <TabsTrigger value="saved">저장된 수신자</TabsTrigger>
        </TabsList>
        
        {/* 현재 수신자 관리 */}
        <TabsContent value="current" className="flex-1 overflow-auto space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              총 {recipients.length}명의 수신자
            </div>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              CSV 내보내기
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {recipients.map((recipient) => (
              <Card key={recipient.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{recipient.name}</h4>
                      <Badge className={getTypeColor(recipient.type)}>
                        {getTypeLabel(recipient.type)}
                      </Badge>
                      {recipient.verified ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3" />
                        {recipient.email}
                      </div>
                      {recipient.company && (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3 h-3" />
                          {recipient.company}
                        </div>
                      )}
                      {recipient.position && (
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3" />
                          {recipient.position}
                        </div>
                      )}
                      {recipient.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3" />
                          {recipient.phone}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingRecipient(recipient)}
                    >
                      <Edit3 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeRecipient(recipient.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            
            {recipients.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>등록된 수신자가 없습니다.</p>
                <p className="text-sm">새 수신자를 추가해주세요.</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        {/* 새 수신자 추가 */}
        <TabsContent value="add" className="flex-1 overflow-auto">
          <Card>
            <CardHeader>
              <CardTitle>새 수신자 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-name">이름 *</Label>
                  <Input
                    id="new-name"
                    value={newRecipient.name || ''}
                    onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                    placeholder="수신자 이름"
                  />
                </div>
                
                <div>
                  <Label htmlFor="new-email">이메일 주소 *</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={newRecipient.email || ''}
                    onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                    placeholder="example@company.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="new-company">회사명</Label>
                  <Input
                    id="new-company"
                    value={newRecipient.company || ''}
                    onChange={(e) => setNewRecipient({ ...newRecipient, company: e.target.value })}
                    placeholder="회사명"
                  />
                </div>
                
                <div>
                  <Label htmlFor="new-position">직책</Label>
                  <Input
                    id="new-position"
                    value={newRecipient.position || ''}
                    onChange={(e) => setNewRecipient({ ...newRecipient, position: e.target.value })}
                    placeholder="직책"
                  />
                </div>
                
                <div>
                  <Label htmlFor="new-phone">전화번호</Label>
                  <Input
                    id="new-phone"
                    value={newRecipient.phone || ''}
                    onChange={(e) => setNewRecipient({ ...newRecipient, phone: e.target.value })}
                    placeholder="010-1234-5678"
                  />
                </div>
                
                <div>
                  <Label htmlFor="new-type">수신자 유형</Label>
                  <select
                    id="new-type"
                    className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md"
                    value={newRecipient.type}
                    onChange={(e) => setNewRecipient({ ...newRecipient, type: e.target.value as any })}
                  >
                    <option value="vendor">거래처</option>
                    <option value="cc">참조</option>
                    <option value="bcc">숨은참조</option>
                    <option value="manager">관리자</option>
                    <option value="approver">승인자</option>
                  </select>
                </div>
              </div>
              
              <div className="pt-4">
                <Button 
                  onClick={addRecipient}
                  disabled={!newRecipient.name || !newRecipient.email}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  수신자 추가
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 저장된 수신자 */}
        <TabsContent value="saved" className="flex-1 overflow-auto space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="수신자 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {filteredSavedRecipients.length}명 표시
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filteredSavedRecipients.map((recipient) => (
              <Card key={recipient.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{recipient.name}</h4>
                      <Badge className={getTypeColor(recipient.type)}>
                        {getTypeLabel(recipient.type)}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3" />
                        {recipient.email}
                      </div>
                      {recipient.company && (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3 h-3" />
                          {recipient.company}
                        </div>
                      )}
                    </div>
                    
                    {recipient.lastUsed && (
                      <div className="text-xs text-gray-500">
                        마지막 사용: {new Date(recipient.lastUsed).toLocaleDateString('ko-KR')}
                      </div>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addFromSaved(recipient)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    추가
                  </Button>
                </div>
              </Card>
            ))}
            
            {filteredSavedRecipients.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>검색 결과가 없습니다.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* 수신자 편집 모달 */}
      {editingRecipient && (
        <Dialog open={!!editingRecipient} onOpenChange={() => setEditingRecipient(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>수신자 정보 수정</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">이름</Label>
                <Input
                  id="edit-name"
                  value={editingRecipient.name}
                  onChange={(e) => setEditingRecipient({ ...editingRecipient, name: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-email">이메일 주소</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingRecipient.email}
                  onChange={(e) => setEditingRecipient({ ...editingRecipient, email: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-company">회사명</Label>
                <Input
                  id="edit-company"
                  value={editingRecipient.company || ''}
                  onChange={(e) => setEditingRecipient({ ...editingRecipient, company: e.target.value })}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingRecipient(null)}>
                  취소
                </Button>
                <Button onClick={() => updateRecipient(editingRecipient)}>
                  <Save className="w-4 h-4 mr-2" />
                  저장
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </DialogContent>
  );

  if (trigger) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        {modalContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {modalContent}
    </Dialog>
  );
};

export default EmailRecipientManager;