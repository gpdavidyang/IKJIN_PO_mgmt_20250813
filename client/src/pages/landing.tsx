import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary rounded-xl flex items-center justify-center mb-6">
            <ClipboardList className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">발주 관리 시스템</h2>
          <p className="mt-2 text-sm text-gray-600">로그인하여 시스템에 접속하세요</p>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <Button 
              onClick={handleLogin}
              className="w-full"
              size="lg"
            >
              로그인
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
