import { useEffect, useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseRealtimeSupportTicketsOptions {
  enabled?: boolean;
  organizationId?: string; // If provided, filter to this org only
  isPlatformAdmin?: boolean;
}

// Debounce helper to prevent rapid-fire invalidations
function useDebouncedInvalidate(queryClient: ReturnType<typeof useQueryClient>, delay = 2000) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingKeysRef = useRef<Set<string>>(new Set());

  const invalidate = useCallback((queryKey: string[]) => {
    pendingKeysRef.current.add(JSON.stringify(queryKey));
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      pendingKeysRef.current.forEach(key => {
        queryClient.invalidateQueries({ queryKey: JSON.parse(key) });
      });
      pendingKeysRef.current.clear();
    }, delay);
  }, [queryClient, delay]);

  return invalidate;
}

export function useRealtimeSupportTickets({
  enabled = true,
  organizationId,
  isPlatformAdmin = false,
}: UseRealtimeSupportTicketsOptions = {}) {
  const queryClient = useQueryClient();
  const [newTicketsCount, setNewTicketsCount] = useState(0);
  const debouncedInvalidate = useDebouncedInvalidate(queryClient);

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

          // Debounced invalidation to reduce rapid refetches
          debouncedInvalidate(['support-tickets']);
          debouncedInvalidate(['recent-tickets-platform']);
          debouncedInvalidate(['platform-stats']);
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
          debouncedInvalidate(['support-tickets']);
          debouncedInvalidate(['recent-tickets-platform']);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, organizationId, isPlatformAdmin, debouncedInvalidate]);

  const resetNewTicketsCount = () => setNewTicketsCount(0);

  return { newTicketsCount, resetNewTicketsCount };
}
