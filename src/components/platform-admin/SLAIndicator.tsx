import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { differenceInHours, differenceInMinutes } from 'date-fns';

interface SLAIndicatorProps {
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
}

export function SLAIndicator({
  createdAt,
  priority,
  firstResponseAt,
  status,
  slaSettings = { low: 72, medium: 24, high: 8, urgent: 2 },
}: SLAIndicatorProps) {
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
  const createdDate = new Date(createdAt);
  const now = new Date();

  // If resolved or closed, show completed status
  if (status === 'resolved' || status === 'closed') {
    if (firstResponseAt) {
      const responseHours = differenceInHours(new Date(firstResponseAt), createdDate);
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

  // If responded, show response time
  if (firstResponseAt) {
    const responseHours = differenceInHours(new Date(firstResponseAt), createdDate);
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

  // Calculate time remaining or overdue
  const hoursElapsed = differenceInHours(now, createdDate);
  const minutesElapsed = differenceInMinutes(now, createdDate);
  const hoursRemaining = targetHours - hoursElapsed;
  const isBreached = hoursRemaining <= 0;
  const isWarning = hoursRemaining > 0 && hoursRemaining <= targetHours * 0.25;

  const formatTimeRemaining = () => {
    if (isBreached) {
      return `${Math.abs(hoursRemaining)}h overdue`;
    }
    if (hoursRemaining < 1) {
      const minsRemaining = (targetHours * 60) - minutesElapsed;
      return `${Math.max(0, minsRemaining)}m left`;
    }
    return `${hoursRemaining}h left`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge
            variant="outline"
            className={`gap-1 ${
              isBreached
                ? 'bg-destructive/10 text-destructive border-destructive/30'
                : isWarning
                ? 'bg-orange-500/10 text-orange-600 border-orange-500/30'
                : 'text-muted-foreground'
            }`}
          >
            {isBreached ? (
              <AlertTriangle className="h-3 w-3" />
            ) : (
              <Clock className="h-3 w-3" />
            )}
            {formatTimeRemaining()}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>SLA Target: {targetHours} hours for {priority} priority</p>
          <p className="text-xs text-muted-foreground">
            Created {hoursElapsed}h ago
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
