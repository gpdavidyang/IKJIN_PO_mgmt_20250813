import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Trash2, Save, X } from "lucide-react";
import { useLocation } from "wouter";

interface DetailEditLayoutProps {
  title: string;
  isEditing?: boolean;
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  showEdit?: boolean;
  showDelete?: boolean;
  showBack?: boolean;
  backPath?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function DetailEditLayout({
  title,
  isEditing = false,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  showEdit = true,
  showDelete = false,
  showBack = true,
  backPath,
  children,
  actions
}: DetailEditLayoutProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (backPath) {
      setLocation(backPath);
    } else {
      window.history.back();
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {showBack && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        </div>

        <div className="flex items-center space-x-2">
          {actions}
          
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                className="h-8"
              >
                <X className="h-4 w-4 mr-1" />
                취소
              </Button>
              <Button
                size="sm"
                onClick={onSave}
                className="h-8"
              >
                <Save className="h-4 w-4 mr-1" />
                저장
              </Button>
            </>
          ) : (
            <>
              {showEdit && onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEdit}
                  className="h-8"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  편집
                </Button>
              )}
              {showDelete && onDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onDelete}
                  className="h-8"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  삭제
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <Card>
        <CardContent className="pt-6">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

// 섹션별 카드 컴포넌트
interface DetailSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function DetailSection({ title, icon, children, className = "" }: DetailSectionProps) {
  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center space-x-2">
          {icon}
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  );
}

// 필드 표시 컴포넌트
interface DetailFieldProps {
  label: string;
  value: string | number | null | undefined;
  isEditing?: boolean;
  editComponent?: React.ReactNode;
  formatter?: (value: any) => string;
}

export function DetailField({ 
  label, 
  value, 
  isEditing = false, 
  editComponent, 
  formatter 
}: DetailFieldProps) {
  const displayValue = formatter ? formatter(value) : (value || '-');

  return (
    <div className="flex flex-col space-y-1">
      <label className="text-sm font-medium text-gray-600">{label}</label>
      {isEditing && editComponent ? (
        editComponent
      ) : (
        <div className="text-base text-gray-900">{displayValue}</div>
      )}
    </div>
  );
}