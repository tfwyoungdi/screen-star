import { useState, useEffect } from 'react';
import { RefreshCw, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';

interface DataRefreshIndicatorProps {
  lastUpdated: Date | null;
  isRefetching: boolean;
  onRefresh: () => void;
  className?: string;
}

export function DataRefreshIndicator({
  lastUpdated,
  isRefetching,
  onRefresh,
  className = '',
}: DataRefreshIndicatorProps) {
  const [, setTick] = useState(0);

  // Update every 30 seconds to refresh the "X minutes ago" text
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const timeAgo = lastUpdated
    ? formatDistanceToNow(lastUpdated, { addSuffix: true })
    : 'Never';

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              {isRefetching ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              )}
              <Clock className="h-3.5 w-3.5" />
              <span className="text-xs">
                {isRefetching ? 'Updating...' : `Updated ${timeAgo}`}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {lastUpdated
                ? `Last updated: ${lastUpdated.toLocaleTimeString()}`
                : 'No data loaded yet'}
            </p>
          </TooltipContent>
        </Tooltip>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={onRefresh}
          disabled={isRefetching}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </TooltipProvider>
  );
}
