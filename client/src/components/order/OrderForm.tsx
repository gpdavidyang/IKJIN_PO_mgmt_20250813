import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Building, User, Calendar } from "lucide-react";
import type { Project, User as UserType } from "@shared/schema";
import type { StandardOrderForm } from "@shared/order-types";

interface OrderFormProps {
  formData: StandardOrderForm;
  onFormDataChange: (data: Partial<StandardOrderForm>) => void;
  projects: Project[];
  users: UserType[];
  poNumber?: string;
}

export default function OrderForm({ 
  formData, 
  onFormDataChange, 
  projects, 
  users, 
  poNumber 
}: OrderFormProps) {
  const handleChange = (field: keyof StandardOrderForm, value: any) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="bg-gray-50 border-b">
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Building className="h-5 w-5 text-blue-600" />
          발주서 기본 정보
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-sm font-medium">발주서 번호</Label>
            <div className="h-10 px-3 py-2 text-sm font-semibold text-blue-600 bg-gray-50 border rounded-md flex items-center">
              {poNumber}
            </div>
          </div>
          
          <div className="space-y-1">
            <Label className="text-sm font-medium">작성일</Label>
            <div className="h-10 px-3 py-2 text-sm bg-gray-50 border rounded-md flex items-center">
              {new Date().toLocaleDateString('ko-KR')}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="site" className="text-sm font-medium">현장 선택</Label>
            <Select 
              value={formData.site} 
              onValueChange={(value) => handleChange("site", value)}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="현장을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.projectName}>
                    {project.projectName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="deliveryDate" className="text-sm font-medium">납품 희망일</Label>
            <Input
              type="date"
              id="deliveryDate"
              className="h-10"
              value={formData.deliveryDate}
              onChange={(e) => handleChange("deliveryDate", e.target.value)}
            />
            <div className="flex items-center space-x-2 mt-2">
              <Checkbox
                id="isNegotiable"
                checked={formData.isNegotiable}
                onCheckedChange={(checked) => handleChange("isNegotiable", checked)}
              />
              <Label htmlFor="isNegotiable" className="text-sm text-gray-600">
                협의 가능
              </Label>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="receiver" className="text-sm font-medium">자재 인수자</Label>
            <Select 
              value={formData.receiver} 
              onValueChange={(value) => handleChange("receiver", value)}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="인수자 선택" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.email || ""}>
                    {user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="manager" className="text-sm font-medium">본사 담당자</Label>
            <Select 
              value={formData.manager} 
              onValueChange={(value) => handleChange("manager", value)}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="담당자 선택" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.email || ""}>
                    {user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}