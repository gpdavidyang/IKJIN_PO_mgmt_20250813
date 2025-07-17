import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderPreviewPrint } from "./order-preview-print";

interface OrderPreviewProps {
  order: any;
}

export function OrderPreview({ order }: OrderPreviewProps) {
  const formatAmount = (amount: number) => {
    return `₩${Math.round(amount).toLocaleString('ko-KR')}`;
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'yyyy년 MM월 dd일');
  };

  const getTotalAmount = () => {
    if (!order.items || order.items.length === 0) return 0;
    
    return order.items.reduce((sum: number, item: any) => {
      // 각 항목의 총액 계산 (quantity × unitPrice)
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const itemTotal = item.totalAmount || (quantity * unitPrice);
      
      const validTotal = parseFloat(itemTotal) || 0;
      return sum + validTotal;
    }, 0);
  };

  return (
    <div style={{
      fontFamily: '"Noto Sans KR", "Malgun Gothic", sans-serif',
      fontSize: '11px',
      lineHeight: '1.3',
      color: '#000',
      backgroundColor: '#fff',
      width: '210mm',
      minHeight: '297mm',
      padding: '10mm',
      margin: '0 auto',
      boxShadow: '0 0 10px rgba(0,0,0,0.1)'
    }}>
      {/* Header */}
      <div className="text-left mb-2 pb-1 border-b-2 border-gray-800">
        <h1 className="text-lg font-bold tracking-wide text-gray-800">
          발주서 Purchase Order
        </h1>
      </div>

      {/* Company Info & Order Info */}
      <div className="grid grid-cols-2 gap-3 mb-2 mt-4">
        {/* 발주자 정보 */}
        <div className="border border-gray-300">
          <div className="bg-gray-100 px-2 py-0.5 border-b border-gray-300">
            <h3 className="text-xs font-bold">발주자 정보</h3>
          </div>
          <div className="p-1 space-y-0.5">
            <div className="flex text-xs">
              <span className="w-12 font-medium">회사명:</span>
              <span>발주 시스템</span>
            </div>
            <div className="flex text-xs">
              <span className="w-12 font-medium">담당자:</span>
              <span>{order.user?.firstName} {order.user?.lastName}</span>
            </div>
            <div className="flex text-xs">
              <span className="w-12 font-medium">이메일:</span>
              <span>{order.user?.email}</span>
            </div>
            <div className="flex text-xs">
              <span className="w-12 font-medium">연락처:</span>
              <span>031-000-0000</span>
            </div>
            <div className="flex text-xs">
              <span className="w-12 font-medium">주소:</span>
              <span>경기도 성남시 분당구</span>
            </div>
          </div>
        </div>

        {/* 거래처 정보 */}
        <div className="border border-gray-300">
          <div className="bg-gray-100 px-2 py-0.5 border-b border-gray-300">
            <h3 className="text-xs font-bold">거래처 정보</h3>
          </div>
          <div className="p-1 space-y-0.5">
            <div className="flex text-xs">
              <span className="w-12 font-medium">회사명:</span>
              <span>{order.vendor?.name}</span>
            </div>
            <div className="flex text-xs">
              <span className="w-12 font-medium">사업자:</span>
              <span>{order.vendor?.businessNumber}</span>
            </div>
            <div className="flex text-xs">
              <span className="w-12 font-medium">담당자:</span>
              <span>{order.vendor?.contactPerson}</span>
            </div>
            <div className="flex text-xs">
              <span className="w-12 font-medium">연락처:</span>
              <span>{order.vendor?.phone}</span>
            </div>
            <div className="flex text-xs">
              <span className="w-12 font-medium">주소:</span>
              <span>{order.vendor?.address}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 발주 기본 정보 */}
      <div className="mb-2 mt-4">
        <div className="border border-gray-300">
          <div className="bg-gray-100 px-2 py-0.5 border-b border-gray-300">
            <h3 className="text-xs font-bold">발주 정보</h3>
          </div>
          <div className="p-1">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex">
                <span className="w-12 font-medium">발주번호:</span>
                <span className="font-bold">{order.orderNumber}</span>
              </div>
              <div className="flex">
                <span className="w-12 font-medium">발주일자:</span>
                <span>{order.orderDate ? formatDate(order.orderDate) : "-"}</span>
              </div>
              <div className="flex">
                <span className="w-12 font-medium">납기일자:</span>
                <span>{order.deliveryDate ? formatDate(order.deliveryDate) : "2025년 01월 20일"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 발주 항목 */}
      <div className="mb-2 mt-4">
        <div className="border border-gray-300">
          <div className="bg-gray-100 px-2 py-0.5 border-b border-gray-300">
            <h3 className="text-xs font-bold">발주 항목</h3>
          </div>
          <Table className="w-full text-xs border-collapse">
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="border border-gray-300 text-center font-bold py-0.5 w-12 whitespace-nowrap">순번</TableHead>
                <TableHead className="border border-gray-300 text-center font-bold py-0.5 w-32 whitespace-nowrap">품목명</TableHead>
                <TableHead className="border border-gray-300 text-center font-bold py-0.5 w-24 whitespace-nowrap">규격</TableHead>
                <TableHead className="border border-gray-300 text-center font-bold py-0.5 w-16 whitespace-nowrap">수량</TableHead>
                <TableHead className="border border-gray-300 text-center font-bold py-0.5 w-20 whitespace-nowrap">단가</TableHead>
                <TableHead className="border border-gray-300 text-center font-bold py-0.5 w-24 whitespace-nowrap">금액</TableHead>
                <TableHead className="border border-gray-300 text-center font-bold py-0.5 w-20 whitespace-nowrap">비고</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items && order.items.length > 0 ? (
                order.items.map((item: any, index: number) => (
                  <TableRow key={item.id || index}>
                    <TableCell className="border border-gray-300 text-center py-0.5 whitespace-nowrap">
                      {index + 1}
                    </TableCell>
                    <TableCell className="border border-gray-300 py-0.5 px-1 whitespace-nowrap">
                      {item.itemName}
                    </TableCell>
                    <TableCell className="border border-gray-300 py-0.5 px-1 whitespace-nowrap">
                      {item.specification || "-"}
                    </TableCell>
                    <TableCell className="border border-gray-300 text-center py-0.5 whitespace-nowrap">
                      {parseFloat(item.quantity).toLocaleString()}
                    </TableCell>
                    <TableCell className="border border-gray-300 text-right py-0.5 px-1 whitespace-nowrap">
                      {formatAmount(item.unitPrice)}
                    </TableCell>
                    <TableCell className="border border-gray-300 text-right py-0.5 px-1 font-bold whitespace-nowrap">
                      {formatAmount(item.totalAmount)}
                    </TableCell>
                    <TableCell className="border border-gray-300 py-0.5 px-1 whitespace-nowrap">
                      {item.notes || "정기 발주"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="border border-gray-300 text-center py-2 text-gray-500">
                    발주 항목이 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* 합계 - 1줄로 정리 */}
        <div className="mt-1 p-1 bg-gray-100 border border-gray-300 text-right">
          <span className="text-xs font-bold">총 금액: {formatAmount(getTotalAmount())} (VAT 포함)</span>
        </div>
      </div>

      {/* 특이사항 */}
      <div className="mb-2 mt-4">
        <div className="border border-gray-300">
          <div className="bg-gray-100 px-2 py-0.5 border-b border-gray-300">
            <h3 className="text-xs font-bold">특이사항</h3>
          </div>
          <div className="p-1 min-h-[20px]">
            <p className="whitespace-pre-wrap text-xs">
              {order.notes || "본 발주서는 정기 발주에 따른 발생 건으로, 품질 및 납기일정을 준수하여 주시기 바랍니다."}
            </p>
          </div>
        </div>
      </div>

      {/* 서명란 */}
      <div className="grid grid-cols-2 gap-4 mt-4 mb-3">
        <div className="border border-gray-300 text-center">
          <div className="bg-gray-100 px-2 py-0.5 border-b border-gray-300">
            <h4 className="text-xs font-bold">발주자</h4>
          </div>
          <div className="p-1 space-y-1 text-xs">
            <div>날짜: {order.orderDate ? formatDate(order.orderDate) : "2025년 06월 05일"}</div>
            <div>서명: _______________</div>
          </div>
        </div>
        
        <div className="border border-gray-300 text-center">
          <div className="bg-gray-100 px-2 py-0.5 border-b border-gray-300">
            <h4 className="text-xs font-bold">승인자</h4>
          </div>
          <div className="p-1 space-y-1 text-xs">
            <div>날짜: _______________</div>
            <div>서명: _______________</div>
          </div>
        </div>
      </div>

      {/* Footer - 구분선과 시스템 정보 */}
      <div className="mt-6 pt-2 border-t border-gray-400">
        <div className="flex justify-between items-center text-xs text-gray-600">
          <span>본 발주서는 자재 발주 관리 시스템에서 자동 생성되었습니다. 생성일시: {format(new Date(), 'yyyy년 MM월 dd일 HH:mm')}</span>
          <span>페이지 1</span>
        </div>
      </div>
    </div>
  );
}