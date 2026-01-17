import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Film, Clock, Calendar, MapPin, ArrowLeft, Ticket, Check, AlertCircle, Tag, X, CreditCard, Loader2, Popcorn, Plus, Minus, Gift, Star, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoyaltyRedemption } from '@/components/loyalty/LoyaltyRedemption';
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

// Utility function to save ticket as image
const saveTicketAsImage = async (
  elementRef: React.RefObject<HTMLDivElement>,
  bookingReference: string,
  setSaving: (value: boolean) => void
) => {
  if (!elementRef.current || !bookingReference) return;
  
  setSaving(true);
  try {
    const canvas = await html2canvas(elementRef.current, {
      backgroundColor: '#1a1a2e',
      scale: 2,
      useCORS: true,
    });
    
    const link = document.createElement('a');
    link.download = `ticket-${bookingReference}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    toast.success('Ticket saved to your device!');
  } catch (error) {
    console.error('Failed to save ticket:', error);
    toast.error('Failed to save ticket. Please take a screenshot instead.');
  } finally {
    setSaving(false);
  }
};

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
  const [appliedLoyaltyReward, setAppliedLoyaltyReward] = useState<{ reward: any; customer: any; discount: number } | null>(null);
  const [savingTicket, setSavingTicket] = useState(false);
  
  const ticketRef = useRef<HTMLDivElement>(null);
  const fallbackTicketRef = useRef<HTMLDivElement>(null);

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

  // Handle payment callback - must wait for cinema to be loaded
  useEffect(() => {
    if (paymentStatus && paymentRef && cinema) {
      handlePaymentCallback();
    }
  }, [paymentStatus, paymentRef, cinema]);

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
          organizationId: cinema.id,
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
    let promoDiscount = 0;
    if (appliedPromo && ticketsSubtotal >= appliedPromo.min_purchase_amount) {
      if (appliedPromo.discount_type === 'percentage') {
        promoDiscount = ticketsSubtotal * (appliedPromo.discount_value / 100);
      } else {
        promoDiscount = Math.min(appliedPromo.discount_value, ticketsSubtotal);
      }
    }
    return promoDiscount;
  };
  
  const promoDiscountAmount = calculateDiscount();
  const loyaltyDiscountAmount = appliedLoyaltyReward?.discount || 0;
  const discountAmount = promoDiscountAmount + loyaltyDiscountAmount;
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
      
      // Check usage limit
      if (data.max_uses && data.current_uses >= data.max_uses) {
        setPromoError('This promo code has reached its usage limit');
        return;
      }
      
      // Check minimum purchase
      if (data.min_purchase_amount && ticketsSubtotal < data.min_purchase_amount) {
        setPromoError(`Minimum purchase of $${data.min_purchase_amount} required`);
        return;
      }
      
      setAppliedPromo(data as PromoCode);
      toast.success('Promo code applied!');
    } catch (err) {
      setPromoError('Failed to apply promo code');
    } finally {
      setPromoLoading(false);
    }
  };

  const removePromoCode = () => {
    setAppliedPromo(null);
    setPromoCode('');
    setPromoError(null);
  };

  const handleBooking = async () => {
    if (!showtime || !cinema || selectedSeats.length === 0) return;
    
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
          status: 'paid', // Mark as paid since no payment gateway
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Book seats
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

      // Book concessions
      if (selectedConcessions.length > 0) {
        const concessionsToBook = selectedConcessions.map(c => ({
          booking_id: booking.id,
          concession_item_id: c.item.id,
          quantity: c.quantity,
          unit_price: c.item.price,
        }));

        await supabase.from('booking_concessions').insert(concessionsToBook);
      }

      // Book combos
      if (selectedCombos.length > 0) {
        const combosToBook = selectedCombos.map(c => ({
          booking_id: booking.id,
          combo_deal_id: c.combo.id,
          quantity: c.quantity,
          unit_price: c.combo.combo_price,
        }));

        await supabase.from('booking_combos').insert(combosToBook);
      }

      // Update promo code usage
      if (appliedPromo) {
        await supabase
          .from('promo_codes')
          .update({ current_uses: (appliedPromo as any).current_uses + 1 })
          .eq('id', appliedPromo.id);
      }

      // Handle loyalty reward redemption
      if (appliedLoyaltyReward) {
        // Deduct points from customer
        await supabase
          .from('customers')
          .update({ 
            loyalty_points: appliedLoyaltyReward.customer.loyalty_points - appliedLoyaltyReward.reward.points_required 
          })
          .eq('id', appliedLoyaltyReward.customer.id);

        // Record transaction
        await supabase
          .from('loyalty_transactions')
          .insert({
            organization_id: cinema.id,
            customer_id: appliedLoyaltyReward.customer.id,
            booking_id: booking.id,
            transaction_type: 'redemption',
            points: -appliedLoyaltyReward.reward.points_required,
            reward_id: appliedLoyaltyReward.reward.id,
            description: `Redeemed: ${appliedLoyaltyReward.reward.name}`,
          });
      }

      // Send confirmation email
      await supabase.functions.invoke('send-booking-confirmation', {
        body: {
          bookingReference,
          customerEmail: bookingData.customer_email,
          customerName: bookingData.customer_name,
          movieTitle: showtime.movies.title,
          showtime: format(new Date(showtime.start_time), 'PPp'),
          screenName: showtime.screens.name,
          seats: selectedSeats.map(s => `${s.row_label}${s.seat_number}`).join(', '),
          totalAmount,
          cinemaName: cinema.name,
          organizationId: cinema.id,
        },
      });

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

  // Group seats by row
  const seatsByRow = seatLayouts.reduce((acc, seat) => {
    if (!acc[seat.row_label]) acc[seat.row_label] = [];
    acc[seat.row_label].push(seat);
    return acc;
  }, {} as Record<string, any[]>);

  // Sort seats within each row by seat number
  Object.keys(seatsByRow).forEach(row => {
    seatsByRow[row].sort((a: any, b: any) => a.seat_number - b.seat_number);
  });

  // Group concessions by category
  const concessionsByCategory = concessionItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ConcessionItem[]>);

  const primaryColor = cinema?.primary_color || '#8b5cf6';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  if (!cinema || !showtime) {
    return (
      <div 
        ref={fallbackTicketRef}
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ backgroundColor: '#0f0f1a' }}
      >
        {/* If we have a booking reference from payment callback, show confirmation */}
        {bookingRef ? (
          <div className="text-center max-w-md mx-auto">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6 mx-auto"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <Check className="h-10 w-10" style={{ color: primaryColor }} />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">Booking Confirmed!</h2>
            <p className="text-white/60 mb-4">Your booking reference is:</p>
            
            <div 
              className="text-3xl font-mono font-bold mb-4 px-6 py-3 rounded-xl bg-white/5"
              style={{ color: primaryColor }}
            >
              {bookingRef}
            </div>

            <div className="flex items-center gap-2 mb-8 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 justify-center">
              <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-emerald-400 text-sm font-medium">Guaranteed Unique Reference</span>
            </div>
            
            <div className="bg-white p-5 rounded-2xl mb-6 inline-block">
              <QRCodeSVG
                value={JSON.stringify({ ref: bookingRef, cinema: slug })}
                size={180}
                level="H"
                includeMargin
              />
            </div>
            
            <p className="text-white/60 text-sm mb-6">
              Show this QR code at the gate for entry. A confirmation email has been sent to you.
            </p>
            
            <button
              onClick={() => saveTicketAsImage(fallbackTicketRef, bookingRef, setSavingTicket)}
              disabled={savingTicket}
              className="w-full max-w-xs flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white mb-4 transition-all disabled:opacity-70 mx-auto"
              style={{ backgroundColor: primaryColor }}
            >
              {savingTicket ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  Save Ticket to Device
                </>
              )}
            </button>
            
            <a 
              href={`/cinema/${slug}`}
              className="w-full max-w-xs px-8 py-3 rounded-xl border border-white/20 text-white font-medium hover:bg-white/10 transition-colors text-center block mx-auto"
            >
              Back to Cinema
            </a>
          </div>
        ) : (
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Showtime Not Found</h1>
            <p className="text-white/60 mb-6">The showtime you're looking for doesn't exist or has been removed.</p>
            <a 
              href={`/cinema/${slug}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Cinema
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#0f0f1a' }}
    >
      {/* Compact Header */}
      <header className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <a 
          href={`/cinema/${slug}`}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back</span>
        </a>
        
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <Film className="h-4 w-4" style={{ color: primaryColor }} />
          </div>
          <span className="text-white font-semibold text-sm">{cinema.name}</span>
        </div>

        <div className="w-16" /> {/* Spacer for centering */}
      </header>

      {/* Movie Info Banner */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex gap-3">
          {showtime.movies.poster_url && (
            <img
              src={showtime.movies.poster_url}
              alt={showtime.movies.title}
              className="w-16 h-24 object-cover rounded-lg"
            />
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-lg truncate">{showtime.movies.title}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-white/60">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {showtime.movies.duration_minutes}min
              </span>
              {showtime.movies.rating && (
                <Badge variant="outline" className="text-xs border-white/20 text-white/60">
                  {showtime.movies.rating}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2 text-sm text-white/80">
              <Calendar className="h-3 w-3" style={{ color: primaryColor }} />
              <span>{format(new Date(showtime.start_time), 'EEE, MMM d')}</span>
              <span style={{ color: primaryColor }}>•</span>
              <span style={{ color: primaryColor }}>{format(new Date(showtime.start_time), 'h:mm a')}</span>
            </div>
            <div className="text-xs text-white/40 mt-1">
              {showtime.screens.name}
            </div>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex justify-between">
          {[
            { key: 'seats', label: 'Seats' },
            { key: 'snacks', label: 'Snacks' },
            { key: 'details', label: 'Details' },
            { key: 'payment', label: 'Payment' },
          ].filter(s => {
            if (s.key === 'snacks' && concessionItems.length === 0) return false;
            if (s.key === 'payment' && (!cinema.payment_gateway || cinema.payment_gateway === 'none' || !cinema.payment_gateway_configured)) return false;
            return true;
          }).map((s, idx, arr) => (
            <div key={s.key} className="flex items-center">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                step === s.key || (step === 'confirmation' && idx === arr.length - 1)
                  ? "text-white" 
                  : arr.findIndex(x => x.key === step) > idx || step === 'confirmation'
                    ? "bg-white/20 text-white"
                    : "bg-white/5 text-white/40"
              )} style={step === s.key ? { backgroundColor: primaryColor } : {}}>
                {arr.findIndex(x => x.key === step) > idx || step === 'confirmation' ? (
                  <Check className="h-3 w-3" />
                ) : (
                  idx + 1
                )}
              </div>
              <span className={cn(
                "ml-1.5 text-xs",
                step === s.key ? "text-white" : "text-white/40"
              )}>
                {s.label}
              </span>
              {idx < arr.length - 1 && (
                <div className="w-4 h-px bg-white/10 mx-2" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 px-4 py-4 overflow-auto">
        {step === 'seats' && (
          <div className="space-y-6">
            {/* Screen Indicator */}
            <div className="text-center">
              <div 
                className="w-3/4 mx-auto h-2 rounded-t-full mb-2"
                style={{ backgroundColor: `${primaryColor}40` }}
              />
              <span className="text-xs text-white/40 uppercase tracking-wider">Screen</span>
            </div>

            {/* Seat Map */}
            <div className="overflow-x-auto pb-4">
              <div className="inline-block min-w-full">
                {Object.entries(seatsByRow).sort(([a], [b]) => a.localeCompare(b)).map(([row, seats]) => (
                  <div key={row} className="flex items-center justify-center gap-1 mb-2">
                    <span className="w-6 text-center text-xs text-white/40 font-medium">{row}</span>
                    <div className="flex gap-1">
                      {(seats as any[]).map((seat) => (
                        <button
                          key={seat.id}
                          onClick={() => toggleSeat(seat)}
                          disabled={!seat.is_available || isSeatBooked(seat.row_label, seat.seat_number)}
                          className={cn(
                            "w-7 h-7 rounded-md text-xs font-medium transition-all",
                            getSeatClass(seat)
                          )}
                        >
                          {seat.seat_number}
                        </button>
                      ))}
                    </div>
                    <span className="w-6 text-center text-xs text-white/40 font-medium">{row}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-secondary" />
                <span className="text-white/60">Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-primary/30" />
                <span className="text-white/60">VIP</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-primary ring-2 ring-primary ring-offset-1" />
                <span className="text-white/60">Selected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-destructive/50" />
                <span className="text-white/60">Booked</span>
              </div>
            </div>

            {/* Price Info */}
            <div className="flex justify-center gap-6 text-sm">
              <div className="text-center">
                <span className="text-white/60">Regular</span>
                <p className="font-bold text-white">${showtime.price}</p>
              </div>
              {showtime.vip_price && (
                <div className="text-center">
                  <span className="text-white/60">VIP</span>
                  <p className="font-bold" style={{ color: primaryColor }}>${showtime.vip_price}</p>
                </div>
              )}
            </div>

            {/* Selected Seats Summary */}
            {selectedSeats.length > 0 && (
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white/60 text-sm">Selected Seats</span>
                  <span className="text-white font-medium">
                    {selectedSeats.map(s => `${s.row_label}${s.seat_number}`).join(', ')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60 text-sm">Subtotal</span>
                  <span className="text-lg font-bold" style={{ color: primaryColor }}>
                    ${ticketsSubtotal.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Continue Button */}
            <button
              onClick={() => setStep(concessionItems.length > 0 ? 'snacks' : 'details')}
              disabled={selectedSeats.length === 0}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: selectedSeats.length > 0 ? primaryColor : 'rgba(255,255,255,0.1)' }}
            >
              Continue{concessionItems.length > 0 ? ' to Snacks' : ''} - {selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''}
            </button>
          </div>
        )}

            {step === 'snacks' && (
              <div className="flex flex-col h-full -mx-4 -my-4 bg-[#0a0a14]">
                {/* Snacks Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-center gap-3 mb-1">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${primaryColor}20` }}
                    >
                      <Popcorn className="h-5 w-5" style={{ color: primaryColor }} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Add Snacks</h2>
                      <p className="text-white/40 text-sm">Skip the queue, pre-order your treats</p>
                    </div>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-6 pb-4">
                  {/* Combo Deals Section */}
                  {availableCombos.length > 0 && (
                    <div className="mb-8">
                      <div className="flex items-center gap-2 mb-4">
                        <Gift className="h-5 w-5 text-amber-400" />
                        <h3 className="text-lg font-semibold text-white">Combo Deals</h3>
                        <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">Save More</span>
                      </div>
                      
                      <div className="space-y-3">
                        {availableCombos.map((combo) => {
                          const quantity = getComboQuantity(combo.id);
                          const savings = combo.original_price - combo.combo_price;
                          return (
                            <div 
                              key={combo.id}
                              className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl p-4 border border-amber-500/20"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-white">{combo.name}</h4>
                                    <span className="text-xs text-amber-400 bg-amber-400/20 px-2 py-0.5 rounded-full">
                                      Save ${savings.toFixed(2)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-white/50 mt-1">
                                    {combo.combo_deal_items.map(i => 
                                      `${i.quantity}x ${i.concession_items.name}`
                                    ).join(' + ')}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between mt-3">
                                <div className="flex items-baseline gap-2">
                                  <span className="text-xl font-bold text-amber-400">${combo.combo_price.toFixed(2)}</span>
                                  <span className="text-sm text-white/40 line-through">${combo.original_price.toFixed(2)}</span>
                                </div>
                                
                                {quantity === 0 ? (
                                  <button
                                    onClick={() => addCombo(combo)}
                                    className="px-4 py-2 rounded-xl font-medium text-white transition-all"
                                    style={{ backgroundColor: primaryColor }}
                                  >
                                    Add
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-3 bg-white/10 rounded-xl px-2 py-1">
                                    <button
                                      onClick={() => removeCombo(combo.id)}
                                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                                    >
                                      <Minus className="h-4 w-4" />
                                    </button>
                                    <span className="w-6 text-center font-semibold text-white">{quantity}</span>
                                    <button
                                      onClick={() => addCombo(combo)}
                                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Individual Items by Category */}
                  {Object.entries(concessionsByCategory).map(([category, items]) => (
                    <div key={category} className="mb-8">
                      <h3 className="text-lg font-semibold text-white mb-4 capitalize">{category}</h3>
                      
                      <div className="space-y-3">
                        {items.map((item) => {
                          const quantity = getConcessionQuantity(item.id);
                          return (
                            <div 
                              key={item.id}
                              className="bg-white/5 rounded-2xl p-4 border border-white/10"
                            >
                              <div className="flex gap-4">
                                {item.image_url && (
                                  <img
                                    src={item.image_url}
                                    alt={item.name}
                                    className="w-20 h-20 rounded-xl object-cover"
                                  />
                                )}
                                <div className="flex-1">
                                  <h4 className="font-medium text-white">{item.name}</h4>
                                  {item.description && (
                                    <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{item.description}</p>
                                  )}
                                  
                                  <div className="flex items-center justify-between mt-3">
                                    <span className="text-lg font-bold" style={{ color: primaryColor }}>
                                      ${item.price.toFixed(2)}
                                    </span>
                                    
                                    {quantity === 0 ? (
                                      <button
                                        onClick={() => addConcession(item)}
                                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all"
                                        style={{ backgroundColor: primaryColor }}
                                      >
                                        <Plus className="h-5 w-5" />
                                      </button>
                                    ) : (
                                      <div className="flex items-center gap-2 bg-white/10 rounded-xl px-2 py-1">
                                        <button
                                          onClick={() => removeConcession(item.id)}
                                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                                        >
                                          <Minus className="h-4 w-4" />
                                        </button>
                                        <span className="w-6 text-center font-semibold text-white">{quantity}</span>
                                        <button
                                          onClick={() => addConcession(item)}
                                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                                        >
                                          <Plus className="h-4 w-4" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
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
          <div 
            ref={ticketRef}
            className="flex-1 flex flex-col items-center justify-center text-center py-8 px-6"
          >
            {/* Success Icon */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <Check className="h-10 w-10" style={{ color: primaryColor }} />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">Booking Confirmed!</h2>
            
            {/* Movie Title & Details */}
            {showtime && (
              <div className="mb-4">
                <p className="text-lg font-semibold text-white mb-2">{showtime.movies.title}</p>
                <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-white/70">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(showtime.start_time), 'EEE, MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>{format(new Date(showtime.start_time), 'h:mm a')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    <span>{showtime.screens.name}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Seat Numbers */}
            {selectedSeats.length > 0 && (
              <div className="flex items-center gap-2 mb-4 px-4 py-2 rounded-xl bg-white/5">
                <Ticket className="h-4 w-4" style={{ color: primaryColor }} />
                <span className="text-white/80 text-sm">
                  Seats: {selectedSeats.map(s => `${s.row_label}${s.seat_number}`).join(', ')}
                </span>
              </div>
            )}
            
            <p className="text-white/60 mb-2">Your booking reference is:</p>
            
            <div 
              className="text-3xl font-mono font-bold mb-4 px-6 py-3 rounded-xl bg-white/5"
              style={{ color: primaryColor }}
            >
              {bookingRef}
            </div>

            {/* Purchased Snacks & Combos */}
            {(selectedConcessions.length > 0 || selectedCombos.length > 0) && (
              <div className="w-full max-w-sm mb-4 bg-white/5 rounded-xl p-4 text-left">
                <div className="flex items-center gap-2 mb-3">
                  <Popcorn className="h-4 w-4" style={{ color: primaryColor }} />
                  <span className="text-white/80 text-sm font-medium">Your Order</span>
                </div>
                <div className="space-y-2">
                  {selectedCombos.map((sc) => (
                    <div key={sc.combo.id} className="flex justify-between text-sm">
                      <span className="text-white/70">{sc.quantity}x {sc.combo.name}</span>
                      <span className="text-white">${(sc.combo.combo_price * sc.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  {selectedConcessions.map((sc) => (
                    <div key={sc.item.id} className="flex justify-between text-sm">
                      <span className="text-white/70">{sc.quantity}x {sc.item.name}</span>
                      <span className="text-white">${(sc.item.price * sc.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unique Reference Indicator */}
            <div className="flex items-center gap-2 mb-8 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-emerald-400 text-sm font-medium">Guaranteed Unique Reference</span>
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
            
            <p className="text-white/60 text-sm mb-6 max-w-sm">
              Show this QR code at the gate for entry.
            </p>
            
            {/* Save Ticket Button */}
            <button
              onClick={() => saveTicketAsImage(ticketRef, bookingRef!, setSavingTicket)}
              disabled={savingTicket}
              className="w-full max-w-xs flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white mb-4 transition-all disabled:opacity-70"
              style={{ backgroundColor: primaryColor }}
            >
              {savingTicket ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  Save Ticket to Device
                </>
              )}
            </button>
            
            <a 
              href={`/cinema/${slug}`}
              className="w-full max-w-xs px-8 py-3 rounded-xl border border-white/20 text-white font-medium hover:bg-white/10 transition-colors text-center block"
            >
              Back to Cinema
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
