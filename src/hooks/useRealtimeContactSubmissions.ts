import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseRealtimeContactSubmissionsOptions {
  enabled?: boolean;
  organizationId?: string;
}

export function useRealtimeContactSubmissions({
  enabled = true,
  organizationId,
}: UseRealtimeContactSubmissionsOptions = {}) {
  const queryClient = useQueryClient();
  const [newMessagesCount, setNewMessagesCount] = useState(0);

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

          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['contact-submissions'] });
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
          queryClient.invalidateQueries({ queryKey: ['contact-submissions'] });
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
          queryClient.invalidateQueries({ queryKey: ['contact-submissions'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, organizationId, queryClient]);

  const resetNewMessagesCount = () => setNewMessagesCount(0);

  return { newMessagesCount, resetNewMessagesCount };
}
