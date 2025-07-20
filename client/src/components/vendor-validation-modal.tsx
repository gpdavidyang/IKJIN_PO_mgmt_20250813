import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle2, Plus, Search } from 'lucide-react';

interface VendorValidationResult {
  vendorName: string;
  exists: boolean;
  exactMatch?: {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    contactPerson: string;
  };
  suggestions: Array<{
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    contactPerson: string;
    similarity: number;
    distance: number;
    isRecentlyUsed?: boolean;
    lastUsedDate?: Date | string;
  }>;
}

interface EmailConflictInfo {
  type: 'conflict' | 'no_conflict';
  excelEmail: string;
  dbEmail?: string;
  vendorId?: number;
  vendorName?: string;
}

interface VendorValidationData {
  vendorValidations: VendorValidationResult[];
  deliveryValidations: VendorValidationResult[];
  emailConflicts: EmailConflictInfo[];
  summary: {
    totalVendors: number;
    totalDeliveries: number;
    unregisteredVendors: number;
    unregisteredDeliveries: number;
    emailConflicts: number;
    needsAction: boolean;
  };
}

interface VendorValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  validationData: VendorValidationData;
  onConfirm: (resolvedVendors: ResolvedVendorData[]) => void;
}

interface ResolvedVendorData {
  originalName: string;
  type: '거래처' | '납품처';
  action: 'use_existing' | 'create_new' | 'skip';
  existingVendorId?: number;
  newVendorData?: {
    name: string;
    email: string;
    contactPerson: string;
    phone?: string;
  };
}

interface NewVendorForm {
  name: string;
  email: string;
  contactPerson: string;
  phone: string;
}

export function VendorValidationModal({ 
  isOpen, 
  onClose, 
  validationData, 
  onConfirm 
}: VendorValidationModalProps) {
  const [resolvedVendors, setResolvedVendors] = useState<Map<string, ResolvedVendorData>>(new Map());
  const [newVendorForms, setNewVendorForms] = useState<Map<string, NewVendorForm>>(new Map());
  const [activeTab, setActiveTab] = useState<'vendors' | 'deliveries' | 'conflicts'>('vendors');

  const unregisteredVendors = validationData.vendorValidations.filter(v => !v.exists);
  const unregisteredDeliveries = validationData.deliveryValidations.filter(v => !v.exists);
  const emailConflicts = validationData.emailConflicts.filter(e => e.type === 'conflict');

  const handleVendorAction = (
    vendorName: string,
    vendorType: '거래처' | '납품처',
    action: 'use_existing' | 'create_new' | 'skip',
    vendorId?: number
  ) => {
    const key = `${vendorType}-${vendorName}`;
    const resolved: ResolvedVendorData = {
      originalName: vendorName,
      type: vendorType,
      action,
      existingVendorId: vendorId,
    };

    setResolvedVendors(prev => new Map(prev.set(key, resolved)));
  };

  const handleNewVendorData = (vendorName: string, vendorType: '거래처' | '납품처', formData: NewVendorForm) => {
    const key = `${vendorType}-${vendorName}`;
    setNewVendorForms(prev => new Map(prev.set(key, formData)));

    const resolved: ResolvedVendorData = {
      originalName: vendorName,
      type: vendorType,
      action: 'create_new',
      newVendorData: formData,
    };

    setResolvedVendors(prev => new Map(prev.set(key, resolved)));
  };

  const handleConfirm = () => {
    const allResolved = Array.from(resolvedVendors.values());
    onConfirm(allResolved);
    onClose();
  };

  const isAllResolved = () => {
    const totalUnresolved = unregisteredVendors.length + unregisteredDeliveries.length;
    return resolvedVendors.size >= totalUnresolved;
  };

  const renderVendorCard = (vendor: VendorValidationResult, type: '거래처' | '납품처') => {
    const key = `${type}-${vendor.vendorName}`;
    const resolved = resolvedVendors.get(key);
    const newVendorForm = newVendorForms.get(key) || {
      name: vendor.vendorName,
      email: '',
      contactPerson: '',
      phone: '',
    };

    return (
      <Card key={key} className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{vendor.vendorName}</CardTitle>
              <CardDescription>
                <Badge variant="outline">{type}</Badge>
                <span className="ml-2">등록되지 않은 업체</span>
              </CardDescription>
            </div>
            <AlertCircle className="h-5 w-5 text-amber-500" />
          </div>
        </CardHeader>
        <CardContent>
          {vendor.suggestions.length > 0 && (
            <div className="mb-4">
              <Label className="text-sm font-medium">유사한 업체 ({vendor.suggestions.length}개)</Label>
              <div className="mt-2 space-y-2">
                {vendor.suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      resolved?.action === 'use_existing' && resolved?.existingVendorId === suggestion.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleVendorAction(vendor.vendorName, type, 'use_existing', suggestion.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{suggestion.name}</div>
                        <div className="text-sm text-gray-600">
                          <span className="inline-flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {suggestion.email}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          <span className="inline-flex items-center">
                            <Users className="h-3 w-3 mr-1" />
                            담당자: {suggestion.contactPerson}
                          </span>
                          {suggestion.phone && (
                            <span className="ml-3">
                              📞 {suggestion.phone}
                            </span>
                          )}
                        </div>
                        {suggestion.isRecentlyUsed && (
                          <div className="text-sm text-orange-600 mt-1">
                            🔥 최근 사용 ({suggestion.lastUsedDate ? new Date(suggestion.lastUsedDate).toLocaleDateString('ko-KR') : ''})
                          </div>
                        )}
                      </div>
                      <div className="ml-3 text-right">
                        <Badge variant="secondary">
                          {(suggestion.similarity * 100).toFixed(0)}% 유사
                        </Badge>
                        {resolved?.action === 'use_existing' && resolved?.existingVendorId === suggestion.id && (
                          <CheckCircle2 className="h-5 w-5 text-blue-500 mt-2 ml-auto" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator className="my-4" />

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Button
                variant={resolved?.action === 'create_new' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleVendorAction(vendor.vendorName, type, 'create_new')}
              >
                <Plus className="h-4 w-4 mr-2" />
                신규 등록
              </Button>
              <Button
                variant={resolved?.action === 'skip' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleVendorAction(vendor.vendorName, type, 'skip')}
              >
                건너뛰기
              </Button>
            </div>

            {resolved?.action === 'create_new' && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <Label className="text-sm font-medium mb-3 block">신규 업체 정보</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`name-${key}`}>업체명</Label>
                    <Input
                      id={`name-${key}`}
                      value={newVendorForm.name}
                      onChange={(e) => {
                        const updated = { ...newVendorForm, name: e.target.value };
                        setNewVendorForms(prev => new Map(prev.set(key, updated)));
                        handleNewVendorData(vendor.vendorName, type, updated);
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`email-${key}`}>이메일 *</Label>
                    <Input
                      id={`email-${key}`}
                      type="email"
                      value={newVendorForm.email}
                      onChange={(e) => {
                        const updated = { ...newVendorForm, email: e.target.value };
                        setNewVendorForms(prev => new Map(prev.set(key, updated)));
                        handleNewVendorData(vendor.vendorName, type, updated);
                      }}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor={`contact-${key}`}>담당자명 *</Label>
                    <Input
                      id={`contact-${key}`}
                      value={newVendorForm.contactPerson}
                      onChange={(e) => {
                        const updated = { ...newVendorForm, contactPerson: e.target.value };
                        setNewVendorForms(prev => new Map(prev.set(key, updated)));
                        handleNewVendorData(vendor.vendorName, type, updated);
                      }}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor={`phone-${key}`}>연락처</Label>
                    <Input
                      id={`phone-${key}`}
                      value={newVendorForm.phone}
                      onChange={(e) => {
                        const updated = { ...newVendorForm, phone: e.target.value };
                        setNewVendorForms(prev => new Map(prev.set(key, updated)));
                        handleNewVendorData(vendor.vendorName, type, updated);
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderEmailConflictCard = (conflict: EmailConflictInfo) => (
    <Card key={`conflict-${conflict.vendorName}`} className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{conflict.vendorName}</CardTitle>
            <CardDescription>이메일 주소 불일치</CardDescription>
          </div>
          <AlertCircle className="h-5 w-5 text-red-500" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium">엑셀 파일의 이메일</Label>
            <div className="p-2 bg-blue-50 rounded border">{conflict.excelEmail}</div>
          </div>
          <div>
            <Label className="text-sm font-medium">데이터베이스의 이메일</Label>
            <div className="p-2 bg-gray-50 rounded border">{conflict.dbEmail}</div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">엑셀 이메일 사용</Button>
            <Button variant="outline" size="sm">DB 이메일 사용</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>거래처/납품처 검증 결과</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 요약 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">검증 요약</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-amber-600">
                    {validationData.summary.unregisteredVendors}
                  </div>
                  <div className="text-sm text-gray-600">미등록 거래처</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-600">
                    {validationData.summary.unregisteredDeliveries}
                  </div>
                  <div className="text-sm text-gray-600">미등록 납품처</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {validationData.summary.emailConflicts}
                  </div>
                  <div className="text-sm text-gray-600">이메일 충돌</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 탭 네비게이션 */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <Button
              variant={activeTab === 'vendors' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('vendors')}
              className="flex-1"
            >
              미등록 거래처 ({unregisteredVendors.length})
            </Button>
            <Button
              variant={activeTab === 'deliveries' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('deliveries')}
              className="flex-1"
            >
              미등록 납품처 ({unregisteredDeliveries.length})
            </Button>
            <Button
              variant={activeTab === 'conflicts' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('conflicts')}
              className="flex-1"
            >
              이메일 충돌 ({emailConflicts.length})
            </Button>
          </div>

          {/* 탭 내용 */}
          <div className="min-h-[400px]">
            {activeTab === 'vendors' && (
              <div>
                {unregisteredVendors.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    모든 거래처가 등록되어 있습니다.
                  </div>
                ) : (
                  unregisteredVendors.map(vendor => renderVendorCard(vendor, '거래처'))
                )}
              </div>
            )}

            {activeTab === 'deliveries' && (
              <div>
                {unregisteredDeliveries.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    모든 납품처가 등록되어 있습니다.
                  </div>
                ) : (
                  unregisteredDeliveries.map(vendor => renderVendorCard(vendor, '납품처'))
                )}
              </div>
            )}

            {activeTab === 'conflicts' && (
              <div>
                {emailConflicts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    이메일 충돌이 없습니다.
                  </div>
                ) : (
                  emailConflicts.map(conflict => renderEmailConflictCard(conflict))
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!isAllResolved()}
          >
            확인 ({resolvedVendors.size}/{unregisteredVendors.length + unregisteredDeliveries.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}