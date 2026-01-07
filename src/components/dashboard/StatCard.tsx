import { ReactNode } from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
  variant?: 'default' | 'primary' | 'success' | 'warning';
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

  return (
    <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 hover:border-primary/30">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p
              className={cn(
                'text-3xl font-bold tracking-tight',
                variant === 'primary' && 'text-primary',
                variant === 'success' && 'text-emerald-500',
                variant === 'warning' && 'text-amber-500'
              )}
            >
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div
            className={cn(
              'p-3 rounded-xl transition-colors',
              variant === 'default' && 'bg-muted/50 group-hover:bg-muted',
              variant === 'primary' && 'bg-primary/10 group-hover:bg-primary/20',
              variant === 'success' && 'bg-emerald-500/10 group-hover:bg-emerald-500/20',
              variant === 'warning' && 'bg-amber-500/10 group-hover:bg-amber-500/20'
            )}
          >
            <Icon
              className={cn(
                'h-5 w-5',
                variant === 'default' && 'text-muted-foreground',
                variant === 'primary' && 'text-primary',
                variant === 'success' && 'text-emerald-500',
                variant === 'warning' && 'text-amber-500'
              )}
            />
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center gap-1.5">
            <div
              className={cn(
                'flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-md',
                isPositive
                  ? 'text-emerald-500 bg-emerald-500/10'
                  : 'text-red-500 bg-red-500/10'
              )}
            >
              {isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{Math.abs(trend.value)}%</span>
            </div>
            <span className="text-xs text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
      {/* Decorative gradient */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity',
          variant === 'default' && 'bg-gradient-to-r from-muted to-muted-foreground/30',
          variant === 'primary' && 'bg-gradient-to-r from-primary/50 to-primary',
          variant === 'success' && 'bg-gradient-to-r from-emerald-500/50 to-emerald-500',
          variant === 'warning' && 'bg-gradient-to-r from-amber-500/50 to-amber-500'
        )}
      />
    </Card>
  );
}
