import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
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

const variantStyles = {
  default: {
    iconBg: 'bg-secondary',
    iconColor: 'text-muted-foreground',
    valueColor: 'text-foreground',
    gradient: 'from-secondary/50 to-transparent',
  },
  primary: {
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    valueColor: 'text-primary',
    gradient: 'from-primary/10 to-transparent',
  },
  success: {
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    valueColor: 'text-emerald-600 dark:text-emerald-400',
    gradient: 'from-emerald-500/10 to-transparent',
  },
  warning: {
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
    valueColor: 'text-amber-600 dark:text-amber-400',
    gradient: 'from-amber-500/10 to-transparent',
  },
  info: {
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-600 dark:text-blue-400',
    valueColor: 'text-blue-600 dark:text-blue-400',
    gradient: 'from-blue-500/10 to-transparent',
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
}: StatCardProps) {
  const isPositive = trend && trend.value >= 0;
  const styles = variantStyles[variant];

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-card border border-border p-6 transition-all duration-300 hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5">
      {/* Background gradient */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300',
        styles.gradient
      )} />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            'p-3 rounded-xl transition-transform duration-300 group-hover:scale-110',
            styles.iconBg
          )}>
            <Icon className={cn('h-5 w-5', styles.iconColor)} />
          </div>
          
          {trend && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
                isPositive
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                  : 'text-red-600 dark:text-red-400 bg-red-500/10'
              )}
            >
              {isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={cn('text-3xl font-bold tracking-tight', styles.valueColor)}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <p className="text-xs text-muted-foreground mt-2">{trend.label}</p>
          )}
        </div>
      </div>
    </div>
  );
}
