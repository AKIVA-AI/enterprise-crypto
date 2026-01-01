import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RISK_DISCLAIMERS } from '@/lib/complianceEnforcement';
import { cn } from '@/lib/utils';

interface PerformanceDisclaimerProps {
  value: string;
  className?: string;
  showAsterisk?: boolean;
  variant?: 'inline' | 'tooltip' | 'full';
}

/**
 * Component to display performance/return figures with proper disclaimers
 * Required for all performance claims to meet regulatory standards
 */
export function PerformanceDisclaimer({
  value,
  className,
  showAsterisk = true,
  variant = 'tooltip',
}: PerformanceDisclaimerProps) {
  if (variant === 'full') {
    return (
      <div className={cn('space-y-1', className)}>
        <span className="font-medium">{value}</span>
        <p className="text-xs text-muted-foreground italic">
          {RISK_DISCLAIMERS.strategyReturn}
        </p>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <span className={cn('inline-flex items-center gap-1', className)}>
        <span>{value}</span>
        {showAsterisk && <span className="text-muted-foreground">*</span>}
        <Info className="h-3 w-3 text-muted-foreground" />
      </span>
    );
  }

  // Default: tooltip variant
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('inline-flex items-center gap-1 cursor-help', className)}>
          <span>{value}</span>
          {showAsterisk && <span className="text-muted-foreground">*</span>}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">
        <p>{RISK_DISCLAIMERS.strategyReturn}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Footnote disclaimer for pages showing performance data
 */
export function PerformanceFootnote({ className }: { className?: string }) {
  return (
    <div className={cn('text-xs text-muted-foreground border-t pt-4 mt-6', className)}>
      <p className="flex items-start gap-2">
        <span className="text-muted-foreground">*</span>
        <span>{RISK_DISCLAIMERS.performanceClaim}</span>
      </p>
    </div>
  );
}
