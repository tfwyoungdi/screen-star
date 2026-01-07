import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isBefore, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Film, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Showtime {
  id: string;
  start_time: string;
  price: number;
  vip_price?: number | null;
  is_active: boolean;
  movies?: { title: string; duration_minutes: number } | null;
  screens?: { name: string } | null;
  screen_id: string;
}

interface Screen {
  id: string;
  name: string;
}

interface ShowtimeCalendarProps {
  showtimes: Showtime[];
  screens: Screen[];
  onShowtimeClick: (showtime: Showtime) => void;
}

export function ShowtimeCalendar({ showtimes, screens, onShowtimeClick }: ShowtimeCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedScreen, setSelectedScreen] = useState<string | 'all'>('all');

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const filteredShowtimes = useMemo(() => {
    if (selectedScreen === 'all') return showtimes;
    return showtimes.filter(s => s.screen_id === selectedScreen);
  }, [showtimes, selectedScreen]);

  const getShowtimesForDay = (day: Date) => {
    return filteredShowtimes
      .filter(s => isSameDay(new Date(s.start_time), day))
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  };

  const getScreenColor = (screenId: string): string => {
    const colors = [
      'bg-primary/20 border-primary/50 text-primary',
      'bg-blue-500/20 border-blue-500/50 text-blue-600 dark:text-blue-400',
      'bg-green-500/20 border-green-500/50 text-green-600 dark:text-green-400',
      'bg-purple-500/20 border-purple-500/50 text-purple-600 dark:text-purple-400',
      'bg-orange-500/20 border-orange-500/50 text-orange-600 dark:text-orange-400',
    ];
    const index = screens.findIndex(s => s.id === screenId);
    return colors[index % colors.length];
  };

  const today = startOfDay(new Date());

  return (
    <div className="space-y-4">
      {/* Header with Navigation and Screen Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold min-w-[180px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge
            variant={selectedScreen === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedScreen('all')}
          >
            All Screens
          </Badge>
          {screens.map((screen) => (
            <Badge
              key={screen.id}
              variant={selectedScreen === screen.id ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedScreen(screen.id)}
            >
              {screen.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-muted/50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground border-b">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {/* Empty cells for days before the first of the month */}
          {Array.from({ length: days[0].getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[120px] border-b border-r bg-muted/20" />
          ))}
          
          {days.map((day) => {
            const dayShowtimes = getShowtimesForDay(day);
            const isPast = isBefore(day, today);
            
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[120px] border-b border-r p-1 transition-colors",
                  isPast && "bg-muted/30",
                  isSameDay(day, today) && "bg-primary/5 ring-1 ring-inset ring-primary/20"
                )}
              >
                <div className={cn(
                  "text-sm font-medium mb-1 p-1",
                  isSameDay(day, today) && "text-primary"
                )}>
                  {format(day, 'd')}
                </div>
                
                <ScrollArea className="h-[80px]">
                  <div className="space-y-1">
                    {dayShowtimes.slice(0, 5).map((showtime) => (
                      <button
                        key={showtime.id}
                        onClick={() => onShowtimeClick(showtime)}
                        className={cn(
                          "w-full text-left p-1 rounded text-xs border transition-all hover:scale-[1.02]",
                          !showtime.is_active && "opacity-50",
                          getScreenColor(showtime.screen_id)
                        )}
                      >
                        <div className="flex items-center gap-1 truncate">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span className="font-medium">{format(new Date(showtime.start_time), 'h:mm a')}</span>
                        </div>
                        <div className="truncate text-[10px] opacity-80">
                          {showtime.movies?.title}
                        </div>
                      </button>
                    ))}
                    {dayShowtimes.length > 5 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{dayShowtimes.length - 5} more
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
        {screens.map((screen) => (
          <div key={screen.id} className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded border", getScreenColor(screen.id))} />
            <span>{screen.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
