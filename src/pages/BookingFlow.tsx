import { useState, useEffect, useCallback } from 'react';
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
import { Film, Clock, Calendar, MapPin, ArrowLeft, Ticket, Check, AlertCircle, Tag, X, CreditCard, Loader2, Popcorn, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PromoCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase_amount: number;
}

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

interface ConcessionItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
}

interface SelectedConcession {
  item: ConcessionItem;
  quantity: number;
}

interface ComboDeal {
  id: string;
  name: string;
  description: string | null;
  original_price: number;
  combo_price: number;
  available_from: string | null;
  available_until: string | null;
  available_days: number[] | null;
  combo_deal_items: Array<{
    quantity: number;
    concession_items: { name: string };
  }>;
}

interface SelectedCombo {
  combo: ComboDeal;
  quantity: number;
}

export default function BookingFlow() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const showtimeId = searchParams.get('showtime');
  const paymentStatus = searchParams.get('status');
  const paymentRef = searchParams.get('ref');

  const [step, setStep] = useState<'seats' | 'snacks' | 'details' | 'payment' | 'confirmation'>('seats');
  const [showtime, setShowtime] = useState<Showtime | null>(null);
  const [seatLayouts, setSeatLayouts] = useState<any[]>([]);
  const [bookedSeats, setBookedSeats] = useState<any[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([]);
  const [cinema, setCinema] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [bookingRef, setBookingRef] = useState<string | null>(null);
  const [pendingBookingRef, setPendingBookingRef] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState<BookingData>({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
  });
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [concessionItems, setConcessionItems] = useState<ConcessionItem[]>([]);
  const [selectedConcessions, setSelectedConcessions] = useState<SelectedConcession[]>([]);
  const [combos, setCombos] = useState<ComboDeal[]>([]);
  const [selectedCombos, setSelectedCombos] = useState<SelectedCombo[]>([]);

  // Handle payment callback
  useEffect(() => {
    if (paymentStatus && paymentRef) {
      handlePaymentCallback();
    }
  }, [paymentStatus, paymentRef]);

  const handlePaymentCallback = async () => {
    if (!paymentRef || !cinema) return;
    
    setLoading(true);
    try {
      // Verify payment
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: {
          bookingReference: paymentRef,
          paymentReference: searchParams.get('transaction_id') || searchParams.get('reference'),
          gateway: cinema.payment_gateway,
          transactionId: searchParams.get('transaction_id'),
        },
      });

      if (error) throw error;

      if (data.verified) {
        setBookingRef(paymentRef);
        setStep('confirmation');
        toast.success('Payment successful! Your booking is confirmed.');
      } else {
        toast.error('Payment verification failed. Please contact support.');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      toast.error('Failed to verify payment');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookedSeats = useCallback(async () => {
    if (!showtimeId) return;
    const { data: booked } = await supabase
      .from('booked_seats')
      .select('row_label, seat_number')
      .eq('showtime_id', showtimeId);
    setBookedSeats(booked || []);
  }, [showtimeId]);

  useEffect(() => {
    if (slug && showtimeId) {
      fetchData();
    }
  }, [slug, showtimeId]);

  // Real-time subscription for seat updates
  useEffect(() => {
    if (!showtimeId) return;

    const channel = supabase
      .channel(`seats-${showtimeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'booked_seats',
          filter: `showtime_id=eq.${showtimeId}`,
        },
        (payload) => {
          console.log('Real-time seat update:', payload);
          const newSeat = payload.new as { row_label: string; seat_number: number };
          
          // Add newly booked seat
          setBookedSeats(prev => [...prev, { row_label: newSeat.row_label, seat_number: newSeat.seat_number }]);
          
          // Remove from selected if another user booked it
          setSelectedSeats(prev => {
            const wasSelected = prev.some(
              s => s.row_label === newSeat.row_label && s.seat_number === newSeat.seat_number
            );
            if (wasSelected) {
              toast.warning(`Seat ${newSeat.row_label}${newSeat.seat_number} was just booked by someone else`);
              return prev.filter(
                s => !(s.row_label === newSeat.row_label && s.seat_number === newSeat.seat_number)
              );
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showtimeId]);

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
      await fetchBookedSeats();

      // Fetch concession items for this cinema
      const { data: concessions } = await supabase
        .from('concession_items')
        .select('*')
        .eq('organization_id', cinemaData.id)
        .eq('is_available', true)
        .order('category')
        .order('name');

      setConcessionItems(concessions || []);

      // Fetch combo deals
      const { data: comboDeals } = await supabase
        .from('combo_deals')
        .select(`
          *,
          combo_deal_items (
            quantity,
            concession_items (name)
          )
        `)
        .eq('organization_id', cinemaData.id)
        .eq('is_active', true);

      setCombos(comboDeals || []);
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

  // Concession functions
  const addConcession = (item: ConcessionItem) => {
    setSelectedConcessions(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) {
        return prev.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeConcession = (itemId: string) => {
    setSelectedConcessions(prev => {
      const existing = prev.find(c => c.item.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(c => c.item.id === itemId ? { ...c, quantity: c.quantity - 1 } : c);
      }
      return prev.filter(c => c.item.id !== itemId);
    });
  };

  const getConcessionQuantity = (itemId: string) => {
    return selectedConcessions.find(c => c.item.id === itemId)?.quantity || 0;
  };

  // Combo functions
  const addCombo = (combo: ComboDeal) => {
    setSelectedCombos(prev => {
      const existing = prev.find(c => c.combo.id === combo.id);
      if (existing) {
        return prev.map(c => c.combo.id === combo.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { combo, quantity: 1 }];
    });
  };

  const removeCombo = (comboId: string) => {
    setSelectedCombos(prev => {
      const existing = prev.find(c => c.combo.id === comboId);
      if (existing && existing.quantity > 1) {
        return prev.map(c => c.combo.id === comboId ? { ...c, quantity: c.quantity - 1 } : c);
      }
      return prev.filter(c => c.combo.id !== comboId);
    });
  };

  const getComboQuantity = (comboId: string) => {
    return selectedCombos.find(c => c.combo.id === comboId)?.quantity || 0;
  };

  // Filter combos by current time/day
  const availableCombos = combos.filter(combo => {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentDay = now.getDay();

    if (combo.available_from && currentTime < combo.available_from) return false;
    if (combo.available_until && currentTime > combo.available_until) return false;
    if (combo.available_days?.length > 0 && !combo.available_days.includes(currentDay)) return false;
    return true;
  });

  const ticketsSubtotal = selectedSeats.reduce((sum, s) => sum + s.price, 0);
  const concessionsSubtotal = selectedConcessions.reduce((sum, c) => sum + (c.item.price * c.quantity), 0);
  const combosSubtotal = selectedCombos.reduce((sum, c) => sum + (c.combo.combo_price * c.quantity), 0);
  const subtotal = ticketsSubtotal + concessionsSubtotal + combosSubtotal;
  
  const calculateDiscount = () => {
    if (!appliedPromo) return 0;
    if (ticketsSubtotal < appliedPromo.min_purchase_amount) return 0;
    
    if (appliedPromo.discount_type === 'percentage') {
      return ticketsSubtotal * (appliedPromo.discount_value / 100);
    }
    return Math.min(appliedPromo.discount_value, ticketsSubtotal);
  };
  
  const discountAmount = calculateDiscount();
  const totalAmount = subtotal - discountAmount;

  const applyPromoCode = async () => {
    if (!promoCode.trim() || !cinema) return;
    
    setPromoLoading(true);
    setPromoError(null);
    
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('id, code, discount_type, discount_value, min_purchase_amount, max_uses, current_uses, valid_until')
        .eq('organization_id', cinema.id)
        .eq('code', promoCode.toUpperCase())
        .eq('is_active', true)
        .single();
      
      if (error || !data) {
        setPromoError('Invalid promo code');
        return;
      }
      
      // Check if expired
      if (data.valid_until && new Date(data.valid_until) < new Date()) {
        setPromoError('This promo code has expired');
        return;
      }
      
      // Check max uses
      if (data.max_uses && data.current_uses >= data.max_uses) {
        setPromoError('This promo code has reached its usage limit');
        return;
      }
      
      // Check minimum purchase
      if (subtotal < data.min_purchase_amount) {
        setPromoError(`Minimum purchase of $${data.min_purchase_amount} required`);
        return;
      }
      
      setAppliedPromo({
        id: data.id,
        code: data.code,
        discount_type: data.discount_type as 'percentage' | 'fixed',
        discount_value: data.discount_value,
        min_purchase_amount: data.min_purchase_amount,
      });
      setPromoCode('');
      toast.success('Promo code applied!');
    } catch (error) {
      setPromoError('Failed to apply promo code');
    } finally {
      setPromoLoading(false);
    }
  };

  const removePromoCode = () => {
    setAppliedPromo(null);
    setPromoError(null);
  };

  const sendConfirmationEmail = async (bookingReference: string) => {
    try {
      const qrCodeData = JSON.stringify({ ref: bookingReference, cinema: cinema.slug });
      const seatLabels = selectedSeats
        .sort((a, b) => a.row_label.localeCompare(b.row_label) || a.seat_number - b.seat_number)
        .map(s => `${s.row_label}${s.seat_number}${s.seat_type === 'vip' ? ' (VIP)' : ''}`);

      await supabase.functions.invoke('send-booking-confirmation', {
        body: {
          customerName: bookingData.customer_name,
          customerEmail: bookingData.customer_email,
          cinemaName: cinema.name,
          movieTitle: showtime!.movies.title,
          showtime: format(new Date(showtime!.start_time), 'EEEE, MMMM d, yyyy \'at\' h:mm a'),
          screenName: showtime!.screens.name,
          seats: seatLabels,
          totalAmount,
          bookingReference,
          qrCodeData,
        },
      });
      console.log('Confirmation email sent');
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
      // Don't fail the booking if email fails
    }
  };

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
          discount_amount: discountAmount,
          promo_code_id: appliedPromo?.id || null,
          booking_reference: bookingReference,
          status: 'confirmed',
        })
        .select()
        .single();

      if (bookingError) throw bookingError;
      
      // Update promo code usage count if used
      if (appliedPromo) {
        await supabase
          .from('promo_codes')
          .update({ current_uses: (await supabase.from('promo_codes').select('current_uses').eq('id', appliedPromo.id).single()).data?.current_uses + 1 || 1 })
          .eq('id', appliedPromo.id);
      }

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

      // Create booking concessions if any selected
      if (selectedConcessions.length > 0) {
        const concessionsToBook = selectedConcessions.map(c => ({
          booking_id: booking.id,
          concession_item_id: c.item.id,
          quantity: c.quantity,
          unit_price: c.item.price,
        }));

        const { error: concessionsError } = await supabase
          .from('booking_concessions')
          .insert(concessionsToBook);

        if (concessionsError) {
          console.error('Failed to save concessions:', concessionsError);
          // Don't fail the booking for concession errors
        }
      }

      // Send confirmation email (don't await to not block UI)
      sendConfirmationEmail(bookingReference);

      setBookingRef(bookingReference);
      setStep('confirmation');
      toast.success('Booking confirmed! Confirmation email sent.');
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
                  <CardDescription className="flex items-center gap-2">
                    Click on available seats to select them
                    <Badge variant="outline" className="text-xs">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-1" />
                      Live updates
                    </Badge>
                  </CardDescription>
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
                      onClick={() => setStep(concessionItems.length > 0 ? 'snacks' : 'details')}
                      style={{ backgroundColor: cinema.primary_color }}
                    >
                      {concessionItems.length > 0 ? 'Continue to Snacks' : 'Continue to Details'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {step === 'snacks' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Popcorn className="h-5 w-5" />
                    Add Snacks & Drinks
                  </CardTitle>
                  <CardDescription>Enhance your movie experience (optional)</CardDescription>
                </CardHeader>
                <CardContent>
                  {Object.entries(
                    concessionItems.reduce((acc, item) => {
                      if (!acc[item.category]) acc[item.category] = [];
                      acc[item.category].push(item);
                      return acc;
                    }, {} as Record<string, ConcessionItem[]>)
                  ).map(([category, items]) => (
                    <div key={category} className="mb-6 last:mb-0">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3 capitalize">
                        {category}
                      </h3>
                      <div className="grid gap-3">
                        {items.map((item) => {
                          const quantity = getConcessionQuantity(item.id);
                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                {item.image_url ? (
                                  <img
                                    src={item.image_url}
                                    alt={item.name}
                                    className="w-12 h-12 rounded object-cover"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                                    <Popcorn className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  {item.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-1">
                                      {item.description}
                                    </p>
                                  )}
                                  <p className="text-sm font-semibold" style={{ color: cinema.primary_color }}>
                                    ${item.price.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {quantity > 0 ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => removeConcession(item.id)}
                                    >
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                    <span className="w-8 text-center font-medium">{quantity}</span>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => addConcession(item)}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addConcession(item)}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Combo Deals Section */}
                  {availableCombos.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                        🎉 Combo Deals - Save More!
                      </h3>
                      <div className="grid gap-3">
                        {availableCombos.map((combo) => {
                          const quantity = getComboQuantity(combo.id);
                          return (
                            <div
                              key={combo.id}
                              className="flex items-center justify-between p-3 rounded-lg border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
                            >
                              <div>
                                <p className="font-medium">{combo.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {combo.combo_deal_items?.map(i => `${i.quantity}x ${i.concession_items?.name}`).join(' + ')}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs line-through text-muted-foreground">${combo.original_price.toFixed(2)}</span>
                                  <span className="font-semibold" style={{ color: cinema.primary_color }}>${combo.combo_price.toFixed(2)}</span>
                                  <Badge variant="secondary" className="text-xs">Save ${(combo.original_price - combo.combo_price).toFixed(2)}</Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {quantity > 0 ? (
                                  <>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => removeCombo(combo.id)}>
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                    <span className="w-8 text-center font-medium">{quantity}</span>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => addCombo(combo)}>
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button variant="outline" size="sm" onClick={() => addCombo(combo)}>
                                    <Plus className="h-4 w-4 mr-1" />Add
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 pt-6 border-t mt-6">
                    <Button variant="outline" onClick={() => setStep('seats')}>
                      Back
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => setStep('details')}
                      style={{ backgroundColor: cinema.primary_color }}
                    >
                      Continue to Details
                      {(concessionsSubtotal + combosSubtotal) > 0 && ` (+$${(concessionsSubtotal + combosSubtotal).toFixed(2)})`}
                    </Button>
                  </div>
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
                    <Button variant="outline" onClick={() => setStep(concessionItems.length > 0 ? 'snacks' : 'seats')}>
                      Back
                    </Button>
                    {cinema.payment_gateway && cinema.payment_gateway !== 'none' && cinema.payment_gateway_configured ? (
                      <Button
                        className="flex-1"
                        onClick={() => setStep('payment')}
                        disabled={!bookingData.customer_name || !bookingData.customer_email}
                        style={{ backgroundColor: cinema.primary_color }}
                      >
                        Continue to Payment - ${totalAmount.toFixed(2)}
                      </Button>
                    ) : (
                      <Button
                        className="flex-1"
                        onClick={handleBooking}
                        disabled={!bookingData.customer_name || !bookingData.customer_email || submitting}
                        style={{ backgroundColor: cinema.primary_color }}
                      >
                        {submitting ? 'Processing...' : `Confirm Booking - $${totalAmount.toFixed(2)}`}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 'payment' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment
                  </CardTitle>
                  <CardDescription>Complete your payment to confirm the booking</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span>Tickets ({selectedSeats.length})</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between mb-2 text-green-600">
                        <span>Discount</span>
                        <span>-${discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>Total</span>
                      <span style={{ color: cinema.primary_color }}>${totalAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  <Alert>
                    <CreditCard className="h-4 w-4" />
                    <AlertDescription>
                      You will be redirected to {cinema.payment_gateway === 'stripe' ? 'Stripe' : cinema.payment_gateway === 'flutterwave' ? 'Flutterwave' : 'Paystack'} to complete your payment securely.
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-4">
                    <Button variant="outline" onClick={() => setStep('details')}>
                      Back
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={async () => {
                        setProcessingPayment(true);
                        try {
                          // Create pending booking first
                          const { data: refData } = await supabase.rpc('generate_booking_reference');
                          const bookingReference = refData as string;
                          
                          const { data: booking, error: bookingError } = await supabase
                            .from('bookings')
                            .insert({
                              organization_id: cinema.id,
                              showtime_id: showtime!.id,
                              customer_name: bookingData.customer_name,
                              customer_email: bookingData.customer_email,
                              customer_phone: bookingData.customer_phone || null,
                              total_amount: totalAmount,
                              discount_amount: discountAmount,
                              promo_code_id: appliedPromo?.id || null,
                              booking_reference: bookingReference,
                              status: 'pending',
                            })
                            .select()
                            .single();

                          if (bookingError) throw bookingError;

                          // Book the seats
                          const seatsToBook = selectedSeats.map(seat => ({
                            booking_id: booking.id,
                            showtime_id: showtime!.id,
                            row_label: seat.row_label,
                            seat_number: seat.seat_number,
                            seat_type: seat.seat_type,
                            price: seat.price,
                          }));

                          await supabase.from('booked_seats').insert(seatsToBook);

                          // Initialize payment
                          const { data: paymentData, error: paymentError } = await supabase.functions.invoke('process-payment', {
                            body: {
                              bookingReference,
                              amount: totalAmount,
                              currency: 'USD',
                              customerEmail: bookingData.customer_email,
                              customerName: bookingData.customer_name,
                              gateway: cinema.payment_gateway,
                              publicKey: cinema.payment_gateway_public_key,
                              returnUrl: `${window.location.origin}/cinema/${slug}/book?showtime=${showtimeId}`,
                            },
                          });

                          if (paymentError) throw paymentError;

                          if (paymentData.paymentUrl) {
                            window.location.href = paymentData.paymentUrl;
                          } else {
                            throw new Error('No payment URL received');
                          }
                        } catch (error: any) {
                          console.error('Payment error:', error);
                          toast.error(error.message || 'Failed to process payment');
                          setProcessingPayment(false);
                        }
                      }}
                      disabled={processingPayment}
                      style={{ backgroundColor: cinema.primary_color }}
                    >
                      {processingPayment ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Redirecting to payment...
                        </>
                      ) : (
                        `Pay $${totalAmount.toFixed(2)}`
                      )}
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
                  <div className="border-t pt-4 space-y-3">
                    {selectedSeats.map((seat, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>
                          {seat.row_label}{seat.seat_number}
                          {seat.seat_type === 'vip' && ' (VIP)'}
                        </span>
                        <span>${seat.price.toFixed(2)}</span>
                      </div>
                    ))}

                    {/* Concessions */}
                    {selectedConcessions.length > 0 && (
                      <>
                        <div className="flex justify-between text-sm pt-2 border-t">
                          <span className="font-medium flex items-center gap-1">
                            <Popcorn className="h-3 w-3" /> Snacks
                          </span>
                        </div>
                        {selectedConcessions.map((c) => (
                          <div key={c.item.id} className="flex justify-between text-sm">
                            <span>{c.item.name} x{c.quantity}</span>
                            <span>${(c.item.price * c.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </>
                    )}
                    
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>

                    {/* Promo Code */}
                    <div className="pt-2">
                      {appliedPromo ? (
                        <div className="flex items-center justify-between bg-green-500/10 p-2 rounded">
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-mono">{appliedPromo.code}</span>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={removePromoCode}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Promo code"
                              value={promoCode}
                              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                              className="font-mono text-sm"
                            />
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={applyPromoCode}
                              disabled={promoLoading || !promoCode}
                            >
                              Apply
                            </Button>
                          </div>
                          {promoError && (
                            <p className="text-xs text-destructive">{promoError}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount</span>
                        <span>-${discountAmount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between font-bold pt-2 border-t">
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
