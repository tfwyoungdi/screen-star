import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus, Monitor, Edit, Trash2, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const screenSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  rows: z.coerce.number().min(1).max(26, 'Max 26 rows (A-Z)'),
  columns: z.coerce.number().min(1).max(50, 'Max 50 seats per row'),
  vipRows: z.coerce.number().min(0).max(26, 'Max 26 VIP rows'),
});

type ScreenFormData = z.infer<typeof screenSchema>;

export default function ScreenManagement() {
  const { data: profile } = useUserProfile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingScreen, setEditingScreen] = useState<any>(null);
  const [layoutDialogOpen, setLayoutDialogOpen] = useState(false);
  const [selectedScreen, setSelectedScreen] = useState<any>(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ScreenFormData>({
    resolver: zodResolver(screenSchema),
    defaultValues: {
      name: '',
      rows: 10,
      columns: 12,
      vipRows: 2,
    },
  });

  const { data: screens, isLoading } = useQuery({
    queryKey: ['screens', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('screens')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  const { data: seatLayouts } = useQuery({
    queryKey: ['seat-layouts', selectedScreen?.id],
    queryFn: async () => {
      if (!selectedScreen?.id) return [];
      const { data, error } = await supabase
        .from('seat_layouts')
        .select('*')
        .eq('screen_id', selectedScreen.id);

      if (error) throw error;
      return data;
    },
    enabled: !!selectedScreen?.id,
  });

  const onSubmit = async (data: ScreenFormData) => {
    if (!profile?.organization_id) return;

    try {
      if (editingScreen) {
        const { error } = await supabase
          .from('screens')
          .update({
            name: data.name,
            rows: data.rows,
            columns: data.columns,
          })
          .eq('id', editingScreen.id);

        if (error) throw error;

        const dimensionsChanged = editingScreen.rows !== data.rows || editingScreen.columns !== data.columns;

        // If dimensions changed, recreate the whole layout (including VIP rows)
        if (dimensionsChanged) {
          await regenerateSeatLayouts(editingScreen.id, data.rows, data.columns, data.vipRows);
        } else {
          // If only VIP rows changed, apply VIP rows to the existing layout
          await applyVipRows(editingScreen.id, data.rows, data.vipRows);
        }

        queryClient.invalidateQueries({ queryKey: ['seat-layouts'] });
        toast.success('Screen updated successfully');
      } else {
        const { data: newScreen, error } = await supabase
          .from('screens')
          .insert({
            organization_id: profile.organization_id,
            name: data.name,
            rows: data.rows,
            columns: data.columns,
          })
          .select()
          .single();

        if (error) throw error;

        // Generate initial seat layouts with VIP rows
        await generateSeatLayouts(newScreen.id, data.rows, data.columns, data.vipRows);

        toast.success('Screen created successfully');
      }

      queryClient.invalidateQueries({ queryKey: ['screens'] });
      reset();
      setEditingScreen(null);
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving screen:', error);
      toast.error('Failed to save screen');
    }
  };

  const generateSeatLayouts = async (screenId: string, rows: number, columns: number, vipRows: number = 0) => {
    const rowLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').slice(0, rows);
    const seats = [];

    // VIP rows are the last N rows (closest to screen back)
    const vipStartIndex = rows - vipRows;

    for (let i = 0; i < rowLabels.length; i++) {
      const rowLabel = rowLabels[i];
      const isVipRow = i >= vipStartIndex;
      
      for (let seatNum = 1; seatNum <= columns; seatNum++) {
        seats.push({
          screen_id: screenId,
          row_label: rowLabel,
          seat_number: seatNum,
          seat_type: isVipRow ? 'vip' : 'standard',
          is_available: true,
        });
      }
    }

    const { error } = await supabase.from('seat_layouts').insert(seats);
    if (error) console.error('Error creating seat layouts:', error);
  };

  const regenerateSeatLayouts = async (screenId: string, rows: number, columns: number, vipRows: number = 0) => {
    // Delete existing layouts
    await supabase.from('seat_layouts').delete().eq('screen_id', screenId);
    // Create new layouts
    await generateSeatLayouts(screenId, rows, columns, vipRows);
  };

  const applyVipRows = async (screenId: string, rows: number, vipRows: number = 0) => {
    // Reset all available seats back to standard (keep unavailable seats as-is)
    const { error: resetError } = await supabase
      .from('seat_layouts')
      .update({ seat_type: 'standard', is_available: true })
      .eq('screen_id', screenId)
      .neq('seat_type', 'unavailable');

    if (resetError) throw resetError;

    if (vipRows <= 0) return;

    const rowLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').slice(0, rows);
    const vipRowLabels = rowLabels.slice(Math.max(0, rows - vipRows));

    const { error: vipError } = await supabase
      .from('seat_layouts')
      .update({ seat_type: 'vip', is_available: true })
      .eq('screen_id', screenId)
      .in('row_label', vipRowLabels)
      .neq('seat_type', 'unavailable');

    if (vipError) throw vipError;
  };

  const deleteScreen = async (id: string) => {
    try {
      const { error } = await supabase.from('screens').delete().eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['screens'] });
      toast.success('Screen deleted');
    } catch (error) {
      console.error('Error deleting screen:', error);
      toast.error('Failed to delete screen');
    }
  };

  const openEditDialog = async (screen: any) => {
    setEditingScreen(screen);

    // Best-effort: infer current VIP rows from the existing seat layout
    let inferredVipRows = 0;
    try {
      const { data: vipSeats, error } = await supabase
        .from('seat_layouts')
        .select('row_label')
        .eq('screen_id', screen.id)
        .eq('seat_type', 'vip');

      if (error) throw error;

      const vipRowSet = new Set((vipSeats ?? []).map((s) => s.row_label));
      const rowLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').slice(0, screen.rows);

      for (let i = rowLabels.length - 1; i >= 0; i--) {
        if (vipRowSet.has(rowLabels[i])) inferredVipRows += 1;
        else break;
      }
    } catch {
      // ignore inference errors
    }

    reset({
      name: screen.name,
      rows: screen.rows,
      columns: screen.columns,
      vipRows: inferredVipRows,
    });

    setDialogOpen(true);
  };

  const openLayoutEditor = (screen: any) => {
    setSelectedScreen(screen);
    setLayoutDialogOpen(true);
  };

  const toggleSeatType = async (seat: any) => {
    const newType = seat.seat_type === 'standard' ? 'vip' : seat.seat_type === 'vip' ? 'unavailable' : 'standard';
    
    try {
      const { error } = await supabase
        .from('seat_layouts')
        .update({ 
          seat_type: newType,
          is_available: newType !== 'unavailable'
        })
        .eq('id', seat.id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['seat-layouts'] });
    } catch (error) {
      console.error('Error updating seat:', error);
    }
  };

  const getSeatColor = (seatType: string) => {
    switch (seatType) {
      case 'vip':
        return 'bg-primary text-primary-foreground';
      case 'unavailable':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Screen Management</h1>
            <p className="text-muted-foreground">
              Configure cinema halls and seating layouts
            </p>
          </div>

          <Button onClick={() => { setEditingScreen(null); reset({ name: '', rows: 10, columns: 12, vipRows: 2 }); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Screen
          </Button>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingScreen(null);
            }
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingScreen ? 'Edit Screen' : 'Add New Screen'}</DialogTitle>
                <DialogDescription>
                  Configure the screen name and seating dimensions
                </DialogDescription>
              </DialogHeader>

              <form key={editingScreen?.id || 'new'} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Screen Name *</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="Screen 1"
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rows">Rows (A-Z)</Label>
                    <Input
                      id="rows"
                      type="number"
                      {...register('rows')}
                      className={errors.rows ? 'border-destructive' : ''}
                    />
                    {errors.rows && <p className="text-sm text-destructive">{errors.rows.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="columns">Seats per Row</Label>
                    <Input
                      id="columns"
                      type="number"
                      {...register('columns')}
                      className={errors.columns ? 'border-destructive' : ''}
                    />
                    {errors.columns && <p className="text-sm text-destructive">{errors.columns.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vipRows">VIP Rows (back rows)</Label>
                    <Input
                      id="vipRows"
                      type="number"
                      {...register('vipRows')}
                      className={errors.vipRows ? 'border-destructive' : ''}
                    />
                    {errors.vipRows && <p className="text-sm text-destructive">{errors.vipRows.message}</p>}
                    <p className="text-xs text-muted-foreground">VIP rows are assigned from the back of the screen</p>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingScreen ? (
                    'Update Screen'
                  ) : (
                    'Create Screen'
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
              <CardTitle>Screens</CardTitle>
              <CardDescription>Your cinema halls and their seating capacity</CardDescription>
            </CardHeader>
            <CardContent>
              {screens && screens.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Screen</TableHead>
                      <TableHead>Dimensions</TableHead>
                      <TableHead>Total Seats</TableHead>
                      <TableHead className="w-[150px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {screens.map((screen) => (
                      <TableRow key={screen.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{screen.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {screen.rows} rows × {screen.columns} seats
                          </Badge>
                        </TableCell>
                        <TableCell>{screen.rows * screen.columns} seats</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openLayoutEditor(screen)}
                              title="Edit Layout"
                            >
                              <Grid3X3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(screen)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteScreen(screen.id)}
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
                  <Monitor className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No screens configured yet</p>
                  <Button className="mt-4" onClick={() => { setEditingScreen(null); reset({ name: '', rows: 10, columns: 12, vipRows: 2 }); setDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Screen
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Seat Layout Editor Dialog */}
        <Dialog open={layoutDialogOpen} onOpenChange={setLayoutDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Seat Layout: {selectedScreen?.name}</DialogTitle>
              <DialogDescription>
                Click seats to cycle: Standard → VIP → Unavailable
              </DialogDescription>
            </DialogHeader>

            <div className="flex gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-secondary" />
                <span className="text-sm">Standard</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-primary" />
                <span className="text-sm">VIP</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-muted" />
                <span className="text-sm">Unavailable</span>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-4 overflow-auto">
              <div className="text-center mb-4 py-2 bg-muted rounded text-sm text-muted-foreground">
                SCREEN
              </div>
              
              {selectedScreen && seatLayouts && (
                <div className="space-y-1">
                  {Array.from({ length: selectedScreen.rows }, (_, i) => {
                    const rowLabel = String.fromCharCode(65 + i);
                    const rowSeats = seatLayouts.filter(s => s.row_label === rowLabel).sort((a, b) => a.seat_number - b.seat_number);
                    
                    return (
                      <div key={rowLabel} className="flex items-center gap-1">
                        <span className="w-6 text-xs text-muted-foreground">{rowLabel}</span>
                        <div className="flex gap-1">
                          {rowSeats.map((seat) => (
                            <button
                              key={seat.id}
                              onClick={() => toggleSeatType(seat)}
                              className={`w-6 h-6 rounded text-xs font-medium transition-colors ${getSeatColor(seat.seat_type)}`}
                              title={`${seat.row_label}${seat.seat_number} - ${seat.seat_type}`}
                            >
                              {seat.seat_number}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
