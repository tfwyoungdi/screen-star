import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isBefore, startOfDay, setHours, setMinutes } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, GripVertical, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

import { cn } from '@/lib/utils';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { getCurrencySymbol } from '@/lib/currency';

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

interface BookingCount {
  showtime_id: string;
  count: number;
  capacity: number;
}

interface Screen {
  id: string;
  name: string;
}

interface ShowtimeCalendarProps {
  showtimes: Showtime[];
  screens: Screen[];
  bookingCounts?: BookingCount[];
  currency?: string | null;
  onShowtimeClick: (showtime: Showtime) => void;
  onShowtimeMove?: (showtimeId: string, newDate: Date) => void;
  onAddShowtime?: (date: Date) => void;
}

// Draggable showtime item
function DraggableShowtime({ 
  showtime, 
  screenColor, 
  bookingInfo,
  currency,
  onClick 
}: { 
  showtime: Showtime; 
  screenColor: string; 
  bookingInfo?: BookingCount;
  currency?: string | null;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: showtime.id,
    data: { showtime },
  });

  const style = transform ? {
    transform: CSS.Transform.toString(transform),
  } : undefined;

  const occupancyPercent = bookingInfo ? Math.round((bookingInfo.count / bookingInfo.capacity) * 100) : 0;
  const getOccupancyColor = () => {
    if (!bookingInfo) return 'bg-muted';
    if (occupancyPercent >= 80) return 'bg-green-500';
    if (occupancyPercent >= 50) return 'bg-amber-500';
    if (occupancyPercent >= 20) return 'bg-blue-500';
    return 'bg-muted-foreground/30';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "w-full text-left p-1 rounded text-xs border transition-all group",
        !showtime.is_active && "opacity-50",
        isDragging && "opacity-50 ring-2 ring-primary",
        screenColor
      )}
      title={`${showtime.movies?.title} - ${format(new Date(showtime.start_time), 'EEEE, MMM d • h:mm a')} - ${showtime.screens?.name} • ${getCurrencySymbol(currency)}${showtime.price}${bookingInfo ? ` - ${bookingInfo.count}/${bookingInfo.capacity} seats (${occupancyPercent}%)` : ''}`}
    >
      <div className="flex items-center gap-1">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity touch-none"
        >
          <GripVertical className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
        </div>
        {/* Clickable area */}
        <button
          onClick={onClick}
          className="flex-1 text-left min-w-0"
        >
          <div className="flex items-center gap-1 truncate">
            <Clock className="h-3 w-3 flex-shrink-0" />
            <span className="font-medium">{format(new Date(showtime.start_time), 'h:mm a')}</span>
            {bookingInfo && (
              <div className="flex items-center gap-0.5 ml-auto">
                <div className={cn("w-1.5 h-1.5 rounded-full", getOccupancyColor())} />
                <span className="text-[9px] opacity-70">{bookingInfo.count}</span>
              </div>
            )}
          </div>
          <div className="truncate text-[10px] opacity-80">
            {showtime.movies?.title}
          </div>
        </button>
      </div>
    </div>
  );
}

// Droppable day cell
function DroppableDay({ 
  day, 
  children, 
  isToday,
  isPast,
  onAddClick
}: { 
  day: Date; 
  children: React.ReactNode;
  isToday: boolean;
  isPast: boolean;
  onAddClick?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: day.toISOString(),
    data: { date: day },
    disabled: isPast,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[120px] border-b border-r p-1 transition-colors group/day relative",
        isPast && "bg-muted/30",
        isToday && "bg-primary/5 ring-1 ring-inset ring-primary/20",
        isOver && !isPast && "bg-primary/10 ring-2 ring-inset ring-primary/40"
      )}
    >
      {children}
      {/* Add button - always visible for non-past days */}
      {!isPast && onAddClick && (
        <button
          onClick={onAddClick}
          className="absolute bottom-1 right-1 p-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
          title="Add showtime"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function ShowtimeCalendar({ 
  showtimes, 
  screens, 
  bookingCounts = [],
  currency,
  onShowtimeClick,
  onShowtimeMove,
  onAddShowtime
}: ShowtimeCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedScreen, setSelectedScreen] = useState<string | 'all'>('all');
  const [activeShowtime, setActiveShowtime] = useState<Showtime | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const filteredShowtimes = useMemo(() => {
    if (selectedScreen === 'all') return showtimes;
    return showtimes.filter(s => s.screen_id === selectedScreen);
  }, [showtimes, selectedScreen]);

  const bookingCountsMap = useMemo(() => {
    const map: Record<string, BookingCount> = {};
    bookingCounts.forEach(bc => {
      map[bc.showtime_id] = bc;
    });
    return map;
  }, [bookingCounts]);

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

  const handleDragStart = (event: DragStartEvent) => {
    const showtime = event.active.data.current?.showtime as Showtime | undefined;
    if (showtime) {
      setActiveShowtime(showtime);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveShowtime(null);
    
    const { active, over } = event;
    if (!over || !onShowtimeMove) return;

    const showtimeId = active.id as string;
    const targetDate = over.data.current?.date as Date | undefined;
    
    if (!targetDate) return;

    // Find the original showtime
    const originalShowtime = showtimes.find(s => s.id === showtimeId);
    if (!originalShowtime) return;

    // Keep the same time, just change the date
    const originalDate = new Date(originalShowtime.start_time);
    const newDateTime = setMinutes(
      setHours(targetDate, originalDate.getHours()),
      originalDate.getMinutes()
    );

    // Don't move to the past
    if (isBefore(newDateTime, new Date())) return;

    // Don't move if it's the same day
    if (isSameDay(originalDate, targetDate)) return;

    onShowtimeMove(showtimeId, newDateTime);
  };

  return (
    <DndContext 
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* Header with Navigation and Screen Filter */}
        <div className="flex items-center justify-between flex-wrap gap-2">
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

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span className="font-medium">Occupancy:</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>80%+</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span>50-79%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span>20-49%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
            <span>&lt;20%</span>
          </div>
          <span className="ml-4 text-muted-foreground">• Drag showtimes to reschedule</span>
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
              const isToday = isSameDay(day, today);
              
              return (
                <DroppableDay 
                  key={day.toISOString()} 
                  day={day} 
                  isToday={isToday}
                  isPast={isPast}
                  onAddClick={onAddShowtime ? () => onAddShowtime(day) : undefined}
                >
                  <div className={cn(
                    "text-sm font-medium mb-1 p-1",
                    isToday && "text-primary"
                  )}>
                    {format(day, 'd')}
                  </div>
                  
                  <ScrollArea className="h-[80px]">
                    <div className="space-y-1 pr-2">
                      {dayShowtimes.slice(0, 5).map((showtime) => (
                        <DraggableShowtime
                          key={showtime.id}
                          showtime={showtime}
                          screenColor={getScreenColor(showtime.screen_id)}
                          bookingInfo={bookingCountsMap[showtime.id]}
                          currency={currency}
                          onClick={() => onShowtimeClick(showtime)}
                        />
                      ))}
                      {dayShowtimes.length > 5 && (
                        <div className="text-xs text-muted-foreground text-center">
                          +{dayShowtimes.length - 5} more
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </DroppableDay>
              );
            })}
          </div>
        </div>

        {/* Screen Legend */}
        <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
          {screens.map((screen) => (
            <div key={screen.id} className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded border", getScreenColor(screen.id))} />
              <span>{screen.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeShowtime && (
          <div className={cn(
            "p-2 rounded text-xs border shadow-lg bg-background",
            getScreenColor(activeShowtime.screen_id)
          )}>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span className="font-medium">{format(new Date(activeShowtime.start_time), 'h:mm a')}</span>
            </div>
            <div className="truncate text-[10px] opacity-80">
              {activeShowtime.movies?.title}
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
