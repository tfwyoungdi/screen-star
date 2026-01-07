import { LucideIcon, ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'info';
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
}: StatCardProps) {
  const isPositive = trend && trend.value >= 0;
  const isPrimary = variant === 'primary';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl p-5 transition-all duration-200',
        isPrimary
          ? 'bg-primary text-primary-foreground shadow-lg'
          : 'bg-card border border-border hover:border-border/80'
      )}
    >
      {/* Arrow link icon */}
      <div className="absolute top-4 right-4">
        <div
          className={cn(
            'p-2 rounded-lg transition-colors cursor-pointer',
            isPrimary
              ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30'
              : 'bg-secondary hover:bg-secondary/80'
          )}
        >
          <ArrowUpRight
            className={cn(
              'h-4 w-4',
              isPrimary ? 'text-primary-foreground' : 'text-muted-foreground'
            )}
          />
        </div>
      </div>

      <div className="space-y-3">
        <p
          className={cn(
            'text-sm font-medium',
            isPrimary ? 'text-primary-foreground/90' : 'text-muted-foreground'
          )}
        >
          {title}
        </p>

        <p
          className={cn(
            'text-4xl font-bold tracking-tight',
            isPrimary ? 'text-primary-foreground' : 'text-foreground'
          )}
        >
          {value}
        </p>

        {(trend || subtitle) && (
          <div className="flex items-center gap-2 pt-1">
            {trend && (
              <div
                className={cn(
                  'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md',
                  isPrimary
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : isPositive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400'
                )}
              >
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{trend.label}</span>
              </div>
            )}
            {subtitle && !trend && (
              <p
                className={cn(
                  'text-xs',
                  isPrimary ? 'text-primary-foreground/70' : 'text-muted-foreground'
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
