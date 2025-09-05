import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Edit, Send, Check, FileText, Download, Eye, Printer, Package, Building, User, Calendar, DollarSign, MapPin, Truck, Loader2, ExternalLink } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { formatKoreanWon } from "@/lib/utils";
import { AttachedFilesInfo } from "@/components/attached-files-info";

export default function OrderDetailStandard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams();
  const [showPreview, setShowPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const orderId = parseInt(params.id);

  const { data: order, isLoading } = useQuery({
    queryKey: [`/api/orders/${orderId}`],
  });

  const { data: orderStatuses } = useQuery({
    queryKey: ["/api/order-statuses"],
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/orders/${orderId}/approve`);
    },
    onSuccess: () => {
      toast({
        title: "발주서 승인",
        description: "발주서가 성공적으로 승인되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
    },
    onError: (error) => {
      toast({
        title: "승인 실패",
        description: "발주서 승인 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/orders/${orderId}/send`);
    },
    onSuccess: () => {
      toast({
        title: "발주서 전송",
        description: "발주서가 성공적으로 전송되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
    },
    onError: (error) => {
      toast({
        title: "전송 실패",
        description: "발주서 전송 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-500">발주서를 찾을 수 없습니다.</div>
      </div>
    );
  }

  const statusColor = order.status === "draft" ? "bg-gray-500" : 
                      order.status === "pending" ? "bg-yellow-500" : 
                      order.status === "approved" ? "bg-green-500" : 
                      order.status === "sent" ? "bg-blue-500" : "bg-gray-500";

  const statusText = orderStatuses?.find((s: any) => s.code === order.status)?.name || order.status;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1366px] mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/orders")}
            className="flex items-center space-x-2 h-8"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>돌아가기</span>
          </Button>
          <div className="flex items-center space-x-3">
            <FileText className="h-5 w-5 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
              <p className="text-sm text-gray-500">표준 발주서 상세</p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={`${statusColor} text-white text-xs px-2 py-1`}>
            {statusText}
          </Badge>
          <span className="text-xs text-gray-500">{order.orderDate ? format(new Date(order.orderDate), 'yyyy. M. d.') : ''}</span>
        </div>
      </div>

      {/* Main Content - Compact Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          
          {/* 기본 정보 섹션 */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gray-50 py-3 px-4">
              <CardTitle className="flex items-center space-x-2 text-lg font-semibold">
                <Building className="h-5 w-5 text-blue-600" />
                <span>기본 정보</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-3">
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                <div className="flex">
                  <span className="text-gray-600 w-20">발주번호:</span>
                  <span className="font-medium">{order.orderNumber}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-600 w-20">발주일:</span>
                  <span>{order.orderDate ? format(new Date(order.orderDate), 'yyyy-MM-dd') : '-'}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-600 w-20">납기희망일:</span>
                  <span>{order.deliveryDate ? format(new Date(order.deliveryDate), 'yyyy-MM-dd') : '-'}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-600 w-20">합계:</span>
                  <span className="font-semibold text-blue-600">{formatKoreanWon(order.totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 현장 정보 */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gray-50 py-3 px-4">
              <CardTitle className="flex items-center space-x-2 text-lg font-semibold">
                <MapPin className="h-5 w-5 text-blue-600" />
                <span>현장 정보</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-3">
              {order.project ? (
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                  <div className="flex">
                    <span className="text-gray-600 w-20">현장명:</span>
                    <span className="font-medium">{order.project.projectName}</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-600 w-20">현장코드:</span>
                    <span>{order.project.projectCode}</span>
                  </div>
                  <div className="flex col-span-2">
                    <span className="text-gray-600 w-20">현장주소:</span>
                    <span>{order.project.location}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">현장 정보가 없습니다.</p>
              )}
            </CardContent>
          </Card>

          {/* 거래처 정보 */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gray-50 py-3 px-4">
              <CardTitle className="flex items-center space-x-2 text-lg font-semibold">
                <Building className="h-5 w-5 text-blue-600" />
                <span>납품처</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-3">
              {order.vendor ? (
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                  <div className="flex">
                    <span className="text-gray-600 w-20">업체명:</span>
                    <span className="font-medium">{order.vendor.name}</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-600 w-20">대표자:</span>
                    <span>{order.vendor.representative || '-'}</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-600 w-20">사업자번호:</span>
                    <span>{order.vendor.businessNumber}</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-600 w-20">연락처:</span>
                    <span>{order.vendor.phone}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">거래처 정보가 없습니다.</p>
              )}
            </CardContent>
          </Card>

          {/* 담당자 정보 */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gray-50 py-3 px-4">
              <CardTitle className="flex items-center space-x-2 text-lg font-semibold">
                <User className="h-5 w-5 text-blue-600" />
                <span>담당자</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-3">
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                <div className="flex">
                  <span className="text-gray-600 w-20">본사 담당자:</span>
                  <span className="font-medium">{order.user?.name || '-'}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-600 w-20">인수 담당자:</span>
                  <span>현장 담당자</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 품목 리스트 */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gray-50 py-3 px-4">
              <CardTitle className="flex items-center justify-between text-sm font-semibold">
                <div className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <span>품목 리스트</span>
                </div>
                <span className="text-blue-600">총 합계 {formatKoreanWon(order.totalAmount)}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 py-3">
              {order.items && order.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-4 font-medium text-gray-600">품목명</th>
                        <th className="text-center py-2 px-4 font-medium text-gray-600">규격</th>
                        <th className="text-center py-2 px-4 font-medium text-gray-600">수량</th>
                        <th className="text-center py-2 px-4 font-medium text-gray-600">단위</th>
                        <th className="text-right py-2 px-4 font-medium text-gray-600">단가</th>
                        <th className="text-right py-2 px-4 font-medium text-gray-600">금액</th>
                        <th className="text-center py-2 px-4 font-medium text-gray-600">비고</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item: any, index: number) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-4 font-medium">{item.itemName || item.item_name}</td>
                          <td className="py-2 px-4 text-center">{item.specification || '-'}</td>
                          <td className="py-2 px-4 text-center">{typeof item.quantity === 'number' ? item.quantity.toLocaleString() : item.quantity || '-'}</td>
                          <td className="py-2 px-4 text-center">개</td>
                          <td className="py-2 px-4 text-right font-semibold text-blue-600">{formatKoreanWon(item.unitPrice || item.unit_price)}</td>
                          <td className="py-2 px-4 text-right font-semibold text-blue-600">{formatKoreanWon(item.totalAmount || item.total_amount)}</td>
                          <td className="py-2 px-4 text-center text-gray-500">{item.notes ? item.notes.split('/').join(' ') : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-xs">등록된 품목이 없습니다.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 특이사항 */}
          {order.notes && (
            <Card className="shadow-sm">
              <CardHeader className="bg-gray-50 py-3 px-4">
                <CardTitle className="flex items-center space-x-2 text-lg font-semibold">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span>특이사항</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 py-3">
                <p className="text-xs text-gray-700 leading-relaxed">{order.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* 첨부파일 */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gray-50 py-3 px-4">
              <CardTitle className="flex items-center space-x-2 text-lg font-semibold">
                <FileText className="h-5 w-5 text-blue-600" />
                <span>첨부파일</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-3">
              {order.attachments && order.attachments.length > 0 ? (
                <div className="space-y-2">
                  {order.attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-3 w-3 text-blue-600" />
                        <span>{attachment.originalName}</span>
                        <span className="text-gray-500">({(attachment.fileSize / 1024).toFixed(1)} KB)</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs"
                        onClick={() => window.open(`/api/attachments/${attachment.id}`, '_blank')}
                      >
                        다운로드
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">첨부된 파일이 없습니다.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 작업 버튼 */}
        <div className="space-y-4">
          {/* 승인 상태 */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gray-50 py-3 px-4">
              <CardTitle className="flex items-center space-x-2 text-lg font-semibold">
                <Check className="h-5 w-5 text-blue-600" />
                <span>승인 상태</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-3">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">현재 상태</label>
                  <Badge className={`${statusColor} text-white text-xs`}>
                    {statusText}
                  </Badge>
                </div>
                {order.status === "pending" && (
                  <Button
                    onClick={() => approveMutation.mutate()}
                    disabled={approveMutation.isPending}
                    className="w-full h-8 text-xs"
                    size="sm"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    승인
                  </Button>
                )}
                {order.status === "approved" && (
                  <Button
                    onClick={() => sendMutation.mutate()}
                    disabled={sendMutation.isPending}
                    className="w-full h-8 text-xs"
                    size="sm"
                  >
                    <Send className="h-3 w-3 mr-1" />
                    전송
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 작업 버튼 */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gray-50 py-3 px-4">
              <CardTitle className="flex items-center space-x-2 text-lg font-semibold">
                <FileText className="h-5 w-5 text-blue-600" />
                <span>작업</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-3 space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setIsGeneratingPdf(true);
                  try {
                    const response = await apiRequest('POST', '/api/orders/generate-pdf', {
                      orderData: order
                    });
                    if (response.pdfUrl) {
                      setPdfUrl(response.pdfUrl);
                      setShowPreview(true);
                    }
                  } catch (error) {
                    console.error('PDF 생성 오류:', error);
                    toast({
                      title: "PDF 생성 실패",
                      description: "PDF 생성 중 오류가 발생했습니다.",
                      variant: "destructive",
                    });
                  } finally {
                    setIsGeneratingPdf(false);
                  }
                }}
                disabled={isGeneratingPdf}
                className="w-full h-8 text-xs justify-start"
              >
                {isGeneratingPdf ? (
                  <><Loader2 className="h-3 w-3 mr-2 animate-spin" /> PDF 생성 중...</>
                ) : (
                  <><Eye className="h-3 w-3 mr-2" /> PDF 미리보기</>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/orders/${orderId}/edit`)}
                className="w-full h-8 text-xs justify-start"
              >
                <Edit className="h-3 w-3 mr-2" />
                발주서 수정
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="w-full h-8 text-xs justify-start"
              >
                <Printer className="h-3 w-3 mr-2" />
                인쇄
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* PDF Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={(open) => {
        setShowPreview(open);
        if (!open) {
          setPdfUrl(null);
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center justify-between">
              <span>발주서 미리보기</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (pdfUrl) {
                      window.open(`${pdfUrl}?download=true`, '_blank');
                    }
                  }}
                  disabled={!pdfUrl}
                >
                  <Download className="h-4 w-4 mr-2" />
                  다운로드
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (pdfUrl) {
                      window.open(pdfUrl, '_blank');
                    }
                  }}
                  disabled={!pdfUrl}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  새 탭에서 열기
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="w-full h-[75vh] bg-gray-100">
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}