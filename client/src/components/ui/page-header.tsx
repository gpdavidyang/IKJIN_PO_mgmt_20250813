import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface PageHeaderProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: React.ReactNode;
  showAction?: boolean;
}

export function PageHeader({ 
  title, 
  description, 
  actionLabel, 
  onAction, 
  children, 
  showAction = true 
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div>
        {title && <h1 className="text-lg font-semibold text-gray-900">{title}</h1>}
        {description && <p className="text-sm text-gray-600">{description}</p>}
        {children}
      </div>
      {showAction && actionLabel && onAction && (
        <div className="flex gap-2 mt-3 sm:mt-0">
          <Button 
            size="sm" 
            className="h-8 text-sm"
            onClick={onAction}
          >
            <Plus className="h-4 w-4 mr-1" />
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}