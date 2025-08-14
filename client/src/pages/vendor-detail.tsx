import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Building2, Phone, Mail, MapPin, Edit, Trash2, Building, Hash, User, ClipboardList } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { getStatusText, getStatusColor } from "@/lib/statusUtils";
import { useTheme } from "@/components/ui/theme-provider";

import type { Vendor } from "@shared/schema";

export default function VendorDetail() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [match, params] = useRoute("/vendors/:id");
  const vendorId = params?.id ? parseInt(params.id) : 0;

  const { data: vendor, isLoading: vendorLoading } = useQuery<Vendor>({
    queryKey: [`/api/vendors/${vendorId}`],
    enabled: !!user,
  });

  const { data: vendorOrdersData, isLoading: ordersLoading } = useQuery<{ orders: any[] }>({
    queryKey: [`/api/orders/vendor/${vendorId}`],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("vendorId", vendorId.toString());
      params.append("limit", "1000"); // Get all orders for this vendor
      
      const url = `/api/orders?${params.toString()}`;
      const response = await fetch(url, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    },
    enabled: !!user,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/vendors/${vendorId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "성공",
        description: "거래처가 삭제되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      navigate("/vendors");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "권한 없음",
          description: "로그인이 필요합니다.",
          variant: "destructive",
        });
        setTimeout(() => {
          navigate("/login");
        }, 500);
        return;
      }
      toast({
        title: "오류",
        description: "거래처 삭제에 실패했습니다. 연결된 발주서가 있는지 확인해주세요.",
        variant: "destructive",
      });
    },
  });

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        navigate("/login");
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  if (isLoading || !user) {
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

  if (vendorLoading) {
    return (
      <div className={`min-h-screen transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-[1366px] mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className={`animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4 transition-colors ${isDarkMode ? 'border-blue-400' : 'border-blue-600'}`}></div>
              <p className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>거래처 정보를 불러오는 중...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className={`min-h-screen transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-[1366px] mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h2 className={`text-xl font-semibold mb-2 transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>거래처를 찾을 수 없습니다</h2>
              <p className={`mb-4 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>요청하신 거래처가 존재하지 않거나 삭제되었습니다.</p>
              <Button 
                onClick={() => navigate("/vendors")}
                className={`shadow-md hover:shadow-lg transition-all duration-200 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                거래처 목록으로 돌아가기
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const recentOrders = vendorOrdersData?.orders || [];

  if (!vendor) {
    return null;
  }



  return (
    <div className={`min-h-screen transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-[1366px] mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate("/vendors")}
                  className={`transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  목록
                </Button>
                <div className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                  <Building className={`h-6 w-6 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <div>
                  <h1 className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{vendor.name}</h1>
                  <p className={`text-sm mt-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    거래처 상세 정보
                  </p>
                </div>
                <Badge variant={vendor.isActive ? "default" : "secondary"}>
                  {vendor.isActive ? "활성" : "비활성"}
                </Badge>
              </div>
              
              <div className="flex space-x-2">
                {(user as any)?.role === 'admin' && (
                  <>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/vendors/${vendorId}/edit`)}
                      className={`transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      수정
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive"
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          삭제
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <AlertDialogHeader>
                          <AlertDialogTitle className={`transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>거래처 삭제</AlertDialogTitle>
                          <AlertDialogDescription className={`transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            정말로 "{vendor.name}" 거래처를 삭제하시겠습니까?
                            <br />
                            이 작업은 되돌릴 수 없으며, 연결된 발주서가 있는 경우 삭제할 수 없습니다.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className={`transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>취소</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                            className="bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                          >
                            {deleteMutation.isPending ? "삭제 중..." : "삭제"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Basic Information */}
          <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`p-6 border-b transition-colors ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center">
                <div className={`p-2 rounded-lg mr-3 transition-colors ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                  <Building2 className={`h-5 w-5 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <h3 className={`text-lg font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>기본 정보</h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <div className={`flex items-center text-sm font-medium mb-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Hash className={`h-4 w-4 mr-1 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  거래처명
                </div>
                <p className={`text-sm font-semibold transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{vendor.name}</p>
              </div>
              {vendor.businessNumber && (
                <div>
                  <div className={`flex items-center text-sm font-medium mb-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Hash className={`h-4 w-4 mr-1 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    사업자번호
                  </div>
                  <p className={`text-sm transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{vendor.businessNumber}</p>
                </div>
              )}
              {vendor.industry && (
                <div>
                  <div className={`flex items-center text-sm font-medium mb-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Building className={`h-4 w-4 mr-1 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    업종
                  </div>
                  <p className={`text-sm transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{vendor.industry}</p>
                </div>
              )}
              {vendor.contactPerson && (
                <div>
                  <div className={`flex items-center text-sm font-medium mb-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <User className={`h-4 w-4 mr-1 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    담당자
                  </div>
                  <p className={`text-sm transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{vendor.contactPerson}</p>
                </div>
              )}
            </div>
          </div>

        {/* Contact Information */}
        <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`p-6 border-b transition-colors ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center">
              <div className={`p-2 rounded-lg mr-3 transition-colors ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                <Phone className={`h-5 w-5 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
              <h3 className={`text-lg font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>연락처 정보</h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {vendor.phone && (
              <div>
                <div className={`flex items-center text-sm font-medium mb-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Phone className={`h-4 w-4 mr-1 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  전화번호
                </div>
                <p className={`text-sm transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{vendor.phone}</p>
              </div>
            )}
            {vendor.email && (
              <div>
                <div className={`flex items-center text-sm font-medium mb-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Mail className={`h-4 w-4 mr-1 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  이메일
                </div>
                <p className={`text-sm transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{vendor.email}</p>
              </div>
            )}
            {vendor.address && (
              <div>
                <div className={`flex items-center text-sm font-medium mb-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <MapPin className={`h-4 w-4 mr-1 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  주소
                </div>
                <p className={`text-sm transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{vendor.address}</p>
              </div>
            )}
            {vendor.memo && (
              <div>
                <div className={`flex items-center text-sm font-medium mb-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Hash className={`h-4 w-4 mr-1 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  메모
                </div>
                <p className={`text-sm transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{vendor.memo}</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`p-6 border-b transition-colors ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center">
              <div className={`p-2 rounded-lg mr-3 transition-colors ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                <ClipboardList className={`h-5 w-5 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
              <h3 className={`text-lg font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>최근 발주서</h3>
            </div>
          </div>
          <div className="p-6">
            {ordersLoading ? (
              <div className="animate-pulse space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className={`h-12 rounded transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                ))}
              </div>
            ) : recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.slice(0, 5).map((order: any) => (
                  <div 
                    key={order.id} 
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${isDarkMode ? 'border-gray-600 bg-gray-700/50 hover:bg-gray-700' : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100'}`}
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{order.orderNumber}</p>
                          <p className={`text-xs transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            {new Date(order.orderDate).toLocaleDateString("ko-KR")}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge variant={order.status === 'approved' ? 'default' : 'secondary'} className="text-xs">
                            {getStatusText(order.status)}
                          </Badge>
                          <p className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                            ₩{Math.round(order.totalAmount || 0).toLocaleString('ko-KR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {recentOrders.length > 5 && (
                  <div className="text-center pt-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/orders?vendor=${vendorId}`)}
                      className={`shadow-md hover:shadow-lg transition-all duration-200 ${isDarkMode ? 'text-blue-400 border-blue-600 hover:bg-blue-900/20' : 'text-blue-600 border-blue-600 hover:bg-blue-50'}`}
                    >
                      모든 발주서 보기 ({recentOrders.length}개)
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className={`text-sm text-center py-6 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>발주서가 없습니다.</p>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}