import { useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  Ticket, 
  User, 
  Film,
  MapPin,
  Armchair,
  Loader2,
  AlertCircle,
  Globe
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
  const [selectedBooking, setSelectedBooking] = useState<OnlineBooking | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  // Only search when reference code is entered (minimum 3 characters)
  const shouldSearch = searchQuery.trim().length >= 3;

  // Fetch booking by reference code
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
        .limit(10);
      
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
          shift_id: activeShiftId, // Link to current shift for tracking
        })
        .eq('id', booking.id)
        .eq('status', 'paid'); // Only activate if still in 'paid' status

      if (error) throw error;

      toast.success(`Ticket ${booking.booking_reference} activated!`);
      setSelectedBooking(null);
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Globe className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Online Ticket Activation</h3>
      </div>

      {/* Search by Reference Code */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          Enter Booking Reference Code
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="e.g., ABC123..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
            className="pl-10 font-mono uppercase"
          />
        </div>
        {searchQuery.trim().length > 0 && searchQuery.trim().length < 3 && (
          <p className="text-xs text-muted-foreground">Enter at least 3 characters to search</p>
        )}
      </div>

      {/* Results - only shown when searching */}
      {!shouldSearch ? (
        <div className="text-center py-8 text-muted-foreground">
          <Ticket className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Enter a booking reference code</p>
          <p className="text-sm">Type the reference to find and activate tickets</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : pendingBookings && pendingBookings.length > 0 ? (
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {pendingBookings.map((booking) => {
              const showtimeDate = new Date(booking.showtimes.start_time);
              const now = new Date();
              const minutesUntilShow = (showtimeDate.getTime() - now.getTime()) / (1000 * 60);
              const isUrgent = minutesUntilShow > 0 && minutesUntilShow < 30;
              const isPast = minutesUntilShow < -30;

              return (
                <Card 
                  key={booking.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    selectedBooking?.id === booking.id && "ring-2 ring-primary",
                    isUrgent && "border-destructive",
                    isPast && "opacity-60"
                  )}
                  onClick={() => setSelectedBooking(booking)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {booking.booking_reference}
                          </Badge>
                          {isUrgent && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Soon
                            </Badge>
                          )}
                        </div>
                        
                        <div className="mt-1 flex items-center gap-1 text-sm">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium truncate">{booking.customer_name}</span>
                        </div>
                        
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Film className="h-3 w-3" />
                            <span className="truncate max-w-[120px]">{booking.showtimes.movies.title}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{format(showtimeDate, 'HH:mm')}</span>
                          </div>
                        </div>
                        
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Armchair className="h-3 w-3" />
                          <span>{formatSeats(booking.booked_seats)}</span>
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          activateTicket(booking);
                        }}
                        disabled={isActivating || isPast}
                        className="shrink-0"
                      >
                        {isActivating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No ticket found</p>
          <p className="text-sm">Check the reference code and try again</p>
        </div>
      )}

      {/* Selected Booking Detail Panel */}
      {selectedBooking && (
        <Card className="border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              Ticket Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Reference:</span>
                <p className="font-mono font-semibold">{selectedBooking.booking_reference}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Amount:</span>
                <p className="font-semibold">${selectedBooking.total_amount.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Customer:</span>
                <p className="font-medium">{selectedBooking.customer_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="truncate">{selectedBooking.customer_email}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Movie:</span>
                <p>{selectedBooking.showtimes.movies.title}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Showtime:</span>
                <p>{format(new Date(selectedBooking.showtimes.start_time), 'MMM d, HH:mm')}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Screen:</span>
                <p>{selectedBooking.showtimes.screens.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Seats:</span>
                <p>{formatSeats(selectedBooking.booked_seats)}</p>
              </div>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                onClick={() => activateTicket(selectedBooking)}
                disabled={isActivating}
              >
                {isActivating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Activate Ticket
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedBooking(null)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
