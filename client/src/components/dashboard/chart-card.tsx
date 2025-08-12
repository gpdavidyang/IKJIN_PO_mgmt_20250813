import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}

export function ChartCard({ 
  title, 
  icon: Icon, 
  children, 
  className,
  headerAction 
}: ChartCardProps) {
  return (
    <Card className={cn("shadow-sm hover:shadow-md transition-shadow", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5 text-gray-600" />}
            {title}
          </CardTitle>
          {headerAction}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}