import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Mail, CheckCircle, Clock, AlertTriangle, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface LowStockAlertSettingsProps {
  organizationId?: string;
}

export function LowStockAlertSettings({ organizationId }: LowStockAlertSettingsProps) {
  const queryClient = useQueryClient();
  const [isSending, setIsSending] = useState(false);

  // Fetch notification history
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['low-stock-notifications', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('low_stock_notifications')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch current low stock items
  const { data: lowStockItems } = useQuery({
    queryKey: ['current-low-stock', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('concession_items')
        .select('id, name, stock_quantity, low_stock_threshold')
        .eq('organization_id', organizationId)
        .eq('track_inventory', true)
        .not('stock_quantity', 'is', null)
        .not('low_stock_threshold', 'is', null);

      if (error) throw error;
      return data?.filter(item => 
        item.stock_quantity !== null && 
        item.low_stock_threshold !== null && 
        item.stock_quantity <= item.low_stock_threshold
      ) || [];
    },
    enabled: !!organizationId,
  });

  // Fetch organization email
  const { data: organization } = useQuery({
    queryKey: ['organization-email', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('contact_email, name')
        .eq('id', organizationId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Manual send notification
  const handleManualSend = async () => {
    if (!organizationId || !lowStockItems?.length) return;
    
    if (!organization?.contact_email) {
      toast.error('No contact email configured. Please update your cinema settings.');
      return;
    }

    setIsSending(true);
    try {
      // Insert a notification record - the trigger will automatically call the edge function
      const { error } = await supabase
        .from('low_stock_notifications')
        .insert({
          organization_id: organizationId,
          items: lowStockItems,
          notified_email: organization.contact_email,
        });

      if (error) throw error;
      
      toast.success('Low stock alert sent successfully!');
      queryClient.invalidateQueries({ queryKey: ['low-stock-notifications'] });
    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  const parseItems = (items: unknown): { name: string; stock_quantity: number }[] => {
    if (Array.isArray(items)) {
      return items as { name: string; stock_quantity: number }[];
    }
    return [];
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5" />
          Low Stock Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            {lowStockItems && lowStockItems.length > 0 ? (
              <>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">
                  {lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} below threshold
                </span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">All items well stocked</span>
              </>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleManualSend}
            disabled={isSending || !lowStockItems?.length}
          >
            <Send className="h-4 w-4 mr-2" />
            {isSending ? 'Sending...' : 'Send Alert Now'}
          </Button>
        </div>

        {/* Notification Email */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-4 w-4" />
          <span>
            Alerts sent to: {organization?.contact_email || (
              <span className="text-amber-500">No email configured</span>
            )}
          </span>
        </div>

        {/* Notification History */}
        <div>
          <h4 className="text-sm font-medium mb-2">Recent Notifications</h4>
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-12 bg-muted rounded"></div>
              <div className="h-12 bg-muted rounded"></div>
            </div>
          ) : notifications && notifications.length > 0 ? (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {notifications.map((notification) => {
                  const items = parseItems(notification.items);
                  return (
                    <div
                      key={notification.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {items.length} item{items.length !== 1 ? 's' : ''} alerted
                          </span>
                          {notification.sent_at ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Sent
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(notification.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications sent yet</p>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Alerts are automatically sent when stock drops below threshold after a sale.
        </p>
      </CardContent>
    </Card>
  );
}
