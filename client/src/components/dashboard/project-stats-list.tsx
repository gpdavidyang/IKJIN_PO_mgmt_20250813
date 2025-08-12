import { Building2, TrendingUp } from "lucide-react";
import { formatKoreanWon } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ProjectStat {
  projectName: string;
  projectType: string;
  projectId?: number;
  orderCount: number;
  totalAmount: number;
}

interface ProjectStatsListProps {
  data: ProjectStat[];
  onProjectClick?: (projectId: number) => void;
  maxItems?: number;
}

export function ProjectStatsList({ 
  data, 
  onProjectClick, 
  maxItems = 10 
}: ProjectStatsListProps) {
  const displayData = data.slice(0, maxItems);

  return (
    <div className="space-y-2">
      {displayData.map((project, index) => (
        <div 
          key={project.projectName} 
          className={cn(
            "group flex items-center justify-between p-3 rounded-lg",
            "hover:bg-gray-50 transition-colors",
            project.projectId && "cursor-pointer"
          )}
          onClick={() => project.projectId && onProjectClick?.(project.projectId)}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold",
              index < 3 ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-700"
            )}>
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                {project.projectName}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Building2 className="h-3 w-3" />
                <span>{project.projectType}</span>
              </div>
            </div>
          </div>
          
          <div className="text-right ml-4">
            <p className="text-sm font-semibold text-gray-900">{project.orderCount}건</p>
            <p className="text-xs text-gray-600">{formatKoreanWon(project.totalAmount)}</p>
          </div>
        </div>
      ))}
      
      {data.length > maxItems && (
        <div className="text-center pt-2">
          <p className="text-xs text-gray-500">
            외 {data.length - maxItems}개 프로젝트
          </p>
        </div>
      )}
    </div>
  );
}