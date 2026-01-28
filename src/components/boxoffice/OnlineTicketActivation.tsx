import { useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  Ticket, 
  User, 
  Film,
  Armchair,
  Loader2,
  AlertCircle,
  Globe,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface OnlineBooking {
  id: string;
  booking_reference: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  total_amount: number;
  status: string;
  created_at: string;
  showtimes: {
    start_time: string;
    movies: { title: string };
    screens: { name: string };
  };
  booked_seats: {
    row_label: string;
    seat_number: number;
    seat_type: string;
  }[];
}

interface OnlineTicketActivationProps {
  activeShiftId: string | null;
  onActivated?: () => void;
}

export function OnlineTicketActivation({ activeShiftId, onActivated }: OnlineTicketActivationProps) {
  const { data: profile } = useUserProfile();
  const [searchQuery, setSearchQuery] = useState('');
  const [isActivating, setIsActivating] = useState(false);

  const shouldSearch = searchQuery.trim().length >= 3;

  const { data: pendingBookings, isLoading, refetch } = useQuery({
    queryKey: ['pending-online-bookings', profile?.organization_id, searchQuery],
    queryFn: async () => {
      if (!profile?.organization_id || !shouldSearch) return [];
      
      const search = searchQuery.trim().toUpperCase();
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_reference,
          customer_name,
          customer_email,
          customer_phone,
          total_amount,
          status,
          created_at,
          showtimes (
            start_time,
            movies (title),
            screens (name)
          ),
          booked_seats (
            row_label,
            seat_number,
            seat_type
          )
        `)
        .eq('organization_id', profile.organization_id)
        .eq('status', 'paid')
        .ilike('booking_reference', `%${search}%`)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data as OnlineBooking[];
    },
    enabled: !!profile?.organization_id && shouldSearch,
  });

  const activateTicket = async (booking: OnlineBooking) => {
    if (!activeShiftId) {
      toast.error('Please start a shift first');
      return;
    }

    setIsActivating(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'activated',
          shift_id: activeShiftId,
        })
        .eq('id', booking.id)
        .eq('status', 'paid');

      if (error) throw error;

      toast.success(`Ticket ${booking.booking_reference} activated!`);
      setSearchQuery('');
      refetch();
      onActivated?.();
    } catch (error) {
      console.error('Activation error:', error);
      toast.error('Failed to activate ticket');
    } finally {
      setIsActivating(false);
    }
  };

  const formatSeats = (seats: OnlineBooking['booked_seats']) => {
    return seats
      .sort((a, b) => a.row_label.localeCompare(b.row_label) || a.seat_number - b.seat_number)
      .map(s => `${s.row_label}${s.seat_number}`)
      .join(', ');
  };

  const booking = pendingBookings?.[0];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Globe className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Online Ticket Activation</h3>
          <p className="text-xs text-muted-foreground">Validate online purchases</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Enter booking reference..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
          className="pl-10 font-mono uppercase text-lg h-12 bg-secondary/50 border-border/50 focus:border-primary"
        />
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0">
        {!shouldSearch ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <Ticket className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Enter Reference Code</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Type at least 3 characters</p>
          </div>
        ) : isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : booking ? (
          <div className="space-y-4">
            {/* Booking Found Card */}
            <div className={cn(
              "rounded-lg border-2 p-4 transition-all",
              "bg-card border-primary/50"
            )}>
              {/* Reference & Status */}
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline" className="font-mono text-sm px-3 py-1">
                  {booking.booking_reference}
                </Badge>
                <Badge variant="secondary" className="bg-accent/20 text-accent-foreground border-accent/30">
                  Pending Activation
                </Badge>
              </div>

              {/* Customer */}
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{booking.customer_name}</span>
              </div>

              {/* Movie & Time */}
              <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                <div className="flex items-start gap-2">
                  <Film className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium line-clamp-1">{booking.showtimes.movies.title}</p>
                    <p className="text-xs text-muted-foreground">{booking.showtimes.screens.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{format(new Date(booking.showtimes.start_time), 'MMM d')}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(booking.showtimes.start_time), 'h:mm a')}</p>
                  </div>
                </div>
              </div>

              {/* Seats */}
              <div className="flex items-center gap-2 p-2 rounded-md bg-secondary/50 mb-3">
                <Armchair className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{formatSeats(booking.booked_seats)}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {booking.booked_seats.length} seat{booking.booked_seats.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Amount */}
              <div className="flex items-center justify-between text-sm mb-4">
                <span className="text-muted-foreground">Total Paid</span>
                <span className="text-lg font-bold text-primary">${booking.total_amount.toFixed(2)}</span>
              </div>

              {/* Activate Button */}
              <Button
                className="w-full h-12 text-base font-semibold"
                onClick={() => activateTicket(booking)}
                disabled={isActivating || !activeShiftId}
              >
                {isActivating ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                )}
                {isActivating ? 'Activating...' : 'Activate Ticket'}
              </Button>

              {!activeShiftId && (
                <p className="text-xs text-destructive text-center mt-2">
                  Start a shift to activate tickets
                </p>
              )}
            </div>

            {/* Additional Results */}
            {pendingBookings && pendingBookings.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Other matches:</p>
                {pendingBookings.slice(1).map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSearchQuery(b.booking_reference)}
                    className="w-full flex items-center justify-between p-2 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {b.booking_reference}
                      </Badge>
                      <span className="text-sm truncate">{b.customer_name}</span>
                    </div>
                    <Clock className="h-3 w-3 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
              <AlertCircle className="h-8 w-8 text-destructive/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No Ticket Found</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Check the reference code</p>
          </div>
        )}
      </div>
    </div>
  );
}
