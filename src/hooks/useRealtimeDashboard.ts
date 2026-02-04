import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

interface UseRealtimeBookingsOptions {
  organizationId: string | undefined;
  enabled?: boolean;
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

export function useRealtimeBookings({ organizationId, enabled = true }: UseRealtimeBookingsOptions) {
  const queryClient = useQueryClient();
  const [newBookingsCount, setNewBookingsCount] = useState(0);
  const debouncedInvalidate = useDebouncedInvalidate(queryClient);

  const resetNewBookingsCount = useCallback(() => {
    setNewBookingsCount(0);
  }, []);

  useEffect(() => {
    // Only subscribe if enabled and we have an org ID
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

          // Debounced invalidation to reduce rapid refetches
          debouncedInvalidate(['dashboard-bookings']);
          debouncedInvalidate(['dashboard-seats']);
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

          // Debounced invalidation
          debouncedInvalidate(['dashboard-bookings']);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, enabled, debouncedInvalidate]);

  return { newBookingsCount, resetNewBookingsCount };
}

export function useRealtimeShowtimes({ organizationId, enabled = true }: UseRealtimeBookingsOptions) {
  const queryClient = useQueryClient();
  const debouncedInvalidate = useDebouncedInvalidate(queryClient);

  useEffect(() => {
    // Only subscribe if enabled and we have an org ID
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
          debouncedInvalidate(['dashboard-showtimes']);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, enabled, debouncedInvalidate]);
}

export function useRealtimeMovies({ organizationId, enabled = true }: UseRealtimeBookingsOptions) {
  const queryClient = useQueryClient();
  const debouncedInvalidate = useDebouncedInvalidate(queryClient);

  useEffect(() => {
    // Only subscribe if enabled and we have an org ID
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
          debouncedInvalidate(['dashboard-movies']);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, enabled, debouncedInvalidate]);
}
