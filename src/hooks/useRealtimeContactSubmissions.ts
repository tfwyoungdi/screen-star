import { useEffect, useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseRealtimeContactSubmissionsOptions {
  enabled?: boolean;
  organizationId?: string;
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

export function useRealtimeContactSubmissions({
  enabled = true,
  organizationId,
}: UseRealtimeContactSubmissionsOptions = {}) {
  const queryClient = useQueryClient();
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const debouncedInvalidate = useDebouncedInvalidate(queryClient);

  useEffect(() => {
    if (!enabled || !organizationId) return;

    const channel = supabase
      .channel(`contact-submissions-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contact_submissions',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const newMessage = payload.new as {
            name: string;
            subject: string;
            email: string;
          };
          
          setNewMessagesCount((prev) => prev + 1);

          toast.info('New Contact Message', {
            description: `${newMessage.name}: ${newMessage.subject}`,
            duration: 5000,
            action: {
              label: 'View',
              onClick: () => window.location.href = '/messages',
            },
          });

          // Debounced invalidation to reduce rapid refetches
          debouncedInvalidate(['contact-submissions']);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'contact_submissions',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          debouncedInvalidate(['contact-submissions']);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'contact_submissions',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          debouncedInvalidate(['contact-submissions']);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, organizationId, debouncedInvalidate]);

  const resetNewMessagesCount = () => setNewMessagesCount(0);

  return { newMessagesCount, resetNewMessagesCount };
}
