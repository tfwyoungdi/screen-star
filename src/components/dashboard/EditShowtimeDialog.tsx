import { forwardRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Loader2, Film, Monitor, Calendar, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const editShowtimeSchema = z.object({
  movie_id: z.string().min(1, 'Please select a movie'),
  screen_id: z.string().min(1, 'Please select a screen'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  price: z.coerce.number().min(0, 'Price must be positive'),
  vip_price: z.coerce.number().min(0).optional(),
  is_active: z.boolean(),
});

type EditShowtimeFormData = z.infer<typeof editShowtimeSchema>;

interface Showtime {
  id: string;
  start_time: string;
  price: number;
  vip_price?: number | null;
  is_active: boolean;
  movie_id: string;
  screen_id: string;
  movies?: { title: string; duration_minutes: number } | null;
  screens?: { name: string } | null;
}

interface Movie {
  id: string;
  title: string;
  duration_minutes: number;
}

interface Screen {
  id: string;
  name: string;
}

interface EditShowtimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showtime: Showtime | null;
  movies: Movie[];
  screens: Screen[];
}

export const EditShowtimeDialog = forwardRef<HTMLDivElement, EditShowtimeDialogProps>(
  function EditShowtimeDialog({ open, onOpenChange, showtime, movies, screens }, ref) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditShowtimeFormData>({
    resolver: zodResolver(editShowtimeSchema),
    values: showtime ? {
      movie_id: showtime.movie_id,
      screen_id: showtime.screen_id,
      date: format(new Date(showtime.start_time), 'yyyy-MM-dd'),
      time: format(new Date(showtime.start_time), 'HH:mm'),
      price: showtime.price,
      vip_price: showtime.vip_price ?? undefined,
      is_active: showtime.is_active,
    } : undefined,
  });

  const watchedIsActive = watch('is_active');

  const onSubmit = async (data: EditShowtimeFormData) => {
    if (!showtime) return;

    try {
      const [hours, minutes] = data.time.split(':').map(Number);
      const startTime = new Date(data.date);
      startTime.setHours(hours, minutes, 0, 0);

      const { error } = await supabase
        .from('showtimes')
        .update({
          movie_id: data.movie_id,
          screen_id: data.screen_id,
          start_time: startTime.toISOString(),
          price: data.price,
          vip_price: data.vip_price || null,
          is_active: data.is_active,
        })
        .eq('id', showtime.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['showtimes'] });
      toast.success('Showtime updated successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating showtime:', error);
      toast.error('Failed to update showtime');
    }
  };

  const handleDelete = async () => {
    if (!showtime) return;

    try {
      const { error } = await supabase.from('showtimes').delete().eq('id', showtime.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['showtimes'] });
      toast.success('Showtime deleted');
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting showtime:', error);
      toast.error('Failed to delete showtime');
    }
  };

  return (
    <Dialog open={open && !!showtime} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Edit Showtime
          </DialogTitle>
          <DialogDescription>
            Modify the details for this showtime
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-4">
          {/* Movie Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Film className="h-4 w-4 text-muted-foreground" />
              Movie
            </Label>
            <Select value={watch('movie_id')} onValueChange={(value) => setValue('movie_id', value)}>
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
            <Select value={watch('screen_id')} onValueChange={(value) => setValue('screen_id', value)}>
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

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Date
              </Label>
              <Input
                type="date"
                {...register('date')}
                className={errors.date ? 'border-destructive' : ''}
              />
              {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Time
              </Label>
              <Input
                type="time"
                {...register('time')}
                className={errors.time ? 'border-destructive' : ''}
              />
              {errors.time && <p className="text-sm text-destructive">{errors.time.message}</p>}
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Standard Price
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  {...register('price')}
                  className={`pl-7 ${errors.price ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">VIP Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  {...register('vip_price')}
                  className="pl-7"
                />
              </div>
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Visible to Public</Label>
              <p className="text-sm text-muted-foreground">
                {watchedIsActive ? 'Customers can see and book this showtime' : 'Hidden from public view'}
              </p>
            </div>
            <Switch
              checked={watchedIsActive}
              onCheckedChange={(checked) => setValue('is_active', checked)}
            />
          </div>

          <DialogFooter className="flex gap-2 pt-4 border-t">
            <Button type="button" variant="destructive" onClick={handleDelete} className="mr-auto">
              Delete
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});
