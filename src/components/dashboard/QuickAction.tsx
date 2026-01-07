import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface QuickActionProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'gradient';
}

export function QuickAction({
  title,
  description,
  icon: Icon,
  onClick,
  variant = 'default',
}: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative w-full p-4 rounded-xl text-left transition-all duration-300',
        'border hover:shadow-md hover:-translate-y-0.5',
        'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background',
        variant === 'gradient' 
          ? 'bg-gradient-to-br from-primary to-primary/80 border-primary/50 text-primary-foreground'
          : 'bg-card border-border hover:border-primary/30'
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110',
            variant === 'gradient'
              ? 'bg-primary-foreground/20'
              : variant === 'primary'
                ? 'bg-primary/10 group-hover:bg-primary/20'
                : 'bg-secondary group-hover:bg-primary/10'
          )}
        >
          <Icon
            className={cn(
              'h-5 w-5 transition-colors',
              variant === 'gradient'
                ? 'text-primary-foreground'
                : variant === 'primary'
                  ? 'text-primary'
                  : 'text-muted-foreground group-hover:text-primary'
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            'font-semibold transition-colors text-sm',
            variant === 'gradient' 
              ? 'text-primary-foreground' 
              : 'text-foreground group-hover:text-primary'
          )}>
            {title}
          </h3>
          <p className={cn(
            'text-xs mt-0.5 line-clamp-1',
            variant === 'gradient'
              ? 'text-primary-foreground/80'
              : 'text-muted-foreground'
          )}>
            {description}
          </p>
        </div>
        <ChevronRight className={cn(
          'h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300',
          variant === 'gradient' ? 'text-primary-foreground' : 'text-primary'
        )} />
      </div>
    </button>
  );
}
