import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays, eachDayOfInterval } from 'date-fns';
import { Loader2, Film, Monitor, Calendar, Clock, DollarSign, Plus, X, Copy } from 'lucide-react';
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
  organization_id?: string;
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

export function EditShowtimeDialog({ open, onOpenChange, showtime, movies, screens }: EditShowtimeDialogProps) {
  const queryClient = useQueryClient();
  const [additionalTimes, setAdditionalTimes] = useState<string[]>([]);
  const [extendToDate, setExtendToDate] = useState<string>('');
  const [isCreatingAdditional, setIsCreatingAdditional] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
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
  const watchedDate = watch('date');

  const addTime = () => {
    setAdditionalTimes([...additionalTimes, '']);
  };

  const removeTime = (index: number) => {
    setAdditionalTimes(additionalTimes.filter((_, i) => i !== index));
  };

  const updateTime = (index: number, value: string) => {
    const updated = [...additionalTimes];
    updated[index] = value;
    setAdditionalTimes(updated);
  };

  const onSubmit = async (data: EditShowtimeFormData) => {
    if (!showtime) return;

    try {
      // Update the existing showtime
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

      // Create additional showtimes if any
      const validAdditionalTimes = additionalTimes.filter(t => t.trim() !== '');
      
      if (validAdditionalTimes.length > 0 || extendToDate) {
        setIsCreatingAdditional(true);
        
        const newShowtimes: any[] = [];
        const baseDate = new Date(data.date);
        const endDate = extendToDate ? new Date(extendToDate) : baseDate;
        
        // Get all dates in range
        const dates = eachDayOfInterval({ start: baseDate, end: endDate });
        
        // All times to create (original time for extended dates + additional times)
        const allTimes = extendToDate && dates.length > 1 
          ? [data.time, ...validAdditionalTimes]
          : validAdditionalTimes;
        
        for (const date of dates) {
          const timesToCreate = date.getTime() === baseDate.getTime() 
            ? validAdditionalTimes // For the original date, only add additional times
            : allTimes; // For extended dates, add all times including original
          
          for (const time of timesToCreate) {
            const [h, m] = time.split(':').map(Number);
            const showDateTime = new Date(date);
            showDateTime.setHours(h, m, 0, 0);
            
            newShowtimes.push({
              movie_id: data.movie_id,
              screen_id: data.screen_id,
              organization_id: showtime.organization_id,
              start_time: showDateTime.toISOString(),
              price: data.price,
              vip_price: data.vip_price || null,
              is_active: data.is_active,
            });
          }
        }

        if (newShowtimes.length > 0) {
          const { error: insertError } = await supabase
            .from('showtimes')
            .insert(newShowtimes);

          if (insertError) throw insertError;
          toast.success(`Created ${newShowtimes.length} additional showtime(s)`);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['showtimes'] });
      toast.success('Showtime updated successfully');
      setAdditionalTimes([]);
      setExtendToDate('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating showtime:', error);
      toast.error('Failed to update showtime');
    } finally {
      setIsCreatingAdditional(false);
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

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setAdditionalTimes([]);
      setExtendToDate('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open && !!showtime} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Edit Showtime
          </DialogTitle>
          <DialogDescription>
            Modify details or add more showtimes
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

          {/* Additional Times */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-muted-foreground" />
                Additional Times
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={addTime}>
                <Plus className="h-3 w-3 mr-1" />
                Add Time
              </Button>
            </div>
            {additionalTimes.length > 0 && (
              <div className="space-y-2">
                {additionalTimes.map((time, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => updateTime(index, e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTime(index)}
                      className="h-9 w-9"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {additionalTimes.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Add more showtimes for the same movie and screen
              </p>
            )}
          </div>

          {/* Extend to Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Copy className="h-4 w-4 text-muted-foreground" />
              Extend to Date (optional)
            </Label>
            <Input
              type="date"
              value={extendToDate}
              onChange={(e) => setExtendToDate(e.target.value)}
              min={watchedDate}
              placeholder="Repeat until..."
            />
            <p className="text-xs text-muted-foreground">
              Copy these showtimes to each day until this date
            </p>
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
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isCreatingAdditional}>
              {isSubmitting || isCreatingAdditional ? (
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
}
