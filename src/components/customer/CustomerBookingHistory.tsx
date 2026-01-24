import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Loader2, Ticket, Calendar, MapPin, Clock, QrCode, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface Booking {
  id: string;
  booking_reference: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  status: string;
  created_at: string;
  showtime: {
    id: string;
    start_time: string;
    movie: {
      title: string;
      poster_url: string | null;
    } | null;
    screen: {
      name: string;
    } | null;
  } | null;
  booked_seats: Array<{
    row_label: string;
    seat_number: number;
  }>;
}

interface CustomerBookingHistoryProps {
  customerId: string;
  primaryColor: string;
}

export function CustomerBookingHistory({ customerId, primaryColor }: CustomerBookingHistoryProps) {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['customer-bookings', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_reference,
          customer_name,
          customer_email,
          total_amount,
          status,
          created_at,
          showtime:showtimes (
            id,
            start_time,
            movie:movies (title, poster_url),
            screen:screens (name)
          ),
          booked_seats (row_label, seat_number)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!customerId,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pending':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'checked_in':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-white/20 text-white/60 border-white/30';
    }
  };

  const formatSeats = (seats: Array<{ row_label: string; seat_number: number }>) => {
    return seats
      .sort((a, b) => a.row_label.localeCompare(b.row_label) || a.seat_number - b.seat_number)
      .map((s) => `${s.row_label}${s.seat_number}`)
      .join(', ');
  };

  const isUpcoming = (startTime: string) => new Date(startTime) > new Date();

  return (
    <>
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="text-white flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Booking History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-white/60" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="p-8 text-center">
              <Ticket className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/60">No bookings yet</p>
              <p className="text-white/40 text-sm mt-2">
                Your booking history will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="p-4 hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => setSelectedBooking(booking)}
                >
                  <div className="flex items-start gap-4">
                    {/* Movie Poster */}
                    <div className="hidden sm:block w-16 h-24 rounded overflow-hidden bg-white/5 flex-shrink-0">
                      {booking.showtime?.movie?.poster_url ? (
                        <img
                          src={booking.showtime.movie.poster_url}
                          alt={booking.showtime.movie.title || 'Movie'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Ticket className="h-6 w-6 text-white/20" />
                        </div>
                      )}
                    </div>

                    {/* Booking Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-white font-medium truncate">
                            {booking.showtime?.movie?.title || 'Unknown Movie'}
                          </h3>
                          <p className="text-white/40 text-sm mt-0.5">
                            Ref: {booking.booking_reference}
                          </p>
                        </div>
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status.replace('_', ' ')}
                        </Badge>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/60">
                        {booking.showtime && (
                          <>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>
                                {format(new Date(booking.showtime.start_time), 'MMM d, yyyy')}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              <span>
                                {format(new Date(booking.showtime.start_time), 'h:mm a')}
                              </span>
                            </div>
                            {booking.showtime.screen && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                <span>{booking.showtime.screen.name}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-white/60 text-sm">
                          Seats: {formatSeats(booking.booked_seats)}
                        </p>
                        <p className="font-semibold" style={{ color: primaryColor }}>
                          ${booking.total_amount.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-white/40 flex-shrink-0 mt-4" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Details Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Booking Details</DialogTitle>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-6">
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg">
                  <QRCodeSVG value={selectedBooking.booking_reference} size={150} />
                </div>
              </div>

              <div className="text-center">
                <p className="text-white/60 text-sm">Booking Reference</p>
                <p className="text-2xl font-mono font-bold" style={{ color: primaryColor }}>
                  {selectedBooking.booking_reference}
                </p>
              </div>

              {/* Movie Info */}
              <div className="space-y-3 p-4 rounded-lg bg-white/5">
                <div>
                  <p className="text-white/40 text-xs">Movie</p>
                  <p className="text-white font-medium">
                    {selectedBooking.showtime?.movie?.title || 'Unknown'}
                  </p>
                </div>

                {selectedBooking.showtime && (
                  <>
                    <div className="flex gap-4">
                      <div>
                        <p className="text-white/40 text-xs">Date</p>
                        <p className="text-white">
                          {format(new Date(selectedBooking.showtime.start_time), 'EEEE, MMM d, yyyy')}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/40 text-xs">Time</p>
                        <p className="text-white">
                          {format(new Date(selectedBooking.showtime.start_time), 'h:mm a')}
                        </p>
                      </div>
                    </div>

                    {selectedBooking.showtime.screen && (
                      <div>
                        <p className="text-white/40 text-xs">Screen</p>
                        <p className="text-white">{selectedBooking.showtime.screen.name}</p>
                      </div>
                    )}
                  </>
                )}

                <div>
                  <p className="text-white/40 text-xs">Seats</p>
                  <p className="text-white font-medium">
                    {formatSeats(selectedBooking.booked_seats)}
                  </p>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-white/10">
                  <span className="text-white/60">Total Paid</span>
                  <span className="text-xl font-bold" style={{ color: primaryColor }}>
                    ${selectedBooking.total_amount.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <Badge className={getStatusColor(selectedBooking.status)}>
                  {selectedBooking.status.replace('_', ' ')}
                </Badge>
                <p className="text-white/40 text-sm">
                  Booked {format(new Date(selectedBooking.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
