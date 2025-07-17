import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Boxes } from "lucide-react";

export default function CreateMaterialsOrder() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg">
          <Boxes className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">부자재 발주서 작성</h1>
          <p className="text-gray-600">부자재 발주서를 작성합니다</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>부자재 발주서</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            부자재 발주서 작성 양식이 곧 추가됩니다.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}