import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Film, Clock, Calendar, MapPin, ArrowLeft, Ticket, Check, Download } from 'lucide-react';
import { toast } from 'sonner';

interface Showtime {
  id: string;
  start_time: string;
  price: number;
  vip_price: number | null;
  movies: {
    title: string;
    duration_minutes: number;
    poster_url: string | null;
    genre: string | null;
    rating: string | null;
  };
  screens: {
    id: string;
    name: string;
    rows: number;
    columns: number;
  };
}

interface SelectedSeat {
  row_label: string;
  seat_number: number;
  seat_type: string;
  price: number;
}

interface BookingData {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
}

export default function BookingFlow() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const showtimeId = searchParams.get('showtime');

  const [step, setStep] = useState<'seats' | 'details' | 'confirmation'>('seats');
  const [showtime, setShowtime] = useState<Showtime | null>(null);
  const [seatLayouts, setSeatLayouts] = useState<any[]>([]);
  const [bookedSeats, setBookedSeats] = useState<any[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([]);
  const [cinema, setCinema] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookingRef, setBookingRef] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState<BookingData>({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
  });

  useEffect(() => {
    if (slug && showtimeId) {
      fetchData();
    }
  }, [slug, showtimeId]);

  const fetchData = async () => {
    try {
      // Fetch cinema
      const { data: cinemaData } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (!cinemaData) {
        setLoading(false);
        return;
      }
      setCinema(cinemaData);

      // Fetch showtime with movie and screen
      const { data: showtimeData } = await supabase
        .from('showtimes')
        .select(`
          *,
          movies (title, duration_minutes, poster_url, genre, rating),
          screens (id, name, rows, columns)
        `)
        .eq('id', showtimeId)
        .eq('is_active', true)
        .single();

      if (!showtimeData) {
        setLoading(false);
        return;
      }
      setShowtime(showtimeData);

      // Fetch seat layouts
      const { data: layouts } = await supabase
        .from('seat_layouts')
        .select('*')
        .eq('screen_id', showtimeData.screens.id);

      setSeatLayouts(layouts || []);

      // Fetch already booked seats
      const { data: booked } = await supabase
        .from('booked_seats')
        .select('row_label, seat_number')
        .eq('showtime_id', showtimeId);

      setBookedSeats(booked || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isSeatBooked = (row: string, num: number) => {
    return bookedSeats.some(s => s.row_label === row && s.seat_number === num);
  };

  const isSeatSelected = (row: string, num: number) => {
    return selectedSeats.some(s => s.row_label === row && s.seat_number === num);
  };

  const toggleSeat = (seat: any) => {
    if (!showtime || !seat.is_available || isSeatBooked(seat.row_label, seat.seat_number)) return;

    const isSelected = isSeatSelected(seat.row_label, seat.seat_number);
    const price = seat.seat_type === 'vip' && showtime.vip_price
      ? showtime.vip_price
      : showtime.price;

    if (isSelected) {
      setSelectedSeats(prev => prev.filter(
        s => !(s.row_label === seat.row_label && s.seat_number === seat.seat_number)
      ));
    } else {
      setSelectedSeats(prev => [...prev, {
        row_label: seat.row_label,
        seat_number: seat.seat_number,
        seat_type: seat.seat_type,
        price,
      }]);
    }
  };

  const getSeatClass = (seat: any) => {
    if (!seat.is_available || seat.seat_type === 'unavailable') {
      return 'bg-muted text-muted-foreground cursor-not-allowed';
    }
    if (isSeatBooked(seat.row_label, seat.seat_number)) {
      return 'bg-destructive/50 text-destructive-foreground cursor-not-allowed';
    }
    if (isSeatSelected(seat.row_label, seat.seat_number)) {
      return 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2';
    }
    if (seat.seat_type === 'vip') {
      return 'bg-primary/30 text-primary hover:bg-primary/50 cursor-pointer';
    }
    return 'bg-secondary hover:bg-secondary/80 cursor-pointer';
  };

  const totalAmount = selectedSeats.reduce((sum, s) => sum + s.price, 0);

  const handleBooking = async () => {
    if (!showtime || selectedSeats.length === 0 || !cinema) return;

    setSubmitting(true);
    try {
      // Generate booking reference
      const { data: refData } = await supabase.rpc('generate_booking_reference');
      const bookingReference = refData as string;

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          organization_id: cinema.id,
          showtime_id: showtime.id,
          customer_name: bookingData.customer_name,
          customer_email: bookingData.customer_email,
          customer_phone: bookingData.customer_phone || null,
          total_amount: totalAmount,
          booking_reference: bookingReference,
          status: 'confirmed',
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Create booked seats
      const seatsToBook = selectedSeats.map(seat => ({
        booking_id: booking.id,
        showtime_id: showtime.id,
        row_label: seat.row_label,
        seat_number: seat.seat_number,
        seat_type: seat.seat_type,
        price: seat.price,
      }));

      const { error: seatsError } = await supabase
        .from('booked_seats')
        .insert(seatsToBook);

      if (seatsError) throw seatsError;

      setBookingRef(bookingReference);
      setStep('confirmation');
      toast.success('Booking confirmed!');
    } catch (error: any) {
      console.error('Booking error:', error);
      toast.error(error.message || 'Failed to complete booking');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-20 w-full" />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!showtime || !cinema) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Film className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Showtime Not Found</h1>
          <Button asChild>
            <a href={`/cinema/${slug}`}>Back to Cinema</a>
          </Button>
        </div>
      </div>
    );
  }

  const customStyles = {
    '--cinema-primary': cinema.primary_color || '#D4AF37',
  } as React.CSSProperties;

  return (
    <div className="min-h-screen bg-background" style={customStyles}>
      {/* Header */}
      <header
        className="border-b py-4"
        style={{ backgroundColor: cinema.secondary_color || 'hsl(var(--card))' }}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <a href={`/cinema/${slug}`}>
                <ArrowLeft className="h-5 w-5" />
              </a>
            </Button>
            <div className="flex items-center gap-3">
              {cinema.logo_url ? (
                <img src={cinema.logo_url} alt={cinema.name} className="h-10 w-auto" />
              ) : (
                <Film className="h-8 w-8" style={{ color: cinema.primary_color }} />
              )}
              <span className="font-bold text-lg">{cinema.name}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Movie Info */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  {showtime.movies.poster_url ? (
                    <img
                      src={showtime.movies.poster_url}
                      alt={showtime.movies.title}
                      className="w-24 h-36 object-cover rounded"
                    />
                  ) : (
                    <div className="w-24 h-36 bg-muted rounded flex items-center justify-center">
                      <Film className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl font-bold mb-2">{showtime.movies.title}</h1>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {showtime.movies.rating && (
                        <Badge variant="outline">{showtime.movies.rating}</Badge>
                      )}
                      {showtime.movies.genre && (
                        <Badge variant="secondary">{showtime.movies.genre}</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {showtime.movies.duration_minutes} min
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(showtime.start_time), 'MMM d, yyyy')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {format(new Date(showtime.start_time), 'h:mm a')}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {showtime.screens.name}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {step === 'seats' && (
              <Card>
                <CardHeader>
                  <CardTitle>Select Your Seats</CardTitle>
                  <CardDescription>Click on available seats to select them</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-secondary" />
                      <span className="text-sm">Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-primary/30" />
                      <span className="text-sm">VIP</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-primary" />
                      <span className="text-sm">Selected</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-destructive/50" />
                      <span className="text-sm">Booked</span>
                    </div>
                  </div>

                  <div className="bg-card border rounded-lg p-4 overflow-auto">
                    <div className="text-center mb-6 py-3 bg-gradient-to-b from-muted to-transparent rounded text-sm text-muted-foreground">
                      SCREEN
                    </div>

                    <div className="space-y-1 flex flex-col items-center">
                      {Array.from({ length: showtime.screens.rows }, (_, i) => {
                        const rowLabel = String.fromCharCode(65 + i);
                        const rowSeats = seatLayouts
                          .filter(s => s.row_label === rowLabel)
                          .sort((a, b) => a.seat_number - b.seat_number);

                        return (
                          <div key={rowLabel} className="flex items-center gap-2">
                            <span className="w-6 text-xs text-muted-foreground text-right">{rowLabel}</span>
                            <div className="flex gap-1">
                              {rowSeats.map((seat) => (
                                <button
                                  key={`${seat.row_label}${seat.seat_number}`}
                                  onClick={() => toggleSeat(seat)}
                                  disabled={!seat.is_available || isSeatBooked(seat.row_label, seat.seat_number)}
                                  className={`w-7 h-7 rounded text-xs font-medium transition-all ${getSeatClass(seat)}`}
                                  title={`${seat.row_label}${seat.seat_number} - ${seat.seat_type}`}
                                >
                                  {seat.seat_number}
                                </button>
                              ))}
                            </div>
                            <span className="w-6 text-xs text-muted-foreground">{rowLabel}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {selectedSeats.length > 0 && (
                    <Button
                      className="w-full mt-6"
                      size="lg"
                      onClick={() => setStep('details')}
                      style={{ backgroundColor: cinema.primary_color }}
                    >
                      Continue to Details
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {step === 'details' && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Details</CardTitle>
                  <CardDescription>Enter your contact information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={bookingData.customer_name}
                      onChange={(e) => setBookingData(prev => ({ ...prev, customer_name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={bookingData.customer_email}
                      onChange={(e) => setBookingData(prev => ({ ...prev, customer_email: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number (optional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={bookingData.customer_phone}
                      onChange={(e) => setBookingData(prev => ({ ...prev, customer_phone: e.target.value }))}
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button variant="outline" onClick={() => setStep('seats')}>
                      Back
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleBooking}
                      disabled={!bookingData.customer_name || !bookingData.customer_email || submitting}
                      style={{ backgroundColor: cinema.primary_color }}
                    >
                      {submitting ? 'Processing...' : `Confirm Booking - $${totalAmount.toFixed(2)}`}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 'confirmation' && (
              <Card className="text-center">
                <CardContent className="pt-8 pb-8">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: `${cinema.primary_color}20` }}
                  >
                    <Check className="h-8 w-8" style={{ color: cinema.primary_color }} />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
                  <p className="text-muted-foreground mb-4">
                    Your booking reference is:
                  </p>
                  <div className="text-3xl font-mono font-bold mb-6" style={{ color: cinema.primary_color }}>
                    {bookingRef}
                  </div>
                  
                  {/* QR Code */}
                  <div className="bg-white p-4 rounded-lg inline-block mb-6">
                    <QRCodeSVG
                      value={JSON.stringify({ ref: bookingRef, cinema: cinema.slug })}
                      size={180}
                      level="H"
                      includeMargin
                    />
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-6">
                    Show this QR code at the gate for entry. Screenshot or save this page.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild variant="outline">
                      <a href={`/cinema/${slug}`}>Back to Cinema</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium">{showtime.movies.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(showtime.start_time), 'MMM d, yyyy')} at{' '}
                    {format(new Date(showtime.start_time), 'h:mm a')}
                  </p>
                  <p className="text-sm text-muted-foreground">{showtime.screens.name}</p>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">Selected Seats ({selectedSeats.length})</p>
                  {selectedSeats.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {selectedSeats
                        .sort((a, b) => a.row_label.localeCompare(b.row_label) || a.seat_number - b.seat_number)
                        .map((seat) => (
                          <Badge key={`${seat.row_label}${seat.seat_number}`} variant="secondary">
                            {seat.row_label}{seat.seat_number}
                            {seat.seat_type === 'vip' && ' (VIP)'}
                          </Badge>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No seats selected</p>
                  )}
                </div>

                {selectedSeats.length > 0 && (
                  <div className="border-t pt-4">
                    {selectedSeats.map((seat, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>
                          {seat.row_label}{seat.seat_number}
                          {seat.seat_type === 'vip' && ' (VIP)'}
                        </span>
                        <span>${seat.price.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold mt-4 pt-4 border-t">
                      <span>Total</span>
                      <span style={{ color: cinema.primary_color }}>${totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
