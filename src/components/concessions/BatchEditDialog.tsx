import { useState } from 'react';
import { Loader2, DollarSign, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'popcorn', label: 'Popcorn' },
  { value: 'drinks', label: 'Drinks' },
  { value: 'snacks', label: 'Snacks' },
  { value: 'candy', label: 'Candy' },
  { value: 'combos', label: 'Combos' },
];

interface BatchEditDialogProps {
  open: boolean;
  onClose: () => void;
  selectedItems: any[];
  organizationId: string;
}

export function BatchEditDialog({
  open,
  onClose,
  selectedItems,
  organizationId,
}: BatchEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editType, setEditType] = useState<'price' | 'category'>('price');
  const [priceAction, setPriceAction] = useState<'set' | 'increase' | 'decrease'>('set');
  const [priceValue, setPriceValue] = useState('');
  const [pricePercent, setPricePercent] = useState('');
  const [category, setCategory] = useState('');
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (selectedItems.length === 0) return;

    setIsSubmitting(true);
    try {
      if (editType === 'price') {
        const value = parseFloat(priceValue);
        const percent = parseFloat(pricePercent);

        if (priceAction === 'set' && (isNaN(value) || value < 0)) {
          toast.error('Please enter a valid price');
          setIsSubmitting(false);
          return;
        }

        if ((priceAction === 'increase' || priceAction === 'decrease') && (isNaN(percent) || percent <= 0)) {
          toast.error('Please enter a valid percentage');
          setIsSubmitting(false);
          return;
        }

        await Promise.all(
          selectedItems.map((item) => {
            let newPrice = item.price;
            if (priceAction === 'set') {
              newPrice = value;
            } else if (priceAction === 'increase') {
              newPrice = item.price * (1 + percent / 100);
            } else if (priceAction === 'decrease') {
              newPrice = Math.max(0.01, item.price * (1 - percent / 100));
            }
            return supabase
              .from('concession_items')
              .update({ price: Math.round(newPrice * 100) / 100 })
              .eq('id', item.id);
          })
        );

        toast.success(`Updated prices for ${selectedItems.length} item(s)`);
      } else if (editType === 'category') {
        if (!category) {
          toast.error('Please select a category');
          setIsSubmitting(false);
          return;
        }

        await supabase
          .from('concession_items')
          .update({ category })
          .in('id', selectedItems.map((item) => item.id));

        toast.success(`Updated category for ${selectedItems.length} item(s)`);
      }

      queryClient.invalidateQueries({ queryKey: ['concession-items'] });
      onClose();
    } catch (error) {
      console.error('Error batch updating items:', error);
      toast.error('Failed to update items');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditType('price');
    setPriceAction('set');
    setPriceValue('');
    setPricePercent('');
    setCategory('');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          resetForm();
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Batch Edit {selectedItems.length} Item(s)</DialogTitle>
          <DialogDescription>
            Update prices or categories for all selected items at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>What would you like to update?</Label>
            <RadioGroup
              value={editType}
              onValueChange={(value) => setEditType(value as 'price' | 'category')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="price" id="price" />
                <Label htmlFor="price" className="flex items-center gap-1.5 cursor-pointer">
                  <DollarSign className="h-4 w-4" />
                  Price
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="category" id="category" />
                <Label htmlFor="category" className="flex items-center gap-1.5 cursor-pointer">
                  <Tag className="h-4 w-4" />
                  Category
                </Label>
              </div>
            </RadioGroup>
          </div>

          {editType === 'price' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <Label>Price Action</Label>
                <RadioGroup
                  value={priceAction}
                  onValueChange={(value) => setPriceAction(value as 'set' | 'increase' | 'decrease')}
                  className="flex flex-col gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="set" id="set" />
                    <Label htmlFor="set" className="cursor-pointer">Set a fixed price</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="increase" id="increase" />
                    <Label htmlFor="increase" className="cursor-pointer">Increase by percentage</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="decrease" id="decrease" />
                    <Label htmlFor="decrease" className="cursor-pointer">Decrease by percentage</Label>
                  </div>
                </RadioGroup>
              </div>

              {priceAction === 'set' ? (
                <div className="space-y-2">
                  <Label>New Price</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={priceValue}
                      onChange={(e) => setPriceValue(e.target.value)}
                      placeholder="0.00"
                      className="pl-7"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>{priceAction === 'increase' ? 'Increase' : 'Decrease'} by (%)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      max="100"
                      value={pricePercent}
                      onChange={(e) => setPricePercent(e.target.value)}
                      placeholder="10"
                      className="pr-7"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {editType === 'category' && (
            <div className="space-y-2">
              <Label>New Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              `Update ${selectedItems.length} Item(s)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
