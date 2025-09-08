import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Upload, FileText, Check, X, Calendar, DollarSign, Receipt, ReceiptText } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface InvoiceManagerProps {
  orderId: number;
}

export function InvoiceManager({ orderId }: InvoiceManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch invoices for this order
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["/api/invoices", orderId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/invoices?orderId=${orderId}`);
      return await res.json();
    },
  });

  // Fetch verification logs
  const { data: verificationLogs = [] } = useQuery({
    queryKey: ["/api/verification-logs", orderId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/verification-logs?orderId=${orderId}`);
      return await res.json();
    },
  });

  // Upload invoice mutation
  const uploadInvoiceMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/invoices", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to upload invoice");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", orderId] });
      queryClient.invalidateQueries({ queryKey: ["/api/verification-logs", orderId] });
      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      toast({
        title: "성공",
        description: "청구서가 업로드되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "청구서 업로드에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // Verify invoice mutation
  const verifyInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const res = await apiRequest("POST", `/api/invoices/${invoiceId}/verify`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", orderId] });
      queryClient.invalidateQueries({ queryKey: ["/api/verification-logs", orderId] });
      toast({
        title: "성공",
        description: "청구서가 검증되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "청구서 검증에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // Tax invoice issuance mutations
  const issueTaxInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const res = await apiRequest("POST", `/api/invoices/${invoiceId}/issue-tax`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", orderId] });
      toast({
        title: "성공",
        description: "세금계산서가 발행되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "세금계산서 발행에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const cancelTaxInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const res = await apiRequest("POST", `/api/invoices/${invoiceId}/cancel-tax`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", orderId] });
      toast({
        title: "성공",
        description: "세금계산서 발행이 취소되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "세금계산서 발행 취소에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleUploadSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("orderId", orderId.toString());
    
    if (selectedFile) {
      formData.set("file", selectedFile);
    }

    uploadInvoiceMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">검토중</Badge>;
      case "verified":
        return <Badge variant="default">검증완료</Badge>;
      case "paid":
        return <Badge variant="outline">지급완료</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "invoice":
        return <Badge variant="outline">청구서</Badge>;
      case "tax_invoice":
        return <Badge variant="outline">세금계산서</Badge>;
      case "other":
        return <Badge variant="outline">기타</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            청구서 관리
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">로딩 중...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm">
            <FileText className="h-4 w-4" />
            청구서 관리
          </div>
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Upload className="h-3 w-3 mr-1" />
                <span className="text-xs">청구서 업로드</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>청구서 업로드</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">청구서 번호</Label>
                  <Input id="invoiceNumber" name="invoiceNumber" required />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="invoiceType">유형</Label>
                  <Select name="invoiceType" defaultValue="invoice">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invoice">청구서</SelectItem>
                      <SelectItem value="tax_invoice">세금계산서</SelectItem>
                      <SelectItem value="other">기타</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="issueDate">발행일</Label>
                    <Input
                      id="issueDate"
                      name="issueDate"
                      type="date"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">마감일</Label>
                    <Input
                      id="dueDate"
                      name="dueDate"
                      type="date"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalAmount">총금액</Label>
                    <Input
                      id="totalAmount"
                      name="totalAmount"
                      type="number"
                      step="0.01"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="vatAmount">부가세</Label>
                    <Input
                      id="vatAmount"
                      name="vatAmount"
                      type="number"
                      step="0.01"
                      defaultValue="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file">첨부파일</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">메모</Label>
                  <Textarea id="notes" name="notes" rows={3} />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsUploadDialogOpen(false)}
                  >
                    취소
                  </Button>
                  <Button type="submit" disabled={uploadInvoiceMutation.isPending}>
                    {uploadInvoiceMutation.isPending ? "업로드 중..." : "업로드"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        {/* Always show Tax Invoice Section */}
        <div className="space-y-3">
          {/* Tax Invoice Management - Always visible */}
          <div className="border-2 border-blue-200 rounded-lg p-3 bg-blue-50 dark:bg-blue-900/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ReceiptText className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">세금계산서 발행 관리</span>
                {invoices.length === 0 ? (
                  <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">청구서 업로드 필요</Badge>
                ) : invoices.some((inv: any) => inv.taxInvoiceIssued) ? (
                  <Badge variant="default" className="text-xs bg-green-600">
                    <Receipt className="h-2 w-2 mr-1" />
                    발행완료
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">미발행</Badge>
                )}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-300">
                {invoices.length === 0 ? "청구서를 먼저 업로드하고 검증해주세요" : 
                 invoices.some((inv: any) => inv.status === "verified") ? "발행 준비 완료" : "청구서 검증 필요"}
              </div>
            </div>
            
            {/* Tax Invoice Action Buttons - Always visible */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-600">
                {invoices.length === 0 ? "세금계산서 발행 관리를 위해서는 청구서를 업로드해주세요." :
                 invoices.some((inv: any) => inv.taxInvoiceIssued) ? "세금계산서가 발행되었습니다." : "세금계산서 발행이 가능합니다."}
              </div>
              <div className="flex gap-2">
                {invoices.length > 0 && invoices.some((inv: any) => inv.status === "verified") ? (
                  <>
                    {!invoices.some((inv: any) => inv.taxInvoiceIssued) ? (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => {
                          const verifiedInvoice = invoices.find((inv: any) => inv.status === "verified" && !inv.taxInvoiceIssued);
                          if (verifiedInvoice) {
                            issueTaxInvoiceMutation.mutate(verifiedInvoice.id);
                          }
                        }}
                        disabled={issueTaxInvoiceMutation.isPending}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        <span className="text-xs">확인</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          const issuedInvoice = invoices.find((inv: any) => inv.taxInvoiceIssued);
                          if (issuedInvoice) {
                            cancelTaxInvoiceMutation.mutate(issuedInvoice.id);
                          }
                        }}
                        disabled={cancelTaxInvoiceMutation.isPending}
                      >
                        <X className="h-3 w-3 mr-1" />
                        <span className="text-xs">미확인</span>
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={true}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      <span className="text-xs">확인</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={true}
                    >
                      <X className="h-3 w-3 mr-1" />
                      <span className="text-xs">미확인</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Invoice List */}
          {invoices.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-xs">
              아직 업로드된 청구서가 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.map((invoice: any) => (
                <div
                  key={invoice.id}
                  className="border rounded-lg p-2 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <h4 className="font-medium text-xs">{invoice.invoiceNumber}</h4>
                      {getTypeBadge(invoice.invoiceType)}
                      {getStatusBadge(invoice.status)}
                    </div>
                    {invoice.status === "pending" && (
                      <Button
                        size="sm"
                        onClick={() => verifyInvoiceMutation.mutate(invoice.id)}
                        disabled={verifyInvoiceMutation.isPending}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        <span className="text-xs">검증</span>
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span>발행일: {format(new Date(invoice.issueDate), "yyyy-MM-dd", { locale: ko })}</span>
                    </div>
                    {invoice.dueDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span>마감일: {format(new Date(invoice.dueDate), "yyyy-MM-dd", { locale: ko })}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      <span>총액: ₩{Math.round(invoice.totalAmount || 0).toLocaleString('ko-KR')}</span>
                    </div>
                    {invoice.vatAmount > 0 && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                        <span>부가세: ₩{Math.round(invoice.vatAmount || 0).toLocaleString('ko-KR')}</span>
                      </div>
                    )}
                  </div>

                  {invoice.notes && (
                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      {invoice.notes}
                    </div>
                  )}

                  {/* Tax Invoice Management Section */}
                  <div className="border-t pt-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <ReceiptText className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium">세금계산서</span>
                        {invoice.taxInvoiceIssued ? (
                          <Badge variant="default" className="text-xs">
                            <Receipt className="h-2 w-2 mr-1" />
                            발행완료
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">미발행</Badge>
                        )}
                      </div>
                      
                      <div className="flex gap-1">
                        {invoice.status === "verified" && (
                          <>
                            {!invoice.taxInvoiceIssued ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => issueTaxInvoiceMutation.mutate(invoice.id)}
                                disabled={issueTaxInvoiceMutation.isPending}
                              >
                                <ReceiptText className="h-3 w-3 mr-1" />
                                <span className="text-xs">{issueTaxInvoiceMutation.isPending ? "처리 중..." : "발행 확인"}</span>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => cancelTaxInvoiceMutation.mutate(invoice.id)}
                                disabled={cancelTaxInvoiceMutation.isPending}
                              >
                                <X className="h-3 w-3 mr-1" />
                                <span className="text-xs">{cancelTaxInvoiceMutation.isPending ? "취소 중..." : "발행 취소"}</span>
                              </Button>
                            )}
                          </>
                        )}
                        {invoice.status !== "verified" && (
                          <div className="text-xs text-muted-foreground">
                            청구서 검증 후 발행 가능
                          </div>
                        )}
                      </div>
                    </div>

                    {invoice.status === "verified" && invoice.taxInvoiceIssued && invoice.taxInvoiceIssuedDate && (
                      <div className="text-xs text-muted-foreground bg-green-50 dark:bg-green-900/20 p-2 rounded">
                        발행일: {format(new Date(invoice.taxInvoiceIssuedDate), "yyyy-MM-dd HH:mm", { locale: ko })}
                        {invoice.taxInvoiceIssuedBy && ` | 발행자: ${invoice.taxInvoiceIssuedBy}`}
                      </div>
                    )}
                  </div>

                  {invoice.verifiedBy && invoice.verifiedAt && (
                    <div className="text-xs text-muted-foreground border-t pt-1">
                      검증자: {invoice.verifiedBy} | 검증일: {format(new Date(invoice.verifiedAt), "yyyy-MM-dd HH:mm", { locale: ko })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {verificationLogs.length > 0 && (
          <div className="mt-3">
            <h4 className="font-medium mb-2 text-xs">검증 로그</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {verificationLogs.map((log: any) => (
                <div key={log.id} className="text-xs p-2 bg-muted rounded">
                  <div className="flex justify-between items-start">
                    <span>{log.details}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.createdAt), "MM-dd HH:mm", { locale: ko })}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {log.performedBy}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}