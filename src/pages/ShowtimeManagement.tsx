import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays, addMinutes } from 'date-fns';
import { Loader2, Plus, Calendar, Clock, Trash2, Film, Monitor, CalendarPlus, AlertTriangle, CalendarDays, List, Pencil, Ticket, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ShowtimeCalendar } from '@/components/dashboard/ShowtimeCalendar';
import { EditShowtimeDialog } from '@/components/dashboard/EditShowtimeDialog';

const bulkShowtimeSchema = z.object({
  movie_id: z.string().min(1, 'Please select a movie'),
  screen_id: z.string().min(1, 'Please select a screen'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  price: z.coerce.number().min(0, 'Price must be positive'),
  vip_price: z.coerce.number().min(0).optional(),
});

type BulkShowtimeFormData = z.infer<typeof bulkShowtimeSchema>;

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

interface ConflictInfo {
  newStart: Date;
  newEnd: Date;
  existingMovie: string;
  existingStart: Date;
  existingEnd: Date;
}

const COMMON_TIMES = [
  { label: '10:00 AM', value: '10:00' },
  { label: '12:30 PM', value: '12:30' },
  { label: '2:00 PM', value: '14:00' },
  { label: '4:30 PM', value: '16:30' },
  { label: '7:00 PM', value: '19:00' },
  { label: '9:30 PM', value: '21:30' },
];

const BUFFER_MINUTES = 15; // Buffer between showtimes for cleaning/previews

export default function ShowtimeManagement() {
  const { data: profile } = useUserProfile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [customTimeInput, setCustomTimeInput] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]); // All days selected by default
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [timeFilter, setTimeFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [editingShowtime, setEditingShowtime] = useState<any | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState<Date | null>(null);
  const [quickAddDialogOpen, setQuickAddDialogOpen] = useState(false);
  const [quickAddMovieId, setQuickAddMovieId] = useState<string>('');
  const [quickAddScreenId, setQuickAddScreenId] = useState<string>('');
  const [quickAddPresetTime, setQuickAddPresetTime] = useState<string>('');
  const [quickAddCustomTime, setQuickAddCustomTime] = useState<string>('');
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BulkShowtimeFormData>({
    resolver: zodResolver(bulkShowtimeSchema),
  });

  const { data: movies } = useQuery({
    queryKey: ['movies', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('movies')
        .select('id, title, duration_minutes')
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true);

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  const { data: screens } = useQuery({
    queryKey: ['screens', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('screens')
        .select('id, name')
        .eq('organization_id', profile.organization_id);

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  const { data: allShowtimes, isLoading } = useQuery({
    queryKey: ['showtimes', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('showtimes')
        .select(`
          *,
          movies (title, duration_minutes),
          screens (name, rows, columns)
        `)
        .eq('organization_id', profile.organization_id)
        .order('start_time', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  // Filter showtimes based on timeFilter
  const now = new Date();
  const showtimes = allShowtimes?.filter(s => {
    const showtimeDate = new Date(s.start_time);
    return timeFilter === 'upcoming' ? showtimeDate >= now : showtimeDate < now;
  }).sort((a, b) => {
    // Upcoming: ascending order, Past: descending order
    const dateA = new Date(a.start_time).getTime();
    const dateB = new Date(b.start_time).getTime();
    return timeFilter === 'upcoming' ? dateA - dateB : dateB - dateA;
  });

  // Fetch booking counts and revenue for all showtimes
  const { data: bookingStats } = useQuery({
    queryKey: ['showtime-booking-stats', profile?.organization_id, allShowtimes?.length],
    queryFn: async () => {
      if (!profile?.organization_id || !allShowtimes?.length) return {};
      
      const showtimeIds = allShowtimes.map(s => s.id);
      
      // Get booked seats with prices per showtime
      const { data: bookedSeats, error: seatsError } = await supabase
        .from('booked_seats')
        .select('showtime_id, price')
        .in('showtime_id', showtimeIds);

      if (seatsError) throw seatsError;

      // Build stats map: count and revenue per showtime
      const statsMap: Record<string, { count: number; revenue: number; capacity: number }> = {};
      
      // Initialize with capacity from showtimes
      allShowtimes.forEach(showtime => {
        statsMap[showtime.id] = {
          count: 0,
          revenue: 0,
          capacity: (showtime.screens?.rows || 10) * (showtime.screens?.columns || 10),
        };
      });

      // Aggregate booking data
      bookedSeats?.forEach(seat => {
        if (statsMap[seat.showtime_id]) {
          statsMap[seat.showtime_id].count++;
          statsMap[seat.showtime_id].revenue += Number(seat.price) || 0;
        }
      });

      return statsMap;
    },
    enabled: !!profile?.organization_id && !!allShowtimes?.length,
  });

  // For calendar view compatibility
  const bookingCounts = showtimes?.map(s => ({
    showtime_id: s.id,
    count: bookingStats?.[s.id]?.count || 0,
    capacity: bookingStats?.[s.id]?.capacity || 100,
  }));

  const addTime = (time: string) => {
    if (time && !selectedTimes.includes(time)) {
      setSelectedTimes([...selectedTimes, time].sort());
    }
    setCustomTimeInput('');
  };

  const removeTime = (time: string) => {
    setSelectedTimes(selectedTimes.filter(t => t !== time));
  };

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  const selectAllDays = () => setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
  const selectWeekdays = () => setSelectedDays([1, 2, 3, 4, 5]);
  const selectWeekends = () => setSelectedDays([0, 6]);

  // Check for conflicts when form values change
  const checkConflicts = (
    movieId: string,
    screenId: string,
    startDate: string,
    endDate: string,
    times: string[]
  ): ConflictInfo[] => {
    if (!movieId || !screenId || !startDate || !endDate || times.length === 0 || !showtimes || !movies) {
      return [];
    }

    const selectedMovie = movies.find(m => m.id === movieId);
    if (!selectedMovie) return [];

    const movieDuration = selectedMovie.duration_minutes + BUFFER_MINUTES;
    const foundConflicts: ConflictInfo[] = [];

    // Get existing showtimes for this screen
    const screenShowtimes = showtimes.filter(s => s.screen_id === screenId);

    const start = new Date(startDate);
    const end = new Date(endDate);
    let currentDate = start;

    while (currentDate <= end) {
      for (const time of times) {
        const [hours, minutes] = time.split(':').map(Number);
        const newShowtimeStart = new Date(currentDate);
        newShowtimeStart.setHours(hours, minutes, 0, 0);
        const newShowtimeEnd = addMinutes(newShowtimeStart, movieDuration);

        // Check against existing showtimes
        for (const existing of screenShowtimes) {
          const existingStart = new Date(existing.start_time);
          const existingDuration = (existing.movies?.duration_minutes || 120) + BUFFER_MINUTES;
          const existingEnd = addMinutes(existingStart, existingDuration);

          // Check for overlap: new showtime overlaps if it starts before existing ends AND ends after existing starts
          const hasOverlap = newShowtimeStart < existingEnd && newShowtimeEnd > existingStart;

          if (hasOverlap) {
            foundConflicts.push({
              newStart: newShowtimeStart,
              newEnd: newShowtimeEnd,
              existingMovie: existing.movies?.title || 'Unknown',
              existingStart,
              existingEnd,
            });
          }
        }
      }
      currentDate = addDays(currentDate, 1);
    }

    return foundConflicts;
  };

  // Watch form values for conflict detection
  const watchedMovieId = watch('movie_id');
  const watchedScreenId = watch('screen_id');
  const watchedStartDate = watch('start_date');
  const watchedEndDate = watch('end_date');

  // Memoize conflict detection to avoid recalculating on every render
  const detectedConflicts = useMemo(() => {
    return checkConflicts(
      watchedMovieId,
      watchedScreenId,
      watchedStartDate,
      watchedEndDate,
      selectedTimes
    );
  }, [watchedMovieId, watchedScreenId, watchedStartDate, watchedEndDate, selectedTimes, showtimes, movies]);

  const onSubmit = async (data: BulkShowtimeFormData) => {
    if (!profile?.organization_id) return;

    if (selectedTimes.length === 0) {
      toast.error('Please add at least one showtime');
      return;
    }

    if (selectedDays.length === 0) {
      toast.error('Please select at least one day of the week');
      return;
    }

    try {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      
      if (endDate < startDate) {
        toast.error('End date must be after start date');
        return;
      }

      const showtimesToCreate: any[] = [];
      let currentDate = startDate;

      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        
        // Only create showtimes for selected days
        if (selectedDays.includes(dayOfWeek)) {
          for (const time of selectedTimes) {
            const [hours, minutes] = time.split(':').map(Number);
            const showtimeDate = new Date(currentDate);
            showtimeDate.setHours(hours, minutes, 0, 0);

            // Only add future showtimes
            if (showtimeDate > new Date()) {
              showtimesToCreate.push({
                organization_id: profile.organization_id,
                movie_id: data.movie_id,
                screen_id: data.screen_id,
                start_time: showtimeDate.toISOString(),
                price: data.price,
                vip_price: data.vip_price || null,
              });
            }
          }
        }
        currentDate = addDays(currentDate, 1);
      }

      if (showtimesToCreate.length === 0) {
        toast.error('No valid showtimes to create. Check your date range, days, and times.');
        return;
      }

      const { error } = await supabase
        .from('showtimes')
        .insert(showtimesToCreate);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['showtimes'] });
      toast.success(`Created ${showtimesToCreate.length} showtimes successfully`);
      reset();
      setSelectedTimes([]);
      setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
      setDialogOpen(false);
    } catch (error) {
      console.error('Error creating showtimes:', error);
      toast.error('Failed to create showtimes');
    }
  };

  const toggleShowtimeActive = async (showtime: any) => {
    try {
      const { error } = await supabase
        .from('showtimes')
        .update({ is_active: !showtime.is_active })
        .eq('id', showtime.id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['showtimes'] });
      toast.success(showtime.is_active ? 'Showtime hidden' : 'Showtime visible');
    } catch (error) {
      console.error('Error toggling showtime:', error);
      toast.error('Failed to update showtime');
    }
  };

  const deleteShowtime = async (id: string) => {
    try {
      const { error } = await supabase.from('showtimes').delete().eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['showtimes'] });
      toast.success('Showtime deleted');
    } catch (error) {
      console.error('Error deleting showtime:', error);
      toast.error('Failed to delete showtime');
    }
  };

  // Group showtimes by date for display
  const groupedShowtimes = showtimes?.reduce((acc, showtime) => {
    const dateKey = format(new Date(showtime.start_time), 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(showtime);
    return acc;
  }, {} as Record<string, typeof showtimes>);

  const handleEditShowtime = (showtime: any) => {
    setEditingShowtime(showtime);
    setEditDialogOpen(true);
  };

  const handleAddShowtimeFromCalendar = (date: Date) => {
    setQuickAddDate(date);
    setQuickAddMovieId('');
    setQuickAddScreenId('');
    setQuickAddPresetTime('');
    setQuickAddCustomTime('');
    setQuickAddDialogOpen(true);
  };

  // Check for conflicts in quick add dialog
  const quickAddConflict = useMemo(() => {
    if (!quickAddDate || !quickAddScreenId || !quickAddMovieId) return null;
    
    const time = quickAddCustomTime || quickAddPresetTime;
    if (!time || !/^\d{1,2}:\d{2}$/.test(time)) return null;

    const selectedMovie = movies?.find(m => m.id === quickAddMovieId);
    if (!selectedMovie) return null;

    const [hours, minutes] = time.split(':').map(Number);
    const newStart = new Date(quickAddDate);
    newStart.setHours(hours, minutes, 0, 0);
    const newEnd = addMinutes(newStart, selectedMovie.duration_minutes + BUFFER_MINUTES);

    // Find conflicts on the same screen for the same day
    const dayShowtimes = allShowtimes?.filter(s => {
      if (s.screen_id !== quickAddScreenId) return false;
      const showtimeDate = new Date(s.start_time);
      return showtimeDate.getFullYear() === quickAddDate.getFullYear() &&
        showtimeDate.getMonth() === quickAddDate.getMonth() &&
        showtimeDate.getDate() === quickAddDate.getDate();
    }) || [];

    for (const existing of dayShowtimes) {
      const existingStart = new Date(existing.start_time);
      const existingDuration = (existing.movies?.duration_minutes || 120) + BUFFER_MINUTES;
      const existingEnd = addMinutes(existingStart, existingDuration);

      // Check overlap
      if (newStart < existingEnd && newEnd > existingStart) {
        return {
          existingMovie: existing.movies?.title || 'Unknown',
          existingStart,
          existingEnd,
          screen: existing.screens?.name || 'Unknown',
        };
      }
    }
    return null;
  }, [quickAddDate, quickAddScreenId, quickAddMovieId, quickAddPresetTime, quickAddCustomTime, allShowtimes, movies]);

  const handleQuickAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile?.organization_id || !quickAddDate) return;

    const formData = new FormData(e.currentTarget);
    const movieId = formData.get('movie_id') as string;
    const screenId = formData.get('screen_id') as string;
    const presetTime = formData.get('time') as string;
    const customTime = formData.get('custom_time') as string;
    const time = customTime || presetTime; // Prefer custom time if provided
    const price = Math.min(999, Math.max(0, parseFloat(formData.get('price') as string) || 10));
    const vipPrice = Math.min(999, Math.max(0, parseFloat(formData.get('vip_price') as string))) || null;

    if (!movieId || !screenId) {
      toast.error('Please select a movie and screen');
      return;
    }

    if (!time || !/^\d{1,2}:\d{2}$/.test(time)) {
      toast.error('Please select or enter a valid time');
      return;
    }

    const [hours, minutes] = time.split(':').map(Number);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      toast.error('Invalid time format');
      return;
    }

    const showtimeDate = new Date(quickAddDate);
    showtimeDate.setHours(hours, minutes, 0, 0);

    if (showtimeDate <= new Date()) {
      toast.error('Cannot create showtime in the past');
      return;
    }

    try {
      const { error } = await supabase.from('showtimes').insert({
        organization_id: profile.organization_id,
        movie_id: movieId,
        screen_id: screenId,
        start_time: showtimeDate.toISOString(),
        price,
        vip_price: vipPrice,
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['showtimes'] });
      toast.success(`Showtime added for ${format(showtimeDate, 'MMM d, h:mm a')}`);
      setQuickAddDialogOpen(false);
      setQuickAddDate(null);
    } catch (error) {
      console.error('Error creating showtime:', error);
      toast.error('Failed to create showtime');
    }
  };

  const handleShowtimeMove = async (showtimeId: string, newDateTime: Date) => {
    try {
      const { error } = await supabase
        .from('showtimes')
        .update({ start_time: newDateTime.toISOString() })
        .eq('id', showtimeId);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['showtimes'] });
      toast.success(`Showtime rescheduled to ${format(newDateTime, 'MMM d, h:mm a')}`);
    } catch (error) {
      console.error('Error moving showtime:', error);
      toast.error('Failed to reschedule showtime');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Showtime Management</h1>
            <p className="text-muted-foreground">
              Schedule movie showtimes and set pricing
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Time Filter Tabs */}
            <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as 'upcoming' | 'past')}>
              <TabsList>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="past">Past</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* View Toggle */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'calendar')} className="hidden sm:block">
              <TabsList>
                <TabsTrigger value="list" className="gap-2">
                  <List className="h-4 w-4" />
                  List
                </TabsTrigger>
                <TabsTrigger value="calendar" className="gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Calendar
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button onClick={() => {
              reset({ price: 10, vip_price: 15 });
              setSelectedTimes([]);
              setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
              setCustomTimeInput('');
              setDialogOpen(true);
            }}>
              <CalendarPlus className="mr-2 h-4 w-4" />
              Bulk Schedule
            </Button>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader className="pb-4 border-b">
                <DialogTitle className="flex items-center gap-2">
                  <CalendarPlus className="h-5 w-5 text-primary" />
                  Schedule Showtimes
                </DialogTitle>
                <DialogDescription>
                  Create recurring showtimes for a movie across multiple days
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
                {/* Movie Selection */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Film className="h-4 w-4 text-muted-foreground" />
                    Movie
                  </Label>
                  <Select onValueChange={(value) => setValue('movie_id', value)}>
                    <SelectTrigger className={errors.movie_id ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select a movie" />
                    </SelectTrigger>
                    <SelectContent>
                      {movies?.map((movie) => (
                        <SelectItem key={movie.id} value={movie.id}>
                          <div className="flex items-center justify-between w-full gap-4">
                            <span>{movie.title}</span>
                            <Badge variant="secondary" className="text-xs">{movie.duration_minutes} min</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.movie_id && <p className="text-sm text-destructive">{errors.movie_id.message}</p>}
                </div>

                {/* Screen Selection */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    Screen
                  </Label>
                  <Select onValueChange={(value) => setValue('screen_id', value)}>
                    <SelectTrigger className={errors.screen_id ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select a screen" />
                    </SelectTrigger>
                    <SelectContent>
                      {screens?.map((screen) => (
                        <SelectItem key={screen.id} value={screen.id}>
                          {screen.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.screen_id && <p className="text-sm text-destructive">{errors.screen_id.message}</p>}
                </div>

                {/* Date Range */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Date Range
                  </Label>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="start_date" className="text-xs text-muted-foreground">From</Label>
                      <Input
                        id="start_date"
                        type="date"
                        min={format(new Date(), 'yyyy-MM-dd')}
                        {...register('start_date')}
                        className={errors.start_date ? 'border-destructive' : ''}
                      />
                      {errors.start_date && <p className="text-sm text-destructive">{errors.start_date.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="end_date" className="text-xs text-muted-foreground">To</Label>
                      <Input
                        id="end_date"
                        type="date"
                        min={format(new Date(), 'yyyy-MM-dd')}
                        {...register('end_date')}
                        className={errors.end_date ? 'border-destructive' : ''}
                      />
                      {errors.end_date && <p className="text-sm text-destructive">{errors.end_date.message}</p>}
                    </div>
                  </div>
                </div>

                {/* Days of Week Selection */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    Days of Week
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS_OF_WEEK.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay(day.value)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          selectedDays.includes(day.value)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={selectAllDays}>
                      All
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={selectWeekdays}>
                      Weekdays
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={selectWeekends}>
                      Weekends
                    </Button>
                  </div>
                </div>

                {/* Showtimes - Multiple Times */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Showtimes
                  </Label>
                  
                  {/* Quick time buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_TIMES.map((time) => (
                      <button
                        key={time.value}
                        type="button"
                        onClick={() => addTime(time.value)}
                        disabled={selectedTimes.includes(time.value)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                          selectedTimes.includes(time.value)
                            ? 'bg-primary/20 text-primary cursor-not-allowed'
                            : 'bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground'
                        }`}
                      >
                        {time.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom time input */}
                  <div className="flex gap-2">
                    <Input
                      type="time"
                      value={customTimeInput}
                      onChange={(e) => setCustomTimeInput(e.target.value)}
                      className="flex-1"
                      placeholder="Add custom time"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => addTime(customTimeInput)}
                      disabled={!customTimeInput || selectedTimes.includes(customTimeInput)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Selected times */}
                  {selectedTimes.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedTimes.map((time) => (
                        <Badge key={time} variant="secondary" className="gap-1 pr-1">
                          {format(new Date(`2000-01-01T${time}`), 'h:mm a')}
                          <button
                            type="button"
                            onClick={() => removeTime(time)}
                            className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {selectedTimes.length === 0 && (
                    <p className="text-sm text-muted-foreground">Click times above or add custom times</p>
                  )}
                </div>

                {/* Pricing */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Ticket Pricing</Label>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="price" className="text-xs text-muted-foreground">Standard Price</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          {...register('price')}
                          className={`pl-7 ${errors.price ? 'border-destructive' : ''}`}
                        />
                      </div>
                      {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="vip_price" className="text-xs text-muted-foreground">VIP Price (optional)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          id="vip_price"
                          type="number"
                          step="0.01"
                          {...register('vip_price')}
                          className="pl-7"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                {selectedTimes.length > 0 && watch('start_date') && watch('end_date') && selectedDays.length > 0 && (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-sm font-medium mb-1">Summary</p>
                    <p className="text-sm text-muted-foreground">
                      <strong>{selectedTimes.length}</strong> showtime{selectedTimes.length !== 1 ? 's' : ''} per day
                      ({selectedTimes.map(t => format(new Date(`2000-01-01T${t}`), 'h:mm a')).join(', ')})
                      <br />
                      on <strong>{selectedDays.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label).join(', ')}</strong>
                      <br />
                      from <strong>{format(new Date(watch('start_date')), 'MMM d')}</strong> to{' '}
                      <strong>{format(new Date(watch('end_date')), 'MMM d, yyyy')}</strong>
                    </p>
                  </div>
                )}

                {/* Conflict Warning */}
                {detectedConflicts.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Scheduling Conflicts</AlertTitle>
                    <AlertDescription>
                      <p className="mb-2 text-sm">
                        {detectedConflicts.length} overlap{detectedConflicts.length !== 1 ? 's' : ''} detected:
                      </p>
                      <ul className="text-xs space-y-1 max-h-24 overflow-y-auto">
                        {detectedConflicts.slice(0, 3).map((conflict, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span>•</span>
                            <span>
                              {format(conflict.newStart, 'MMM d, h:mm a')} → "{conflict.existingMovie}"
                            </span>
                          </li>
                        ))}
                        {detectedConflicts.length > 3 && (
                          <li className="text-muted-foreground">
                            +{detectedConflicts.length - 3} more
                          </li>
                        )}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isSubmitting}
                  variant={detectedConflicts.length > 0 ? 'destructive' : 'default'}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Showtimes...
                    </>
                  ) : detectedConflicts.length > 0 ? (
                    <>
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Create Anyway ({detectedConflicts.length} conflicts)
                    </>
                  ) : (
                    'Create Showtimes'
                  )}
                </Button>
              </form>
            </DialogContent>
        </Dialog>

        {(!movies?.length || !screens?.length) && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                {!movies?.length && !screens?.length
                  ? 'Add movies and screens first before scheduling showtimes'
                  : !movies?.length
                  ? 'Add movies first before scheduling showtimes'
                  : 'Add screens first before scheduling showtimes'}
              </p>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : viewMode === 'calendar' && showtimes && screens ? (
          <Card>
            <CardContent className="pt-6">
              <ShowtimeCalendar
                showtimes={showtimes}
                screens={screens}
                bookingCounts={bookingCounts}
                onShowtimeClick={handleEditShowtime}
                onShowtimeMove={handleShowtimeMove}
                onAddShowtime={handleAddShowtimeFromCalendar}
              />
            </CardContent>
          </Card>
        ) : groupedShowtimes && Object.keys(groupedShowtimes).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedShowtimes).map(([date, dateShowtimes]) => (
              <Card key={date}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                  </CardTitle>
                  <CardDescription>{dateShowtimes?.length} showtime(s)</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Movie</TableHead>
                        <TableHead>Screen</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Pricing</TableHead>
                        {timeFilter === 'past' && <TableHead>Sales</TableHead>}
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dateShowtimes?.map((showtime) => {
                        const stats = bookingStats?.[showtime.id];
                        return (
                          <TableRow key={showtime.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Film className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{showtime.movies?.title}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Monitor className="h-4 w-4 text-muted-foreground" />
                                {showtime.screens?.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(showtime.start_time), 'h:mm a')}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Badge variant="outline">${showtime.price}</Badge>
                                {showtime.vip_price && (
                                  <Badge variant="secondary">VIP: ${showtime.vip_price}</Badge>
                                )}
                              </div>
                            </TableCell>
                            {timeFilter === 'past' && (
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <Badge variant="secondary" className="w-fit gap-1">
                                    <Ticket className="h-3 w-3" />
                                    {stats?.count || 0} / {stats?.capacity || 0} tickets
                                  </Badge>
                                  <Badge variant="outline" className="w-fit gap-1 text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-400">
                                    <DollarSign className="h-3 w-3" />
                                    ${(stats?.revenue || 0).toFixed(0)} earned
                                  </Badge>
                                </div>
                              </TableCell>
                            )}
                            <TableCell>
                              <Switch
                                checked={showtime.is_active}
                                onCheckedChange={() => toggleShowtimeActive(showtime)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditShowtime(showtime)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteShowtime(showtime.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Summary row for past showtimes */}
                      {timeFilter === 'past' && dateShowtimes && dateShowtimes.length > 0 && (
                        (() => {
                          const dayTotals = dateShowtimes.reduce(
                            (acc, s) => {
                              const stats = bookingStats?.[s.id];
                              return {
                                tickets: acc.tickets + (stats?.count || 0),
                                capacity: acc.capacity + (stats?.capacity || 0),
                                revenue: acc.revenue + (stats?.revenue || 0),
                              };
                            },
                            { tickets: 0, capacity: 0, revenue: 0 }
                          );
                          return (
                            <TableRow className="bg-muted/50 font-medium">
                              <TableCell colSpan={4} className="text-right">
                                Daily Total
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <Badge variant="default" className="w-fit gap-1">
                                    <Ticket className="h-3 w-3" />
                                    {dayTotals.tickets} / {dayTotals.capacity} tickets
                                  </Badge>
                                  <Badge className="w-fit gap-1 bg-emerald-600 hover:bg-emerald-600">
                                    <DollarSign className="h-3 w-3" />
                                    ${dayTotals.revenue.toFixed(0)} total
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell colSpan={2} />
                            </TableRow>
                          );
                        })()
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {timeFilter === 'upcoming' ? 'No upcoming showtimes' : 'No past showtimes'}
              </p>
              {timeFilter === 'upcoming' && movies?.length && screens?.length ? (
                <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule First Showtime
                </Button>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Showtime Dialog */}
      <EditShowtimeDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        showtime={editingShowtime}
        movies={movies || []}
        screens={screens || []}
        allShowtimes={allShowtimes || []}
      />

      {/* Quick Add Showtime Dialog */}
      <Dialog open={quickAddDialogOpen} onOpenChange={(open) => {
        setQuickAddDialogOpen(open);
        if (!open) setQuickAddDate(null);
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Add Showtime
            </DialogTitle>
            <DialogDescription>
              {quickAddDate && format(quickAddDate, 'EEEE, MMMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>

          {/* Existing showtimes for this day */}
          {quickAddDate && allShowtimes && (() => {
            const dayShowtimes = allShowtimes
              .filter(s => {
                const showtimeDate = new Date(s.start_time);
                return quickAddDate && 
                  showtimeDate.getFullYear() === quickAddDate.getFullYear() &&
                  showtimeDate.getMonth() === quickAddDate.getMonth() &&
                  showtimeDate.getDate() === quickAddDate.getDate();
              })
              .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
            
            if (dayShowtimes.length === 0) return null;
            
            return (
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Existing showtimes ({dayShowtimes.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {dayShowtimes.map(s => (
                    <Badge key={s.id} variant="secondary" className="text-xs gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(s.start_time), 'h:mm a')}
                      <span className="opacity-60">· {s.movies?.title?.substring(0, 15)}{(s.movies?.title?.length || 0) > 15 ? '...' : ''}</span>
                      <span className="opacity-60">· {s.screens?.name}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })()}

          <form onSubmit={handleQuickAddSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Movie *</Label>
              <Select name="movie_id" value={quickAddMovieId} onValueChange={setQuickAddMovieId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select movie" />
                </SelectTrigger>
                <SelectContent>
                  {movies?.map((movie) => (
                    <SelectItem key={movie.id} value={movie.id}>
                      {movie.title} ({movie.duration_minutes}min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Screen *</Label>
              <Select name="screen_id" value={quickAddScreenId} onValueChange={setQuickAddScreenId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select screen" />
                </SelectTrigger>
                <SelectContent>
                  {screens?.map((screen) => (
                    <SelectItem key={screen.id} value={screen.id}>
                      {screen.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Time *</Label>
              <div className="flex gap-2">
                <Select 
                  name="time" 
                  value={quickAddPresetTime} 
                  onValueChange={(v) => {
                    setQuickAddPresetTime(v);
                    setQuickAddCustomTime(''); // Clear custom when preset is selected
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_TIMES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground self-center">or</span>
                <Input 
                  name="custom_time" 
                  type="time" 
                  className="w-[120px]"
                  placeholder="Custom"
                  value={quickAddCustomTime}
                  onChange={(e) => {
                    setQuickAddCustomTime(e.target.value);
                    setQuickAddPresetTime(''); // Clear preset when custom is entered
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">Select from presets or enter a custom time</p>
            </div>

            {/* Conflict Warning */}
            {quickAddConflict && (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-sm">Time Conflict</AlertTitle>
                <AlertDescription className="text-xs">
                  Overlaps with "{quickAddConflict.existingMovie}" ({format(quickAddConflict.existingStart, 'h:mm a')} - {format(quickAddConflict.existingEnd, 'h:mm a')}) on {quickAddConflict.screen}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Price ($)</Label>
                <Input name="price" type="number" step="0.01" min="0" max="999" defaultValue="10" />
              </div>
              <div className="space-y-2">
                <Label>VIP Price ($)</Label>
                <Input name="vip_price" type="number" step="0.01" min="0" max="999" defaultValue="15" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setQuickAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                variant={quickAddConflict ? 'destructive' : 'default'}
              >
                {quickAddConflict ? 'Add Anyway' : 'Add Showtime'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
