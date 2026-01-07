import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { History, TrendingUp, TrendingDown, Minus, Package, RefreshCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

interface InventoryHistoryProps {
  itemId: string;
  itemName: string;
}

export function InventoryHistory({ itemId, itemName }: InventoryHistoryProps) {
  const [open, setOpen] = useState(false);

  const { data: history, isLoading } = useQuery({
    queryKey: ['inventory-history', itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_history')
        .select('*')
        .eq('concession_item_id', itemId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const getChangeIcon = (changeType: string, changeAmount: number) => {
    if (changeType === 'restock' || changeAmount > 0) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (changeType === 'sale' || changeAmount < 0) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getChangeBadge = (changeType: string) => {
    switch (changeType) {
      case 'restock':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Restock</Badge>;
      case 'sale':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Sale</Badge>;
      case 'initial':
        return <Badge variant="outline">Initial</Badge>;
      default:
        return <Badge variant="secondary">Adjustment</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <History className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory History
          </DialogTitle>
          <DialogDescription>{itemName}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-muted rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : history && history.length > 0 ? (
            <div className="space-y-3">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border"
                >
                  <div className="mt-1">
                    {getChangeIcon(entry.change_type, entry.change_amount)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      {getChangeBadge(entry.change_type)}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.created_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">
                        {entry.previous_quantity ?? '—'}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-medium">{entry.new_quantity}</span>
                      <span className={`text-xs ${entry.change_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ({entry.change_amount >= 0 ? '+' : ''}{entry.change_amount})
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="mt-1 text-xs text-muted-foreground">{entry.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <RefreshCcw className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No history yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Stock changes will appear here
              </p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
