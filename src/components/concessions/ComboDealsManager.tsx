import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus, Pencil, Trash2, Package, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const comboSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  combo_price: z.coerce.number().min(0.01, 'Price must be greater than 0'),
});

type ComboFormData = z.infer<typeof comboSchema>;

interface ComboItem {
  concession_item_id: string;
  quantity: number;
}

interface ComboDealsManagerProps {
  organizationId: string;
}

export function ComboDealsManager({ organizationId }: ComboDealsManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<any | null>(null);
  const [comboItems, setComboItems] = useState<ComboItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ComboFormData>({
    resolver: zodResolver(comboSchema),
  });

  // Fetch concession items
  const { data: items } = useQuery({
    queryKey: ['concession-items', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('concession_items')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_available', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Fetch combo deals
  const { data: combos, isLoading } = useQuery({
    queryKey: ['combo-deals', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('combo_deals')
        .select(`
          *,
          combo_deal_items (
            id,
            quantity,
            concession_item_id,
            concession_items (name, price)
          )
        `)
        .eq('organization_id', organizationId)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const calculateOriginalPrice = () => {
    return comboItems.reduce((sum, ci) => {
      const item = items?.find(i => i.id === ci.concession_item_id);
      return sum + (item?.price || 0) * ci.quantity;
    }, 0);
  };

  const addItemToCombo = () => {
    if (!selectedItemId) return;
    setComboItems(prev => {
      const existing = prev.find(i => i.concession_item_id === selectedItemId);
      if (existing) {
        return prev.map(i =>
          i.concession_item_id === selectedItemId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { concession_item_id: selectedItemId, quantity: 1 }];
    });
    setSelectedItemId('');
  };

  const removeItemFromCombo = (itemId: string) => {
    setComboItems(prev => prev.filter(i => i.concession_item_id !== itemId));
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) {
      removeItemFromCombo(itemId);
      return;
    }
    setComboItems(prev =>
      prev.map(i => (i.concession_item_id === itemId ? { ...i, quantity } : i))
    );
  };

  const onSubmit = async (data: ComboFormData) => {
    if (comboItems.length < 2) {
      toast.error('A combo must have at least 2 items');
      return;
    }

    try {
      const originalPrice = calculateOriginalPrice();

      if (editingCombo) {
        // Update combo
        const { error: updateError } = await supabase
          .from('combo_deals')
          .update({
            name: data.name,
            description: data.description || null,
            original_price: originalPrice,
            combo_price: data.combo_price,
          })
          .eq('id', editingCombo.id);

        if (updateError) throw updateError;

        // Delete old items and insert new ones
        await supabase
          .from('combo_deal_items')
          .delete()
          .eq('combo_deal_id', editingCombo.id);

        const { error: itemsError } = await supabase
          .from('combo_deal_items')
          .insert(
            comboItems.map(ci => ({
              combo_deal_id: editingCombo.id,
              concession_item_id: ci.concession_item_id,
              quantity: ci.quantity,
            }))
          );

        if (itemsError) throw itemsError;
        toast.success('Combo updated successfully');
      } else {
        // Create combo
        const { data: combo, error: createError } = await supabase
          .from('combo_deals')
          .insert({
            organization_id: organizationId,
            name: data.name,
            description: data.description || null,
            original_price: originalPrice,
            combo_price: data.combo_price,
          })
          .select()
          .single();

        if (createError) throw createError;

        const { error: itemsError } = await supabase
          .from('combo_deal_items')
          .insert(
            comboItems.map(ci => ({
              combo_deal_id: combo.id,
              concession_item_id: ci.concession_item_id,
              quantity: ci.quantity,
            }))
          );

        if (itemsError) throw itemsError;
        toast.success('Combo created successfully');
      }

      queryClient.invalidateQueries({ queryKey: ['combo-deals'] });
      closeDialog();
    } catch (error) {
      console.error('Error saving combo:', error);
      toast.error('Failed to save combo');
    }
  };

  const toggleComboActive = async (combo: any) => {
    try {
      const { error } = await supabase
        .from('combo_deals')
        .update({ is_active: !combo.is_active })
        .eq('id', combo.id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['combo-deals'] });
      toast.success(combo.is_active ? 'Combo deactivated' : 'Combo activated');
    } catch (error) {
      console.error('Error toggling combo:', error);
      toast.error('Failed to update combo');
    }
  };

  const deleteCombo = async (id: string) => {
    try {
      const { error } = await supabase.from('combo_deals').delete().eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['combo-deals'] });
      toast.success('Combo deleted');
    } catch (error) {
      console.error('Error deleting combo:', error);
      toast.error('Failed to delete combo');
    }
  };

  const openEditDialog = (combo: any) => {
    setEditingCombo(combo);
    setComboItems(
      combo.combo_deal_items.map((ci: any) => ({
        concession_item_id: ci.concession_item_id,
        quantity: ci.quantity,
      }))
    );
    reset({
      name: combo.name,
      description: combo.description || '',
      combo_price: combo.combo_price,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCombo(null);
    setComboItems([]);
    reset({ name: '', description: '', combo_price: 0 });
  };

  const openAddDialog = () => {
    setEditingCombo(null);
    setComboItems([]);
    reset({ name: '', description: '', combo_price: 0 });
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Create Combo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingCombo ? 'Edit Combo' : 'Create Combo Deal'}</DialogTitle>
              <DialogDescription>
                Bundle items together at a discounted price
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Combo Name *</Label>
                <Input {...register('name')} placeholder="Movie Night Bundle" />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea {...register('description')} placeholder="Large popcorn + 2 drinks" />
              </div>

              <div className="space-y-2">
                <Label>Items in Combo</Label>
                <div className="flex gap-2">
                  <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select item to add" />
                    </SelectTrigger>
                    <SelectContent>
                      {items?.map(item => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} (${item.price.toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" onClick={addItemToCombo}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {comboItems.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {comboItems.map(ci => {
                      const item = items?.find(i => i.id === ci.concession_item_id);
                      return (
                        <div key={ci.concession_item_id} className="flex items-center justify-between bg-muted p-2 rounded">
                          <span className="text-sm">{item?.name}</span>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={1}
                              value={ci.quantity}
                              onChange={e => updateItemQuantity(ci.concession_item_id, parseInt(e.target.value) || 1)}
                              className="w-16 h-8"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItemFromCombo(ci.concession_item_id)}
                              className="h-8 w-8"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    <div className="text-sm text-muted-foreground pt-2">
                      Original value: <span className="font-medium">${calculateOriginalPrice().toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Combo Price *</Label>
                <Input type="number" step="0.01" {...register('combo_price')} placeholder="12.99" />
                {errors.combo_price && <p className="text-sm text-destructive">{errors.combo_price.message}</p>}
                {comboItems.length >= 2 && (
                  <p className="text-xs text-primary">
                    Savings: ${(calculateOriginalPrice() - (parseFloat(register('combo_price').name) || 0)).toFixed(2)}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting || comboItems.length < 2}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingCombo ? (
                  'Update Combo'
                ) : (
                  'Create Combo'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {combos && combos.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Combo Deals</CardTitle>
            <CardDescription>{combos.length} combo(s) available</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Combo</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Original</TableHead>
                  <TableHead>Combo Price</TableHead>
                  <TableHead>Savings</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {combos.map(combo => (
                  <TableRow key={combo.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        <div>
                          <div className="font-medium">{combo.name}</div>
                          {combo.description && (
                            <div className="text-xs text-muted-foreground">{combo.description}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {combo.combo_deal_items?.map((ci: any) => (
                          <Badge key={ci.id} variant="secondary" className="text-xs">
                            {ci.quantity}x {ci.concession_items?.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground line-through">
                      ${combo.original_price.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-semibold">
                        ${combo.combo_price.toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                        Save ${(combo.original_price - combo.combo_price).toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={combo.is_active}
                        onCheckedChange={() => toggleComboActive(combo)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(combo)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteCombo(combo.id)}
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
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No combo deals yet</p>
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Combo
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}