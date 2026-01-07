import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickActionProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'gradient';
  badge?: string;
}

export function QuickAction({
  title,
  description,
  icon: Icon,
  onClick,
  variant = 'default',
  badge,
}: QuickActionProps) {
  const isPrimary = variant === 'gradient' || variant === 'primary';

  return (
    <button
      onClick={onClick}
      className={cn(
        'group w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200',
        'hover:bg-secondary/50',
        'focus:outline-none focus:ring-2 focus:ring-primary/20'
      )}
    >
      <div
        className={cn(
          'p-2.5 rounded-xl',
          isPrimary ? 'bg-primary/10' : 'bg-secondary'
        )}
      >
        <Icon
          className={cn(
            'h-5 w-5',
            isPrimary ? 'text-primary' : 'text-muted-foreground'
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-foreground">{title}</span>
          {badge && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {description}
          </p>
        )}
      </div>
    </button>
  );
}
