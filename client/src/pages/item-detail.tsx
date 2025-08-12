import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, Hash, Ruler, Scale, DollarSign, Calendar, Building2 } from "lucide-react";
import { formatKoreanWon } from "@/lib/utils";
import { format } from "date-fns";

export default function ItemDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();

  const { data: item, isLoading, error } = useQuery({
    queryKey: [`/api/items/${id}`],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 rounded"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="p-6">
        <div className="text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold mb-2">품목을 찾을 수 없습니다</h2>
          <p className="text-gray-600 mb-4">요청하신 품목이 존재하지 않습니다.</p>
          <Button onClick={() => navigate("/items")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            품목 목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      "강재": "bg-blue-100 text-blue-800",
      "강판": "bg-slate-100 text-slate-800", 
      "단열재": "bg-green-100 text-green-800",
      "도장재": "bg-purple-100 text-purple-800",
      "마감재": "bg-yellow-100 text-yellow-800",
      "방수재": "bg-cyan-100 text-cyan-800",
      "부속품": "bg-orange-100 text-orange-800",
      "볼트": "bg-gray-100 text-gray-800",
      "사각강관": "bg-indigo-100 text-indigo-800",
      "시트": "bg-pink-100 text-pink-800",
      "앵글": "bg-emerald-100 text-emerald-800",
      "용접재": "bg-red-100 text-red-800",
      "전선": "bg-amber-100 text-amber-800",
      "철근": "bg-stone-100 text-stone-800",
      "파이프": "bg-teal-100 text-teal-800"
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1366px] mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/items")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              목록
            </Button>
            <Package className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
              <p className="text-sm text-gray-600 mt-1">
                품목 상세 정보
              </p>
            </div>
            <Badge className={getCategoryBadgeColor(item.category)}>
              {item.category}
            </Badge>
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/items`)}>
              목록으로
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 기본 정보 */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Hash className="h-5 w-5 text-blue-600" />
              기본 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Hash className="h-4 w-4 text-gray-500" />
                  <label className="text-sm font-medium text-gray-600">품목명</label>
                </div>
                <p className="text-sm text-gray-900">{item.name}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <label className="text-sm font-medium text-gray-600">카테고리</label>
                </div>
                <Badge className={getCategoryBadgeColor(item.category)}>
                  {item.category}
                </Badge>
              </div>
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Ruler className="h-4 w-4 text-gray-500" />
                <label className="text-sm font-medium text-gray-600">규격</label>
              </div>
              <p className="text-sm text-gray-900">{item.specification || '-'}</p>
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Scale className="h-4 w-4 text-gray-500" />
                <label className="text-sm font-medium text-gray-600">단위</label>
              </div>
              <p className="text-sm text-gray-900">{item.unit}</p>
            </div>
          </CardContent>
        </Card>

        {/* 가격 정보 */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <DollarSign className="h-5 w-5 text-blue-600" />
              가격 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <label className="text-sm font-medium text-gray-600">단가</label>
              </div>
              <p className="text-lg font-semibold text-blue-600">
                {formatKoreanWon(item.unitPrice)}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <label className="text-sm font-medium text-gray-600">등록일</label>
                </div>
                <p className="text-sm text-gray-900">
                  {item.createdAt ? format(new Date(item.createdAt), 'yyyy.MM.dd') : '-'}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <label className="text-sm font-medium text-gray-600">수정일</label>
                </div>
                <p className="text-sm text-gray-900">
                  {item.updatedAt ? format(new Date(item.updatedAt), 'yyyy.MM.dd') : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}