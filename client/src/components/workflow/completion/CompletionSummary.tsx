import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, FileText, Package, DollarSign, Calendar, Building2 } from 'lucide-react';

interface CompletionSummaryProps {
  orderData: {
    orderNumber?: string;
    totalOrders?: number;
    totalItems?: number;
    totalAmount?: number;
    projectName?: string;
    vendorName?: string;
    type?: 'standard' | 'excel';
    createdAt?: string;
    orders?: any[];
    items?: any[];
  };
}

const CompletionSummary: React.FC<CompletionSummaryProps> = ({ orderData }) => {
  const orderCount = orderData.totalOrders || orderData.orders?.length || 1;
  const itemCount = orderData.totalItems || orderData.items?.length || 0;
  const totalAmount = orderData.totalAmount || 0;

  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-700">
          <CheckCircle className="w-6 h-6" />
          발주서 생성 완료 요약
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 핵심 지표 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {orderCount}
            </div>
            <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
              <FileText className="w-3 h-3" />
              발주서
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {itemCount}
            </div>
            <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
              <Package className="w-3 h-3" />
              품목
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {totalAmount > 0 ? `₩${totalAmount.toLocaleString()}` : '-'}
            </div>
            <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
              <DollarSign className="w-3 h-3" />
              총 금액
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-orange-600 mb-1">
              {orderData.type === 'excel' ? 'Excel' : '표준'}
            </div>
            <div className="text-sm text-gray-600">
              작성 방식
            </div>
          </div>
        </div>

        {/* 발주서 정보 */}
        {orderData.orderNumber && (
          <div className="bg-white rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-gray-900 mb-3">발주서 정보</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">발주서 번호:</span>
                <Badge variant="outline" className="font-mono">
                  {orderData.orderNumber}
                </Badge>
              </div>
              
              {orderData.projectName && (
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">프로젝트:</span>
                  <span className="font-medium">{orderData.projectName}</span>
                </div>
              )}
              
              {orderData.vendorName && (
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">거래처:</span>
                  <span className="font-medium">{orderData.vendorName}</span>
                </div>
              )}
              
              {orderData.createdAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">생성일:</span>
                  <span className="font-medium">
                    {new Date(orderData.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 성공 메시지 */}
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            모든 발주서가 성공적으로 생성되었습니다
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompletionSummary;