import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Package, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface LowStockWidgetProps {
  organizationId?: string;
}

export function LowStockWidget({ organizationId }: LowStockWidgetProps) {
  const navigate = useNavigate();

  const { data: lowStockItems, isLoading } = useQuery({
    queryKey: ['low-stock-items', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('concession_items')
        .select('id, name, stock_quantity, low_stock_threshold, category')
        .eq('organization_id', organizationId)
        .eq('track_inventory', true)
        .not('stock_quantity', 'is', null)
        .order('stock_quantity', { ascending: true });

      if (error) throw error;
      
      // Filter items that are at or below their threshold
      return data?.filter(item => 
        item.stock_quantity !== null && 
        item.low_stock_threshold !== null && 
        item.stock_quantity <= item.low_stock_threshold
      ) || [];
    },
    enabled: !!organizationId,
  });

  const outOfStockCount = lowStockItems?.filter(item => item.stock_quantity === 0).length || 0;
  const lowStockCount = (lowStockItems?.length || 0) - outOfStockCount;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Inventory Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasAlerts = (lowStockItems?.length || 0) > 0;

  return (
    <Card className={hasAlerts ? 'border-amber-500/50' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {hasAlerts ? (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            ) : (
              <Package className="h-4 w-4 text-muted-foreground" />
            )}
            Inventory Alerts
          </CardTitle>
          {hasAlerts && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              {lowStockItems?.length} items
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {hasAlerts ? (
          <div className="space-y-3">
            {/* Summary */}
            <div className="flex gap-3 text-sm">
              {outOfStockCount > 0 && (
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-destructive"></span>
                  <span className="text-muted-foreground">{outOfStockCount} out of stock</span>
                </div>
              )}
              {lowStockCount > 0 && (
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="text-muted-foreground">{lowStockCount} low stock</span>
                </div>
              )}
            </div>

            {/* Items list */}
            <div className="space-y-2 max-h-[140px] overflow-y-auto">
              {lowStockItems?.slice(0, 5).map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between text-sm py-1.5 px-2 rounded-md bg-muted/50"
                >
                  <span className="font-medium truncate flex-1">{item.name}</span>
                  <Badge 
                    variant={item.stock_quantity === 0 ? 'destructive' : 'secondary'}
                    className={item.stock_quantity !== 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' : ''}
                  >
                    {item.stock_quantity === 0 ? 'Out' : item.stock_quantity}
                  </Badge>
                </div>
              ))}
            </div>

            {(lowStockItems?.length || 0) > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                +{lowStockItems!.length - 5} more items
              </p>
            )}

            <Button 
              variant="outline" 
              size="sm" 
              className="w-full" 
              onClick={() => navigate('/concessions')}
            >
              Manage Inventory
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        ) : (
          <div className="py-4 text-center">
            <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">All items well stocked</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
