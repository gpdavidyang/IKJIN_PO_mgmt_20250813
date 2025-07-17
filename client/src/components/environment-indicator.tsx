import { getEnvironmentBadge, isDevelopment, getDebugInfo } from '@/lib/feature-flags';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function EnvironmentIndicator() {
  const badge = getEnvironmentBadge();
  const debugInfo = getDebugInfo();
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            className={`${badge.color} text-xs font-semibold px-2 py-1 cursor-help`}
            variant="outline"
          >
            {badge.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <div className="font-semibold">{badge.description}</div>
            {isDevelopment() && debugInfo && (
              <div className="mt-2 text-xs opacity-80">
                <div>Excel Upload: {debugInfo.featureFlags.EXCEL_UPLOAD ? '활성화' : '비활성화'}</div>
                <div>Handsontable: {debugInfo.featureFlags.HANDSONTABLE ? '활성화' : '비활성화'}</div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}