import { ReactNode } from 'react';
import { LucideIcon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: ReactNode;
  actions?: { label: string; onClick: () => void }[];
  className?: string;
  actionLabel?: string;
  onActionClick?: () => void;
}

export function ChartCard({
  title,
  subtitle,
  children,
  actions,
  className,
  actionLabel,
  onActionClick,
}: ChartCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-card border border-border p-5',
        className
      )}
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {actionLabel && onActionClick && (
          <Button
            variant="outline"
            size="sm"
            onClick={onActionClick}
            className="h-8 gap-1.5 text-xs rounded-lg"
          >
            <Plus className="h-3.5 w-3.5" />
            {actionLabel}
          </Button>
        )}
        {actions && actions.length > 0 && !actionLabel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={actions[0].onClick}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            {actions[0].label}
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}
