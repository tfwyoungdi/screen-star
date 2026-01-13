import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInHours } from 'date-fns';

export function useSLABreachNotification() {
  const notifiedTickets = useRef<Set<string>>(new Set());

  // Fetch SLA settings
  const { data: slaSettings } = useQuery({
    queryKey: ['sla-settings-for-breach-check'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('sla_response_time_low, sla_response_time_medium, sla_response_time_high, sla_response_time_urgent, sla_escalation_enabled, sla_escalation_email')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data ? {
        low: (data as any).sla_response_time_low || 72,
        medium: (data as any).sla_response_time_medium || 24,
        high: (data as any).sla_response_time_high || 8,
        urgent: (data as any).sla_response_time_urgent || 2,
        escalationEnabled: (data as any).sla_escalation_enabled || false,
        escalationEmail: (data as any).sla_escalation_email || null,
      } : null;
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch open tickets
  const { data: openTickets } = useQuery({
    queryKey: ['open-tickets-for-breach-check'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          id,
          subject,
          priority,
          created_at,
          first_response_at,
          status,
          sla_breached,
          organizations (name)
        `)
        .in('status', ['open', 'in_progress'])
        .is('first_response_at', null);

      if (error) throw error;
      return data;
    },
    refetchInterval: 60000, // Check every minute
    enabled: slaSettings?.escalationEnabled && !!slaSettings?.escalationEmail,
  });

  useEffect(() => {
    if (!slaSettings?.escalationEnabled || !slaSettings?.escalationEmail || !openTickets) {
      return;
    }

    const checkAndNotify = async () => {
      const now = new Date();

      for (const ticket of openTickets) {
        // Skip if already notified
        if (notifiedTickets.current.has(ticket.id)) continue;

        const createdAt = new Date(ticket.created_at);
        const hoursElapsed = differenceInHours(now, createdAt);

        // Get target hours based on priority
        const targetHours = {
          urgent: slaSettings.urgent,
          high: slaSettings.high,
          medium: slaSettings.medium,
          low: slaSettings.low,
        }[ticket.priority] || 24;

        // Check if SLA is breached
        if (hoursElapsed > targetHours) {
          // Mark ticket as breached in DB
          await supabase
            .from('support_tickets')
            .update({ sla_breached: true })
            .eq('id', ticket.id);

          // Send escalation email
          try {
            await supabase.functions.invoke('send-sla-escalation', {
              body: {
                ticketId: ticket.id,
                ticketSubject: ticket.subject,
                cinemaName: (ticket.organizations as any)?.name || 'Unknown Cinema',
                priority: ticket.priority,
                createdAt: ticket.created_at,
                escalationEmail: slaSettings.escalationEmail,
                hoursOverdue: hoursElapsed - targetHours,
              },
            });

            console.log(`SLA escalation sent for ticket ${ticket.id}`);
          } catch (error) {
            console.error('Failed to send SLA escalation:', error);
          }

          // Mark as notified to prevent duplicate emails
          notifiedTickets.current.add(ticket.id);
        }
      }
    };

    checkAndNotify();
  }, [openTickets, slaSettings]);
}
