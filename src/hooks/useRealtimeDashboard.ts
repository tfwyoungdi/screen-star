import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

interface UseRealtimeBookingsOptions {
  organizationId: string | undefined;
  enabled?: boolean;
}

export function useRealtimeBookings({ organizationId, enabled = true }: UseRealtimeBookingsOptions) {
  const queryClient = useQueryClient();
  const [newBookingsCount, setNewBookingsCount] = useState(0);

  const resetNewBookingsCount = useCallback(() => {
    setNewBookingsCount(0);
  }, []);

  useEffect(() => {
    if (!organizationId || !enabled) return;

    const channel = supabase
      .channel('dashboard-bookings')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          console.log('New booking received:', payload);
          
          // Update the new bookings count
          setNewBookingsCount((prev) => prev + 1);

          // Show a toast notification
          const booking = payload.new as any;
          toast({
            title: '🎟️ New Booking!',
            description: `${booking.customer_name} just booked tickets`,
          });

          // Invalidate relevant queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['dashboard-bookings'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-seats'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          console.log('Booking updated:', payload);
          
          const booking = payload.new as any;
          if (booking.status === 'paid') {
            toast({
              title: '💰 Payment Confirmed!',
              description: `Booking ${booking.booking_reference} is now paid`,
            });
          }

          // Invalidate relevant queries
          queryClient.invalidateQueries({ queryKey: ['dashboard-bookings'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, enabled, queryClient]);

  return { newBookingsCount, resetNewBookingsCount };
}

export function useRealtimeShowtimes({ organizationId, enabled = true }: UseRealtimeBookingsOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!organizationId || !enabled) return;

    const channel = supabase
      .channel('dashboard-showtimes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'showtimes',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          console.log('Showtime change:', payload);
          queryClient.invalidateQueries({ queryKey: ['dashboard-showtimes'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, enabled, queryClient]);
}

export function useRealtimeMovies({ organizationId, enabled = true }: UseRealtimeBookingsOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!organizationId || !enabled) return;

    const channel = supabase
      .channel('dashboard-movies')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'movies',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          console.log('Movie change:', payload);
          queryClient.invalidateQueries({ queryKey: ['dashboard-movies'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, enabled, queryClient]);
}
