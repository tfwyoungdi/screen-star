import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseRealtimeSupportTicketsOptions {
  enabled?: boolean;
  organizationId?: string; // If provided, filter to this org only
  isPlatformAdmin?: boolean;
}

export function useRealtimeSupportTickets({
  enabled = true,
  organizationId,
  isPlatformAdmin = false,
}: UseRealtimeSupportTicketsOptions = {}) {
  const queryClient = useQueryClient();
  const [newTicketsCount, setNewTicketsCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    const channelName = isPlatformAdmin
      ? 'platform-support-tickets'
      : `support-tickets-${organizationId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_tickets',
          ...(organizationId && !isPlatformAdmin
            ? { filter: `organization_id=eq.${organizationId}` }
            : {}),
        },
        (payload) => {
          const newTicket = payload.new as any;
          setNewTicketsCount((prev) => prev + 1);

          toast.info('New Support Ticket', {
            description: `${newTicket.subject} (${newTicket.priority} priority)`,
            duration: 5000,
          });

          // Invalidate relevant queries
          queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
          queryClient.invalidateQueries({ queryKey: ['recent-tickets-platform'] });
          queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
          ...(organizationId && !isPlatformAdmin
            ? { filter: `organization_id=eq.${organizationId}` }
            : {}),
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
          queryClient.invalidateQueries({ queryKey: ['recent-tickets-platform'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, organizationId, isPlatformAdmin, queryClient]);

  const resetNewTicketsCount = () => setNewTicketsCount(0);

  return { newTicketsCount, resetNewTicketsCount };
}
