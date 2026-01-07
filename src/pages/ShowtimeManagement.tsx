import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Loader2, Plus, Calendar, Clock, Trash2, Film, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const showtimeSchema = z.object({
  movie_id: z.string().min(1, 'Please select a movie'),
  screen_id: z.string().min(1, 'Please select a screen'),
  start_time: z.string().min(1, 'Start time is required'),
  price: z.coerce.number().min(0, 'Price must be positive'),
  vip_price: z.coerce.number().min(0).optional(),
});

type ShowtimeFormData = z.infer<typeof showtimeSchema>;

export default function ShowtimeManagement() {
  const { data: profile } = useUserProfile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ShowtimeFormData>({
    resolver: zodResolver(showtimeSchema),
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

  const onSubmit = async (data: ShowtimeFormData) => {
    if (!profile?.organization_id) return;

    try {
      const { error } = await supabase
        .from('showtimes')
        .insert({
          organization_id: profile.organization_id,
          movie_id: data.movie_id,
          screen_id: data.screen_id,
          start_time: new Date(data.start_time).toISOString(),
          price: data.price,
          vip_price: data.vip_price || null,
        });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['showtimes'] });
      toast.success('Showtime created successfully');
      reset();
      setDialogOpen(false);
    } catch (error) {
      console.error('Error creating showtime:', error);
      toast.error('Failed to create showtime');
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
              <Button onClick={() => reset({ price: 10, vip_price: 15 })}>
                <Plus className="mr-2 h-4 w-4" />
                Add Showtime
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule Showtime</DialogTitle>
                <DialogDescription>
                  Select a movie, screen, and time
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

                <div className="space-y-2">
                  <Label htmlFor="start_time">Date & Time *</Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    {...register('start_time')}
                    className={errors.start_time ? 'border-destructive' : ''}
                  />
                  {errors.start_time && <p className="text-sm text-destructive">{errors.start_time.message}</p>}
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

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Showtime'
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
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Showtimes</CardTitle>
              <CardDescription>Scheduled movie screenings</CardDescription>
            </CardHeader>
            <CardContent>
              {showtimes && showtimes.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Movie</TableHead>
                      <TableHead>Screen</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Pricing</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {showtimes.map((showtime) => (
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
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(showtime.start_time), 'MMM d, yyyy')}
                            </span>
                            <span className="flex items-center gap-1 text-muted-foreground text-sm">
                              <Clock className="h-3 w-3" />
                              {format(new Date(showtime.start_time), 'h:mm a')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
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
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No upcoming showtimes</p>
                  {movies?.length && screens?.length ? (
                    <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Schedule First Showtime
                    </Button>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
