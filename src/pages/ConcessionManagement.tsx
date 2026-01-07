import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus, Pencil, Trash2, Coffee, Popcorn, IceCream, Cookie, BarChart3, Package, AlertTriangle, Upload, X, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ConcessionAnalytics } from '@/components/concessions/ConcessionAnalytics';
import { ComboDealsManager } from '@/components/concessions/ComboDealsManager';
import { InventoryHistory } from '@/components/concessions/InventoryHistory';
import { BulkRestockDialog } from '@/components/concessions/BulkRestockDialog';
import { LowStockAlertSettings } from '@/components/concessions/LowStockAlertSettings';

const itemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  price: z.coerce.number().min(0.01, 'Price must be greater than 0'),
  category: z.string().min(1, 'Category is required'),
  image_url: z.string().optional(),
  track_inventory: z.boolean().optional(),
  stock_quantity: z.coerce.number().optional(),
  low_stock_threshold: z.coerce.number().optional(),
});

type ItemFormData = z.infer<typeof itemSchema>;

const CATEGORIES = [
  { value: 'popcorn', label: 'Popcorn', icon: Popcorn },
  { value: 'drinks', label: 'Drinks', icon: Coffee },
  { value: 'snacks', label: 'Snacks', icon: Cookie },
  { value: 'candy', label: 'Candy', icon: IceCream },
  { value: 'combos', label: 'Combos', icon: Popcorn },
];

export default function ConcessionManagement() {
  const { data: profile } = useUserProfile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      category: 'snacks',
      track_inventory: false,
      low_stock_threshold: 10,
    },
  });

  const trackInventory = watch('track_inventory');

  const { data: items, isLoading } = useQuery({
    queryKey: ['concession-items', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('concession_items')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.organization_id) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.organization_id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('concession-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('concession-images')
        .getPublicUrl(fileName);

      setValue('image_url', publicUrl);
      setImagePreview(publicUrl);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const clearImage = () => {
    setValue('image_url', '');
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (data: ItemFormData) => {
    if (!profile?.organization_id) return;

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('concession_items')
          .update({
            name: data.name,
            description: data.description || null,
            price: data.price,
            category: data.category,
            image_url: data.image_url || null,
            track_inventory: data.track_inventory || false,
            stock_quantity: data.track_inventory ? (data.stock_quantity || 0) : null,
            low_stock_threshold: data.low_stock_threshold || 10,
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('Item updated successfully');
      } else {
        const { error } = await supabase
          .from('concession_items')
          .insert({
            organization_id: profile.organization_id,
            name: data.name,
            description: data.description || null,
            price: data.price,
            category: data.category,
            image_url: data.image_url || null,
            track_inventory: data.track_inventory || false,
            stock_quantity: data.track_inventory ? (data.stock_quantity || 0) : null,
            low_stock_threshold: data.low_stock_threshold || 10,
          });

        if (error) throw error;
        toast.success('Item added successfully');
      }

      queryClient.invalidateQueries({ queryKey: ['concession-items'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-items'] });
      reset();
      setEditingItem(null);
      setImagePreview(null);
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Failed to save item');
    }
  };

  const toggleAvailability = async (item: any) => {
    try {
      const { error } = await supabase
        .from('concession_items')
        .update({ is_available: !item.is_available })
        .eq('id', item.id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['concession-items'] });
      toast.success(item.is_available ? 'Item marked as unavailable' : 'Item marked as available');
    } catch (error) {
      console.error('Error toggling availability:', error);
      toast.error('Failed to update item');
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('concession_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['concession-items'] });
      toast.success('Item deleted');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const openEditDialog = (item: any) => {
    setEditingItem(item);
    setImagePreview(item.image_url || null);
    reset({
      name: item.name,
      description: item.description || '',
      price: item.price,
      category: item.category,
      image_url: item.image_url || '',
      track_inventory: item.track_inventory || false,
      stock_quantity: item.stock_quantity || 0,
      low_stock_threshold: item.low_stock_threshold || 10,
    });
    setDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingItem(null);
    setImagePreview(null);
    reset({
      name: '',
      description: '',
      price: 0,
      category: 'snacks',
      image_url: '',
      track_inventory: false,
      stock_quantity: 0,
      low_stock_threshold: 10,
    });
    setDialogOpen(true);
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat?.icon || Cookie;
  };

  const getCategoryLabel = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat?.label || category;
  };

  // Group items by category
  const groupedItems = items?.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Concessions</h1>
          <p className="text-muted-foreground">
            Manage menu items, combo deals, and view sales analytics
          </p>
        </div>

        <Tabs defaultValue="menu" className="space-y-6">
          <TabsList>
            <TabsTrigger value="menu" className="flex items-center gap-2">
              <Popcorn className="h-4 w-4" />
              Menu Items
            </TabsTrigger>
            <TabsTrigger value="combos" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Combo Deals
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Alerts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="menu" className="space-y-6">
            <div className="flex justify-end gap-2">
              {profile?.organization_id && items && (
                <BulkRestockDialog 
                  items={items} 
                  organizationId={profile.organization_id} 
                />
              )}
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openAddDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
                <DialogDescription>
                  {editingItem ? 'Update the item details' : 'Add a new concession item to your menu'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input {...register('name')} placeholder="Large Popcorn" />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea {...register('description')} placeholder="Freshly popped buttery goodness" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Price *</Label>
                    <Input type="number" step="0.01" {...register('price')} placeholder="5.99" />
                    {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select 
                      defaultValue={editingItem?.category || 'snacks'} 
                      onValueChange={(value) => setValue('category', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <div className="flex items-center gap-2">
                              <cat.icon className="h-4 w-4" />
                              {cat.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Image Upload */}
                <div className="space-y-2">
                  <Label>Item Image</Label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  
                  {imagePreview ? (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden border bg-muted">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={clearImage}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      {uploadingImage ? (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Upload className="h-6 w-6 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Click to upload image</span>
                        </>
                      )}
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground">Or enter URL:</div>
                  <Input {...register('image_url')} placeholder="https://..." onChange={(e) => {
                    setValue('image_url', e.target.value);
                    if (e.target.value) setImagePreview(e.target.value);
                  }} />
                </div>

                {/* Inventory Tracking */}
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Track Inventory</Label>
                      <p className="text-xs text-muted-foreground">Enable to monitor stock levels</p>
                    </div>
                    <Switch
                      checked={trackInventory}
                      onCheckedChange={(checked) => setValue('track_inventory', checked)}
                    />
                  </div>

                  {trackInventory && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Current Stock</Label>
                        <Input type="number" {...register('stock_quantity')} placeholder="0" />
                      </div>
                      <div className="space-y-2">
                        <Label>Low Stock Alert</Label>
                        <Input type="number" {...register('low_stock_threshold')} placeholder="10" />
                      </div>
                    </div>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingItem ? (
                    'Update Item'
                  ) : (
                    'Add Item'
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
        ) : items && items.length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedItems || {}).map(([category, categoryItems]) => {
              const CategoryIcon = getCategoryIcon(category);
              return (
                <Card key={category}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CategoryIcon className="h-5 w-5 text-primary" />
                      {getCategoryLabel(category)}
                    </CardTitle>
                    <CardDescription>{categoryItems?.length} item(s)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead>Available</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryItems?.map((item) => {
                          const isLowStock = item.track_inventory && item.stock_quantity !== null && item.stock_quantity <= item.low_stock_threshold;
                          const isOutOfStock = item.track_inventory && item.stock_quantity !== null && item.stock_quantity === 0;
                          return (
                          <TableRow key={item.id} className={isOutOfStock ? 'opacity-60' : ''}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {item.image_url ? (
                                  <img 
                                    src={item.image_url} 
                                    alt={item.name}
                                    className="w-10 h-10 rounded object-cover"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                    <CategoryIcon className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                                <span className="font-medium">{item.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-[200px] truncate">
                              {item.description || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">${item.price.toFixed(2)}</Badge>
                            </TableCell>
                            <TableCell>
                              {item.track_inventory ? (
                                <div className="flex items-center gap-2">
                                  {isOutOfStock ? (
                                    <Badge variant="destructive">Out of Stock</Badge>
                                  ) : isLowStock ? (
                                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Low: {item.stock_quantity}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline">{item.stock_quantity} in stock</Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">Not tracked</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={item.is_available}
                                onCheckedChange={() => toggleAvailability(item)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {item.track_inventory && (
                                  <InventoryHistory itemId={item.id} itemName={item.name} />
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDialog(item)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteItem(item.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })}
          </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Popcorn className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No concession items yet</p>
                  <Button onClick={openAddDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Item
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="combos">
            {profile?.organization_id && (
              <ComboDealsManager organizationId={profile.organization_id} />
            )}
          </TabsContent>

          <TabsContent value="analytics">
            {profile?.organization_id && (
              <ConcessionAnalytics organizationId={profile.organization_id} />
            )}
          </TabsContent>

          <TabsContent value="alerts">
            {profile?.organization_id && (
              <LowStockAlertSettings organizationId={profile.organization_id} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
