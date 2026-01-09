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
import { cn } from '@/lib/utils';

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
  const fromBooking = searchParams.get('fromBooking') === 'true';

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

  // Load pre-selected seats from CinemaBooking page
  useEffect(() => {
    if (fromBooking) {
      const storedSeats = sessionStorage.getItem('selectedSeats');
      if (storedSeats) {
        try {
          const seats = JSON.parse(storedSeats) as SelectedSeat[];
          setSelectedSeats(seats);
          setStep('snacks'); // Skip to snacks since seats are already selected
          sessionStorage.removeItem('selectedSeats'); // Clean up
        } catch (e) {
          console.error('Error parsing stored seats:', e);
        }
      }
    }
  }, [fromBooking]);

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

  const primaryColor = cinema?.primary_color || '#DC2626';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <div className="animate-pulse text-white/60">Loading...</div>
      </div>
    );
  }

  if (!showtime || !cinema) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <div className="text-center">
          <Film className="h-16 w-16 text-white/40 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Showtime Not Found</h1>
          <a 
            href={`/cinema/${slug}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium"
            style={{ backgroundColor: primaryColor }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Cinema
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col lg:flex-row">
      {/* Left Panel - Movie Info & Order Summary */}
      <div className="lg:w-2/5 xl:w-1/3 relative overflow-hidden lg:min-h-screen lg:sticky lg:top-0">
        {/* Poster Background */}
        {showtime.movies.poster_url && (
          <img 
            src={showtime.movies.poster_url} 
            alt={showtime.movies.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        
        {/* Gradient Overlay */}
        <div 
          className="absolute inset-0"
          style={{
            background: showtime.movies.poster_url 
              ? 'linear-gradient(to bottom, rgba(26, 26, 46, 0.3) 0%, rgba(26, 26, 46, 0.8) 50%, rgba(26, 26, 46, 1) 100%)'
              : `linear-gradient(135deg, ${primaryColor}40 0%, #1a1a2e 100%)`
          }}
        />
        
        {/* Content */}
        <div className="relative z-10 p-6 lg:p-8 flex flex-col min-h-[300px] lg:min-h-screen">
          {/* Back Button & Logo */}
          <div className="flex items-center justify-between mb-6">
            <a 
              href={`/cinema/${slug}`}
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm">Back</span>
            </a>
            <div className="flex items-center gap-2">
              {cinema.logo_url ? (
                <img src={cinema.logo_url} alt={cinema.name} className="h-8 w-auto" />
              ) : (
                <Film className="h-6 w-6" style={{ color: primaryColor }} />
              )}
              <span className="text-white/80 text-sm font-medium">{cinema.name}</span>
            </div>
          </div>

          {/* Movie Info */}
          <div className="mt-auto">
            <div className="flex items-center gap-2 mb-3">
              {showtime.movies.rating && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/20 text-white">
                  {showtime.movies.rating}
                </span>
              )}
              {showtime.movies.genre && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-white/80">
                  {showtime.movies.genre}
                </span>
              )}
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white mb-4 uppercase tracking-wide">
              {showtime.movies.title}
            </h1>
            
            {/* Showtime Details */}
            <div className="flex flex-wrap gap-4 text-white/70 text-sm mb-6">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {showtime.movies.duration_minutes} min
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {format(new Date(showtime.start_time), 'MMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {format(new Date(showtime.start_time), 'h:mm a')}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {showtime.screens.name}
              </span>
            </div>

            {/* Order Summary Card */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <Ticket className="h-5 w-5" style={{ color: primaryColor }} />
                <h3 className="font-semibold text-white">Order Summary</h3>
              </div>
              
              {/* Selected Seats */}
              <div className="mb-4">
                <p className="text-white/60 text-xs uppercase tracking-wide mb-2">Selected Seats ({selectedSeats.length})</p>
                {selectedSeats.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSeats
                      .sort((a, b) => a.row_label.localeCompare(b.row_label) || a.seat_number - b.seat_number)
                      .map((seat) => (
                        <span 
                          key={`${seat.row_label}${seat.seat_number}`} 
                          className="px-2 py-1 rounded-md text-xs font-medium"
                          style={{ 
                            backgroundColor: seat.seat_type === 'vip' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255,255,255,0.1)',
                            color: seat.seat_type === 'vip' ? '#fbbf24' : 'rgba(255,255,255,0.8)'
                          }}
                        >
                          {seat.row_label}{seat.seat_number}
                          {seat.seat_type === 'vip' && ' ★'}
                        </span>
                      ))}
                  </div>
                ) : (
                  <p className="text-white/40 text-sm">No seats selected</p>
                )}
              </div>

              {selectedSeats.length > 0 && (
                <div className="space-y-2 border-t border-white/10 pt-4">
                  {/* Tickets */}
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Tickets × {selectedSeats.length}</span>
                    <span className="text-white">${ticketsSubtotal.toFixed(2)}</span>
                  </div>

                  {/* Concessions */}
                  {selectedConcessions.length > 0 && selectedConcessions.map((c) => (
                    <div key={c.item.id} className="flex justify-between text-sm">
                      <span className="text-white/70">{c.item.name} × {c.quantity}</span>
                      <span className="text-white">${(c.item.price * c.quantity).toFixed(2)}</span>
                    </div>
                  ))}

                  {/* Combos */}
                  {selectedCombos.length > 0 && selectedCombos.map((c) => (
                    <div key={c.combo.id} className="flex justify-between text-sm">
                      <span className="text-white/70">{c.combo.name} × {c.quantity}</span>
                      <span className="text-white">${(c.combo.combo_price * c.quantity).toFixed(2)}</span>
                    </div>
                  ))}

                  {/* Promo Code */}
                  {step !== 'confirmation' && (
                    <div className="pt-2">
                      {appliedPromo ? (
                        <div className="flex items-center justify-between bg-green-500/10 p-2 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-green-400" />
                            <span className="text-sm font-mono text-green-400">{appliedPromo.code}</span>
                          </div>
                          <button 
                            onClick={removePromoCode}
                            className="text-white/60 hover:text-white transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            placeholder="Promo code"
                            value={promoCode}
                            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/40 font-mono text-sm"
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={applyPromoCode}
                            disabled={promoLoading || !promoCode}
                            className="border-white/20 text-white hover:bg-white/10"
                          >
                            Apply
                          </Button>
                        </div>
                      )}
                      {promoError && (
                        <p className="text-xs text-red-400 mt-1">{promoError}</p>
                      )}
                    </div>
                  )}

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-400">
                      <span>Discount</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="border-t border-white/10 pt-3 flex justify-between font-bold">
                    <span className="text-white">Total</span>
                    <span style={{ color: primaryColor }}>${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Booking Steps */}
      <div className="lg:w-3/5 xl:w-2/3 p-6 lg:p-8 flex flex-col">
        {/* Step Indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['seats', 'snacks', 'details', 'payment', 'confirmation'].filter(s => 
            s !== 'payment' || (cinema.payment_gateway && cinema.payment_gateway !== 'none' && cinema.payment_gateway_configured)
          ).map((s, index, arr) => {
            const stepIndex = arr.indexOf(step);
            const thisIndex = index;
            const isActive = s === step;
            const isCompleted = thisIndex < stepIndex;
            
            return (
              <div key={s} className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all"
                  style={{ 
                    backgroundColor: isActive ? primaryColor : isCompleted ? `${primaryColor}40` : 'rgba(255,255,255,0.1)',
                    color: isActive || isCompleted ? 'white' : 'rgba(255,255,255,0.4)'
                  }}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                {index < arr.length - 1 && (
                  <div 
                    className="w-8 h-0.5 rounded"
                    style={{ backgroundColor: isCompleted ? `${primaryColor}60` : 'rgba(255,255,255,0.1)' }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {step === 'seats' && (
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-1">Select Your Seats</h2>
              <p className="text-white/60 text-sm flex items-center gap-2">
                Click on available seats to select them
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Live
                </span>
              </p>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-white/80" />
                <span className="text-white/60 text-xs">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-amber-400 ring-1 ring-amber-500/50" />
                <span className="text-white/60 text-xs">VIP</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full" style={{ backgroundColor: primaryColor }} />
                <span className="text-white/60 text-xs">Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-white/20" />
                <span className="text-white/60 text-xs">Taken</span>
              </div>
            </div>

            {/* Screen indicator */}
            <div className="text-center mb-6">
              <div className="text-white/40 text-xs mb-2">SCREEN</div>
              <div 
                className="h-1 w-3/4 mx-auto rounded-full opacity-60"
                style={{ 
                  background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)`,
                  boxShadow: `0 0 20px ${primaryColor}40`
                }}
              />
            </div>

            {/* Seat Grid */}
            <div className="flex-1 overflow-auto py-4">
              <div className="flex flex-col items-center gap-1.5">
                {Array.from({ length: showtime.screens.rows }, (_, i) => {
                  const rowLabel = String.fromCharCode(65 + i);
                  const rowSeats = seatLayouts
                    .filter(s => s.row_label === rowLabel)
                    .sort((a, b) => a.seat_number - b.seat_number);

                  return (
                    <div key={rowLabel} className="flex items-center gap-2">
                      <span className="w-6 text-xs text-white/40 text-right">{rowLabel}</span>
                      <div className="flex gap-1.5">
                        {rowSeats.map((seat) => {
                          const isBooked = isSeatBooked(seat.row_label, seat.seat_number);
                          const isSelected = isSeatSelected(seat.row_label, seat.seat_number);
                          const isUnavailable = !seat.is_available || seat.seat_type === 'unavailable';
                          const isVip = seat.seat_type === 'vip';
                          const isClickable = !isBooked && !isUnavailable;

                          return (
                            <button
                              key={`${seat.row_label}${seat.seat_number}`}
                              onClick={() => isClickable && toggleSeat(seat)}
                              disabled={!isClickable}
                              className={cn(
                                "w-6 h-6 lg:w-7 lg:h-7 rounded-full transition-all text-xs font-medium",
                                isUnavailable && "opacity-0 cursor-default",
                                !isUnavailable && isBooked && "bg-white/20 cursor-not-allowed",
                                !isUnavailable && !isBooked && !isSelected && isVip && 
                                  "bg-amber-400 hover:bg-amber-300 cursor-pointer ring-1 ring-amber-500/50 text-amber-900",
                                !isUnavailable && !isBooked && !isSelected && !isVip && 
                                  "bg-white/80 hover:bg-white cursor-pointer text-gray-700",
                                isSelected && "cursor-pointer text-white"
                              )}
                              style={isSelected ? { backgroundColor: primaryColor } : undefined}
                              title={`${seat.row_label}${seat.seat_number}${isVip ? ' (VIP)' : ''}`}
                            >
                              {!isUnavailable && seat.seat_number}
                            </button>
                          );
                        })}
                      </div>
                      <span className="w-6 text-xs text-white/40">{rowLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Continue Button */}
            <div className="mt-6">
              <button
                onClick={() => setStep(concessionItems.length > 0 ? 'snacks' : 'details')}
                disabled={selectedSeats.length === 0}
                className="w-full py-4 rounded-xl font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: selectedSeats.length > 0 ? primaryColor : 'rgba(255,255,255,0.1)',
                }}
              >
                {selectedSeats.length > 0 
                  ? `Continue ${concessionItems.length > 0 ? 'to Snacks' : 'to Details'} - $${ticketsSubtotal.toFixed(2)}`
                  : 'Select seats to continue'
                }
              </button>
            </div>
          </div>
        )}

            {step === 'snacks' && (
              <div className="bg-[#1a1a2e] rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${cinema.primary_color}20` }}
                    >
                      <Popcorn className="h-6 w-6" style={{ color: cinema.primary_color }} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Add Snacks & Drinks</h2>
                      <p className="text-white/60 text-sm">Enhance your movie experience</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                  {/* Combo Deals - Show first for prominence */}
                  {availableCombos.length > 0 && (
                    <div>
                      <h3 className="text-white/60 text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span>🎉</span> Combo Deals - Save More!
                      </h3>
                      <div className="grid gap-3">
                        {availableCombos.map((combo) => {
                          const quantity = getComboQuantity(combo.id);
                          const savingsAmount = combo.original_price - combo.combo_price;
                          return (
                            <div
                              key={combo.id}
                              className="flex items-center justify-between p-4 rounded-xl transition-all"
                              style={{ 
                                backgroundColor: quantity > 0 ? `${cinema.primary_color}15` : 'rgba(255,255,255,0.05)',
                                border: quantity > 0 ? `1px solid ${cinema.primary_color}40` : '1px solid rgba(255,255,255,0.1)'
                              }}
                            >
                              <div className="flex-1">
                                <p className="font-semibold text-white">{combo.name}</p>
                                <p className="text-white/50 text-xs mt-1">
                                  {combo.combo_deal_items?.map(i => `${i.quantity}x ${i.concession_items?.name}`).join(' + ')}
                                </p>
                                <div className="flex items-center gap-3 mt-2">
                                  <span className="text-white/40 text-sm line-through">${combo.original_price.toFixed(2)}</span>
                                  <span className="font-bold text-lg" style={{ color: cinema.primary_color }}>${combo.combo_price.toFixed(2)}</span>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                                    Save ${savingsAmount.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                {quantity > 0 ? (
                                  <div className="flex items-center gap-2 bg-white/10 rounded-full p-1">
                                    <button
                                      onClick={() => removeCombo(combo.id)}
                                      className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                      <Minus className="h-4 w-4" />
                                    </button>
                                    <span className="w-6 text-center font-semibold text-white">{quantity}</span>
                                    <button
                                      onClick={() => addCombo(combo)}
                                      className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => addCombo(combo)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all"
                                    style={{ backgroundColor: cinema.primary_color, color: 'white' }}
                                  >
                                    <Plus className="h-4 w-4" />
                                    Add
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Individual Items by Category */}
                  {Object.entries(
                    concessionItems.reduce((acc, item) => {
                      if (!acc[item.category]) acc[item.category] = [];
                      acc[item.category].push(item);
                      return acc;
                    }, {} as Record<string, ConcessionItem[]>)
                  ).map(([category, items]) => (
                    <div key={category}>
                      <h3 className="text-white/60 text-xs uppercase tracking-widest mb-4 capitalize">
                        {category}
                      </h3>
                      <div className="grid gap-3">
                        {items.map((item) => {
                          const quantity = getConcessionQuantity(item.id);
                          return (
                            <div
                              key={item.id}
                              className="flex items-center gap-4 p-4 rounded-xl transition-all"
                              style={{ 
                                backgroundColor: quantity > 0 ? `${cinema.primary_color}10` : 'rgba(255,255,255,0.05)',
                                border: quantity > 0 ? `1px solid ${cinema.primary_color}30` : '1px solid transparent'
                              }}
                            >
                              {/* Image */}
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                />
                              ) : (
                                <div 
                                  className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{ backgroundColor: `${cinema.primary_color}20` }}
                                >
                                  <Popcorn className="h-6 w-6" style={{ color: cinema.primary_color }} />
                                </div>
                              )}
                              
                              {/* Details */}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-white">{item.name}</p>
                                {item.description && (
                                  <p className="text-white/50 text-sm line-clamp-1 mt-0.5">{item.description}</p>
                                )}
                                <p className="font-semibold mt-1" style={{ color: cinema.primary_color }}>
                                  ${item.price.toFixed(2)}
                                </p>
                              </div>
                              
                              {/* Quantity Controls */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {quantity > 0 ? (
                                  <div className="flex items-center gap-2 bg-white/10 rounded-full p-1">
                                    <button
                                      onClick={() => removeConcession(item.id)}
                                      className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                      <Minus className="h-4 w-4" />
                                    </button>
                                    <span className="w-6 text-center font-semibold text-white">{quantity}</span>
                                    <button
                                      onClick={() => addConcession(item)}
                                      className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => addConcession(item)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 text-white/80 text-sm font-medium hover:bg-white/10 hover:border-white/30 transition-all"
                                  >
                                    <Plus className="h-4 w-4" />
                                    Add
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer with Summary */}
                <div className="p-6 border-t border-white/10 space-y-4">
                  {/* Mini Order Summary */}
                  {(selectedConcessions.length > 0 || selectedCombos.length > 0) && (
                    <div className="bg-white/5 rounded-xl p-4 space-y-2">
                      {selectedConcessions.map((c) => (
                        <div key={c.item.id} className="flex justify-between text-sm">
                          <span className="text-white/70">{c.item.name} × {c.quantity}</span>
                          <span className="text-white">${(c.item.price * c.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                      {selectedCombos.map((c) => (
                        <div key={c.combo.id} className="flex justify-between text-sm">
                          <span className="text-white/70">{c.combo.name} × {c.quantity}</span>
                          <span className="text-white">${(c.combo.combo_price * c.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="border-t border-white/10 pt-2 flex justify-between font-semibold">
                        <span className="text-white">Snacks Total</span>
                        <span style={{ color: cinema.primary_color }}>${(concessionsSubtotal + combosSubtotal).toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep('seats')}
                      className="px-6 py-3 rounded-xl border border-white/20 text-white/80 font-medium hover:bg-white/10 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setStep('details')}
                      className="flex-1 py-3 rounded-xl font-semibold text-white transition-all"
                      style={{ backgroundColor: cinema.primary_color }}
                    >
                      Continue to Details
                      {(concessionsSubtotal + combosSubtotal) > 0 && ` (+$${(concessionsSubtotal + combosSubtotal).toFixed(2)})`}
                    </button>
                  </div>
                </div>
              </div>
            )}

        {step === 'details' && (
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-1">Your Details</h2>
              <p className="text-white/60 text-sm">Enter your contact information</p>
            </div>

            {/* Form */}
            <div className="space-y-5">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Full Name *</label>
                <input
                  type="text"
                  value={bookingData.customer_name}
                  onChange={(e) => setBookingData(prev => ({ ...prev, customer_name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-colors"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Email Address *</label>
                <input
                  type="email"
                  value={bookingData.customer_email}
                  onChange={(e) => setBookingData(prev => ({ ...prev, customer_email: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-colors"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Phone Number (optional)</label>
                <input
                  type="tel"
                  value={bookingData.customer_phone}
                  onChange={(e) => setBookingData(prev => ({ ...prev, customer_phone: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-colors"
                  placeholder="Enter your phone number"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep(concessionItems.length > 0 ? 'snacks' : 'seats')}
                className="px-6 py-3 rounded-xl border border-white/20 text-white/80 font-medium hover:bg-white/10 transition-colors"
              >
                Back
              </button>
              {cinema.payment_gateway && cinema.payment_gateway !== 'none' && cinema.payment_gateway_configured ? (
                <button
                  onClick={() => setStep('payment')}
                  disabled={!bookingData.customer_name || !bookingData.customer_email}
                  className="flex-1 py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: (!bookingData.customer_name || !bookingData.customer_email) ? 'rgba(255,255,255,0.1)' : primaryColor }}
                >
                  Continue to Payment - ${totalAmount.toFixed(2)}
                </button>
              ) : (
                <button
                  onClick={handleBooking}
                  disabled={!bookingData.customer_name || !bookingData.customer_email || submitting}
                  className="flex-1 py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: (!bookingData.customer_name || !bookingData.customer_email || submitting) ? 'rgba(255,255,255,0.1)' : primaryColor }}
                >
                  {submitting ? 'Processing...' : `Confirm Booking - $${totalAmount.toFixed(2)}`}
                </button>
              )}
            </div>
          </div>
        )}

        {step === 'payment' && (
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-1">
                <CreditCard className="h-6 w-6" style={{ color: primaryColor }} />
                <h2 className="text-xl font-bold text-white">Payment</h2>
              </div>
              <p className="text-white/60 text-sm">Complete your payment to confirm the booking</p>
            </div>

            {/* Payment Summary */}
            <div className="bg-white/5 rounded-xl p-5 mb-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/70">Tickets ({selectedSeats.length})</span>
                <span className="text-white">${ticketsSubtotal.toFixed(2)}</span>
              </div>
              {(concessionsSubtotal + combosSubtotal) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Snacks & Combos</span>
                  <span className="text-white">${(concessionsSubtotal + combosSubtotal).toFixed(2)}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-400">
                  <span>Discount</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-white/10 pt-3 flex justify-between font-bold">
                <span className="text-white">Total</span>
                <span style={{ color: primaryColor }}>${totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-white/5 rounded-xl p-4 mb-6 flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-white/60 mt-0.5" />
              <p className="text-white/70 text-sm">
                You will be redirected to {cinema.payment_gateway === 'stripe' ? 'Stripe' : cinema.payment_gateway === 'flutterwave' ? 'Flutterwave' : 'Paystack'} to complete your payment securely.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-auto">
              <button
                onClick={() => setStep('details')}
                className="px-6 py-3 rounded-xl border border-white/20 text-white/80 font-medium hover:bg-white/10 transition-colors"
              >
                Back
              </button>
              <button
                onClick={async () => {
                  setProcessingPayment(true);
                  try {
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

                    const seatsToBook = selectedSeats.map(seat => ({
                      booking_id: booking.id,
                      showtime_id: showtime!.id,
                      row_label: seat.row_label,
                      seat_number: seat.seat_number,
                      seat_type: seat.seat_type,
                      price: seat.price,
                    }));

                    await supabase.from('booked_seats').insert(seatsToBook);

                    const { data: paymentData, error: paymentError } = await supabase.functions.invoke('process-payment', {
                      body: {
                        bookingReference,
                        organizationId: cinema.id,
                        amount: totalAmount,
                        currency: 'USD',
                        customerEmail: bookingData.customer_email,
                        customerName: bookingData.customer_name,
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
                className="flex-1 py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                style={{ backgroundColor: primaryColor }}
              >
                {processingPayment ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Redirecting to payment...
                  </>
                ) : (
                  `Pay $${totalAmount.toFixed(2)}`
                )}
              </button>
            </div>
          </div>
        )}

        {step === 'confirmation' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            {/* Success Icon */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <Check className="h-10 w-10" style={{ color: primaryColor }} />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">Booking Confirmed!</h2>
            <p className="text-white/60 mb-4">Your booking reference is:</p>
            
            <div 
              className="text-3xl font-mono font-bold mb-8 px-6 py-3 rounded-xl bg-white/5"
              style={{ color: primaryColor }}
            >
              {bookingRef}
            </div>
            
            {/* QR Code */}
            <div className="bg-white p-5 rounded-2xl mb-6">
              <QRCodeSVG
                value={JSON.stringify({ ref: bookingRef, cinema: cinema.slug })}
                size={180}
                level="H"
                includeMargin
              />
            </div>
            
            <p className="text-white/60 text-sm mb-8 max-w-sm">
              Show this QR code at the gate for entry. Screenshot or save this page.
            </p>
            
            <a 
              href={`/cinema/${slug}`}
              className="px-8 py-3 rounded-xl border border-white/20 text-white font-medium hover:bg-white/10 transition-colors"
            >
              Back to Cinema
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
