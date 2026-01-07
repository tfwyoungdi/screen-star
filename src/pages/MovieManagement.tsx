import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus, Film, Clock, Edit, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const movieSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  duration_minutes: z.coerce.number().min(1, 'Duration must be at least 1 minute'),
  genre: z.string().optional(),
  rating: z.string().optional(),
  poster_url: z.string().url().optional().or(z.literal('')),
});

type MovieFormData = z.infer<typeof movieSchema>;

export default function MovieManagement() {
  const { data: profile } = useUserProfile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<any>(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MovieFormData>({
    resolver: zodResolver(movieSchema),
  });

  const { data: movies, isLoading } = useQuery({
    queryKey: ['movies', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  const onSubmit = async (data: MovieFormData) => {
    if (!profile?.organization_id) return;

    try {
      if (editingMovie) {
        const { error } = await supabase
          .from('movies')
          .update({
            title: data.title,
            description: data.description || null,
            duration_minutes: data.duration_minutes,
            genre: data.genre || null,
            rating: data.rating || null,
            poster_url: data.poster_url || null,
          })
          .eq('id', editingMovie.id);

        if (error) throw error;
        toast.success('Movie updated successfully');
      } else {
        const { error } = await supabase
          .from('movies')
          .insert({
            organization_id: profile.organization_id,
            title: data.title,
            description: data.description || null,
            duration_minutes: data.duration_minutes,
            genre: data.genre || null,
            rating: data.rating || null,
            poster_url: data.poster_url || null,
          });

        if (error) throw error;
        toast.success('Movie added successfully');
      }

      queryClient.invalidateQueries({ queryKey: ['movies'] });
      reset();
      setEditingMovie(null);
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving movie:', error);
      toast.error('Failed to save movie');
    }
  };

  const toggleMovieActive = async (movie: any) => {
    try {
      const { error } = await supabase
        .from('movies')
        .update({ is_active: !movie.is_active })
        .eq('id', movie.id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      toast.success(movie.is_active ? 'Movie hidden' : 'Movie visible');
    } catch (error) {
      console.error('Error toggling movie:', error);
      toast.error('Failed to update movie');
    }
  };

  const deleteMovie = async (id: string) => {
    try {
      const { error } = await supabase
        .from('movies')
        .delete()
        .eq('id', id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      toast.success('Movie deleted');
    } catch (error) {
      console.error('Error deleting movie:', error);
      toast.error('Failed to delete movie');
    }
  };

  const openEditDialog = (movie: any) => {
    setEditingMovie(movie);
    reset({
      title: movie.title,
      description: movie.description || '',
      duration_minutes: movie.duration_minutes,
      genre: movie.genre || '',
      rating: movie.rating || '',
      poster_url: movie.poster_url || '',
    });
    setDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingMovie(null);
    reset({
      title: '',
      description: '',
      duration_minutes: 120,
      genre: '',
      rating: '',
      poster_url: '',
    });
    setDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Movie Management</h1>
            <p className="text-muted-foreground">
              Add and manage movies for your cinema
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Movie
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingMovie ? 'Edit Movie' : 'Add New Movie'}</DialogTitle>
                <DialogDescription>
                  {editingMovie ? 'Update movie details' : 'Enter details for the new movie'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    {...register('title')}
                    className={errors.title ? 'border-destructive' : ''}
                  />
                  {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" {...register('description')} rows={3} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration_minutes">Duration (min) *</Label>
                    <Input
                      id="duration_minutes"
                      type="number"
                      {...register('duration_minutes')}
                      className={errors.duration_minutes ? 'border-destructive' : ''}
                    />
                    {errors.duration_minutes && (
                      <p className="text-sm text-destructive">{errors.duration_minutes.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rating">Rating</Label>
                    <Input id="rating" {...register('rating')} placeholder="PG-13" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="genre">Genre</Label>
                  <Input id="genre" {...register('genre')} placeholder="Action, Drama" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="poster_url">Poster URL</Label>
                  <Input id="poster_url" {...register('poster_url')} placeholder="https://..." />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingMovie ? (
                    'Update Movie'
                  ) : (
                    'Add Movie'
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Movies</CardTitle>
              <CardDescription>All movies in your catalog</CardDescription>
            </CardHeader>
            <CardContent>
              {movies && movies.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Movie</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Genre</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movies.map((movie) => (
                      <TableRow key={movie.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {movie.poster_url ? (
                              <img
                                src={movie.poster_url}
                                alt={movie.title}
                                className="h-12 w-8 object-cover rounded"
                              />
                            ) : (
                              <div className="h-12 w-8 bg-muted rounded flex items-center justify-center">
                                <Film className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{movie.title}</p>
                              {movie.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {movie.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {movie.duration_minutes} min
                          </div>
                        </TableCell>
                        <TableCell>{movie.genre || '-'}</TableCell>
                        <TableCell>
                          {movie.rating ? <Badge variant="outline">{movie.rating}</Badge> : '-'}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={movie.is_active}
                            onCheckedChange={() => toggleMovieActive(movie)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(movie)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMovie(movie.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Film className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No movies added yet</p>
                  <Button className="mt-4" onClick={openAddDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Movie
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
