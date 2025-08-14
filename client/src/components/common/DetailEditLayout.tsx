import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Trash2, Save, X } from "lucide-react";
import { useLocation } from "wouter";
import { useTheme } from "@/components/ui/theme-provider";

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
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const handleBack = () => {
    if (backPath) {
      setLocation(backPath);
    } else {
      window.history.back();
    }
  };

  return (
    <div className={`min-h-screen transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-[1366px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {showBack && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBack}
                    className={`h-8 w-8 p-0 transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <h1 className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h1>
              </div>

              <div className="flex items-center space-x-2">
                {actions}
                
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onCancel}
                      className={`h-8 transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                      <X className="h-4 w-4 mr-1" />
                      취소
                    </Button>
                    <Button
                      size="sm"
                      onClick={onSave}
                      className={`h-8 shadow-md hover:shadow-lg transition-all duration-200 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
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
                        className={`h-8 transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
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
                        className="h-8 bg-red-600 hover:bg-red-700 text-white"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        삭제
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
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
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} ${className}`}>
      <div className={`p-6 border-b transition-colors ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center">
          {icon && (
            <div className={`p-2 rounded-lg mr-3 transition-colors ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
              {React.cloneElement(icon as React.ReactElement, {
                className: `h-5 w-5 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`
              })}
            </div>
          )}
          <h3 className={`text-lg font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
        </div>
      </div>
      <div className="p-6 space-y-4">
        {children}
      </div>
    </div>
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
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const displayValue = formatter ? formatter(value) : (value || '-');

  return (
    <div className="flex flex-col space-y-1">
      <label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{label}</label>
      {isEditing && editComponent ? (
        editComponent
      ) : (
        <div className={`text-base transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{displayValue}</div>
      )}
    </div>
  );
}