import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Clock, AlertTriangle, CheckCircle2, Timer } from 'lucide-react';
import { useRealtimeSLACountdown } from '@/hooks/useRealtimeSLACountdown';
import { differenceInHours } from 'date-fns';

interface SLACountdownTimerProps {
  createdAt: string;
  priority: string;
  firstResponseAt?: string | null;
  status: string;
  slaSettings?: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  compact?: boolean;
}

export function SLACountdownTimer({
  createdAt,
  priority,
  firstResponseAt,
  status,
  slaSettings = { low: 72, medium: 24, high: 8, urgent: 2 },
  compact = false,
}: SLACountdownTimerProps) {
  // Get SLA target hours based on priority
  const getTargetHours = () => {
    switch (priority) {
      case 'urgent':
        return slaSettings.urgent;
      case 'high':
        return slaSettings.high;
      case 'medium':
        return slaSettings.medium;
      case 'low':
      default:
        return slaSettings.low;
    }
  };

  const targetHours = getTargetHours();

  const { timeRemaining, isBreached, isWarning, percentRemaining } = useRealtimeSLACountdown({
    createdAt,
    targetHours,
    firstResponseAt,
    status,
  });

  // If resolved or closed, show completed status
  if (status === 'resolved' || status === 'closed') {
    if (firstResponseAt) {
      const responseHours = differenceInHours(new Date(firstResponseAt), new Date(createdAt));
      const withinSLA = responseHours <= targetHours;
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className={`gap-1 ${withinSLA ? 'text-green-600' : 'text-orange-600'}`}>
                <CheckCircle2 className="h-3 w-3" />
                {withinSLA ? 'Met SLA' : 'Breached SLA'}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Response time: {responseHours}h (Target: {targetHours}h)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return null;
  }

  // If already responded, show response status
  if (firstResponseAt) {
    const responseHours = differenceInHours(new Date(firstResponseAt), new Date(createdAt));
    const withinSLA = responseHours <= targetHours;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className={`gap-1 ${withinSLA ? 'text-green-600' : 'text-orange-600'}`}>
              <CheckCircle2 className="h-3 w-3" />
              Responded in {responseHours}h
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Target: {targetHours}h • {withinSLA ? 'Within SLA' : 'Breached SLA'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Show real-time countdown
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge
              variant="outline"
              className={`gap-1 font-mono tabular-nums ${
                isBreached
                  ? 'bg-destructive/10 text-destructive border-destructive/30 animate-pulse'
                  : isWarning
                  ? 'bg-orange-500/10 text-orange-600 border-orange-500/30'
                  : 'text-muted-foreground'
              }`}
            >
              {isBreached ? (
                <AlertTriangle className="h-3 w-3" />
              ) : (
                <Timer className="h-3 w-3" />
              )}
              {timeRemaining}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>SLA Target: {targetHours}h for {priority} priority</p>
            {isBreached && <p className="text-destructive">Requires immediate attention!</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="w-full">
          <div className="space-y-1.5 min-w-[120px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {isBreached ? (
                  <AlertTriangle className="h-3 w-3 text-destructive" />
                ) : (
                  <Clock className="h-3 w-3 text-muted-foreground" />
                )}
                <span
                  className={`text-xs font-mono tabular-nums ${
                    isBreached
                      ? 'text-destructive font-semibold animate-pulse'
                      : isWarning
                      ? 'text-orange-600 font-medium'
                      : 'text-muted-foreground'
                  }`}
                >
                  {timeRemaining}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">{targetHours}h</span>
            </div>
            <Progress
              value={percentRemaining}
              className={`h-1.5 ${
                isBreached
                  ? '[&>div]:bg-destructive'
                  : isWarning
                  ? '[&>div]:bg-orange-500'
                  : '[&>div]:bg-green-500'
              }`}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>SLA Target: {targetHours} hours for {priority} priority</p>
          {isBreached && <p className="text-destructive font-medium">Ticket is overdue - immediate action required!</p>}
          {isWarning && !isBreached && <p className="text-orange-600">Warning: Less than 25% time remaining</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
