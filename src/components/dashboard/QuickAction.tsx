import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickActionProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'accent';
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
        'group relative w-full p-5 rounded-xl text-left transition-all duration-300',
        'border bg-card hover:shadow-lg',
        'hover:border-primary/40 hover:-translate-y-0.5',
        'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background'
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'p-3 rounded-xl transition-all duration-300',
            variant === 'default' && 'bg-muted group-hover:bg-primary/10',
            variant === 'primary' && 'bg-primary/10 group-hover:bg-primary/20',
            variant === 'accent' && 'bg-accent/10 group-hover:bg-accent/20'
          )}
        >
          <Icon
            className={cn(
              'h-5 w-5 transition-colors',
              variant === 'default' && 'text-muted-foreground group-hover:text-primary',
              variant === 'primary' && 'text-primary',
              variant === 'accent' && 'text-accent'
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
            {description}
          </p>
        </div>
      </div>
      {/* Arrow indicator */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
        <svg
          className="h-5 w-5 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </button>
  );
}
