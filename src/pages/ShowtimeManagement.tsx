import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays, parse } from 'date-fns';
import { Loader2, Plus, Calendar, Clock, Trash2, Film, Monitor, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const bulkShowtimeSchema = z.object({
  movie_id: z.string().min(1, 'Please select a movie'),
  screen_id: z.string().min(1, 'Please select a screen'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  times: z.array(z.string()).min(1, 'Select at least one showtime'),
  price: z.coerce.number().min(0, 'Price must be positive'),
  vip_price: z.coerce.number().min(0).optional(),
});

type BulkShowtimeFormData = z.infer<typeof bulkShowtimeSchema>;

const COMMON_TIMES = [
  { label: '10:00 AM', value: '10:00' },
  { label: '12:30 PM', value: '12:30' },
  { label: '2:00 PM', value: '14:00' },
  { label: '4:30 PM', value: '16:30' },
  { label: '7:00 PM', value: '19:00' },
  { label: '9:30 PM', value: '21:30' },
];

export default function ShowtimeManagement() {
  const { data: profile } = useUserProfile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [customTime, setCustomTime] = useState('');
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
    defaultValues: {
      times: [],
    },
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

  const { data: showtimes, isLoading } = useQuery({
    queryKey: ['showtimes', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('showtimes')
        .select(`
          *,
          movies (title, duration_minutes),
          screens (name)
        `)
        .eq('organization_id', profile.organization_id)
        .gte('start_time', new Date().toISOString())
        .order('start_time');

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  const toggleTime = (time: string) => {
    const newTimes = selectedTimes.includes(time)
      ? selectedTimes.filter(t => t !== time)
      : [...selectedTimes, time];
    setSelectedTimes(newTimes);
    setValue('times', newTimes, { shouldValidate: true });
  };

  const addCustomTime = () => {
    if (customTime && !selectedTimes.includes(customTime)) {
      const newTimes = [...selectedTimes, customTime];
      setSelectedTimes(newTimes);
      setValue('times', newTimes, { shouldValidate: true });
      setCustomTime('');
    }
  };

  const onSubmit = async (data: BulkShowtimeFormData) => {
    if (!profile?.organization_id) return;

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
        for (const time of data.times) {
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
        currentDate = addDays(currentDate, 1);
      }

      if (showtimesToCreate.length === 0) {
        toast.error('No valid showtimes to create. All times are in the past.');
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

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                reset({ price: 10, vip_price: 15, times: [] });
                setSelectedTimes([]);
              }}>
                <CalendarPlus className="mr-2 h-4 w-4" />
                Bulk Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Bulk Schedule Showtimes</DialogTitle>
                <DialogDescription>
                  Create multiple showtimes at once for a date range
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label>Movie *</Label>
                  <Select onValueChange={(value) => setValue('movie_id', value)}>
                    <SelectTrigger className={errors.movie_id ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select a movie" />
                    </SelectTrigger>
                    <SelectContent>
                      {movies?.map((movie) => (
                        <SelectItem key={movie.id} value={movie.id}>
                          {movie.title} ({movie.duration_minutes} min)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.movie_id && <p className="text-sm text-destructive">{errors.movie_id.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Screen *</Label>
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      min={format(new Date(), 'yyyy-MM-dd')}
                      {...register('start_date')}
                      className={errors.start_date ? 'border-destructive' : ''}
                    />
                    {errors.start_date && <p className="text-sm text-destructive">{errors.start_date.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date *</Label>
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

                <div className="space-y-2">
                  <Label>Showtimes *</Label>
                  <p className="text-xs text-muted-foreground">Select times for daily screenings</p>
                  <div className="grid grid-cols-3 gap-2">
                    {COMMON_TIMES.map((time) => (
                      <div
                        key={time.value}
                        className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                          selectedTimes.includes(time.value)
                            ? 'border-primary bg-primary/10'
                            : 'border-input hover:bg-accent'
                        }`}
                        onClick={() => toggleTime(time.value)}
                      >
                        <Checkbox
                          checked={selectedTimes.includes(time.value)}
                          onCheckedChange={() => toggleTime(time.value)}
                        />
                        <span className="text-sm">{time.label}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2 mt-2">
                    <Input
                      type="time"
                      value={customTime}
                      onChange={(e) => setCustomTime(e.target.value)}
                      className="flex-1"
                      placeholder="Add custom time"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addCustomTime}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {selectedTimes.filter(t => !COMMON_TIMES.find(ct => ct.value === t)).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedTimes.filter(t => !COMMON_TIMES.find(ct => ct.value === t)).map(time => (
                        <Badge key={time} variant="secondary" className="gap-1">
                          {time}
                          <button type="button" onClick={() => toggleTime(time)} className="ml-1 hover:text-destructive">×</button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {errors.times && <p className="text-sm text-destructive">{errors.times.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Standard Price *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      {...register('price')}
                      className={errors.price ? 'border-destructive' : ''}
                    />
                    {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vip_price">VIP Price</Label>
                    <Input
                      id="vip_price"
                      type="number"
                      step="0.01"
                      {...register('vip_price')}
                    />
                  </div>
                </div>

                {selectedTimes.length > 0 && watch('start_date') && watch('end_date') && (
                  <div className="bg-muted/50 rounded-md p-3 text-sm">
                    <p className="font-medium">Preview:</p>
                    <p className="text-muted-foreground">
                      This will create showtimes for <strong>{selectedTimes.length} time(s)</strong> daily 
                      from <strong>{watch('start_date')}</strong> to <strong>{watch('end_date')}</strong>
                    </p>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Showtimes'
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

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
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dateShowtimes?.map((showtime) => (
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
                          <TableCell>
                            <Switch
                              checked={showtime.is_active}
                              onCheckedChange={() => toggleShowtimeActive(showtime)}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteShowtime(showtime.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
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
              <p className="text-muted-foreground">No upcoming showtimes</p>
              {movies?.length && screens?.length ? (
                <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule First Showtime
                </Button>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
