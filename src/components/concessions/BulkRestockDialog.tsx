import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Package, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConcessionItem {
  id: string;
  name: string;
  category: string;
  stock_quantity: number | null;
  track_inventory: boolean | null;
}

interface BulkRestockDialogProps {
  items: ConcessionItem[];
  organizationId: string;
}

export function BulkRestockDialog({ items, organizationId }: BulkRestockDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Filter only items with inventory tracking enabled
  const trackableItems = items.filter(item => item.track_inventory);

  const toggleItem = (itemId: string, currentStock: number) => {
    setSelectedItems(prev => {
      if (prev[itemId] !== undefined) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: currentStock };
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: Math.max(0, quantity),
    }));
  };

  const selectAll = () => {
    const newSelected: Record<string, number> = {};
    trackableItems.forEach(item => {
      newSelected[item.id] = (item.stock_quantity || 0) + 10; // Default add 10
    });
    setSelectedItems(newSelected);
  };

  const clearSelection = () => {
    setSelectedItems({});
  };

  const handleSubmit = async () => {
    const updates = Object.entries(selectedItems);
    if (updates.length === 0) {
      toast.error('Please select items to restock');
      return;
    }

    setIsSubmitting(true);
    try {
      // Update each item's stock quantity
      for (const [itemId, newQuantity] of updates) {
        const { error } = await supabase
          .from('concession_items')
          .update({ stock_quantity: newQuantity })
          .eq('id', itemId);

        if (error) throw error;
      }

      toast.success(`${updates.length} item(s) restocked successfully`);
      queryClient.invalidateQueries({ queryKey: ['concession-items'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-history'] });
      setSelectedItems({});
      setOpen(false);
    } catch (error) {
      console.error('Error restocking items:', error);
      toast.error('Failed to restock items');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCount = Object.keys(selectedItems).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Package className="h-4 w-4" />
          Bulk Restock
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Restock</DialogTitle>
          <DialogDescription>
            Update stock levels for multiple items at once
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </div>
          {selectedCount > 0 && (
            <Badge variant="secondary">{selectedCount} selected</Badge>
          )}
        </div>

        <ScrollArea className="h-[300px] pr-4">
          {trackableItems.length > 0 ? (
            <div className="space-y-2">
              {trackableItems.map((item) => {
                const isSelected = selectedItems[item.id] !== undefined;
                const currentStock = item.stock_quantity || 0;
                
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isSelected ? 'bg-primary/5 border-primary/30' : 'bg-muted/30'
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleItem(item.id, currentStock)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Current: {currentStock}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">New:</Label>
                        <Input
                          type="number"
                          className="w-20 h-8"
                          value={selectedItems[item.id]}
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                          min={0}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No items with inventory tracking</p>
              <p className="text-xs text-muted-foreground mt-1">
                Enable inventory tracking on items first
              </p>
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={selectedCount === 0 || isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Restock {selectedCount > 0 ? `(${selectedCount})` : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
