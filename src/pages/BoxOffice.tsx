import { useState, useEffect, useMemo, useRef } from 'react';
import { format, startOfDay, endOfDay, addDays, isSameDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile, useOrganization } from '@/hooks/useUserProfile';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { 
  Film, Clock, Ticket, DollarSign, Search, 
  Check, X, ArrowLeft, Plus, Minus, Tag, 
  CreditCard, Loader2, LogOut, Receipt, RefreshCw,
  Popcorn, Phone, Printer, User, ClipboardList, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ShiftManagement } from '@/components/boxoffice/ShiftManagement';
import { FloatingOrderSummary } from '@/components/boxoffice/FloatingOrderSummary';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface Showtime {
  id: string;
  start_time: string;
  price: number;
  vip_price: number | null;
  movies: {
    id: string;
    title: string;
    duration_minutes: number;
    poster_url: string | null;
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
  price: number;
  category: string;
  image_url: string | null;
}

interface SelectedConcession {
  item: ConcessionItem;
  quantity: number;
}

interface Customer {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  loyalty_points: number;
}

type Step = 'showtimes' | 'seats_snacks' | 'customer' | 'payment' | 'confirmation';

export default function BoxOffice() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { data: profile } = useUserProfile();
  const { data: organization } = useOrganization();
  const { triggerHaptic, triggerSuccess } = useHapticFeedback();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [step, setStep] = useState<Step>('showtimes');
  const [selectedShowtime, setSelectedShowtime] = useState<Showtime | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([]);
  const [selectedConcessions, setSelectedConcessions] = useState<SelectedConcession[]>([]);
  const [bookingData, setBookingData] = useState<BookingData>({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
  });
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [bookingRef, setBookingRef] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [hasActiveShift, setHasActiveShift] = useState<boolean | null>(null);
  const [showShiftPanel, setShowShiftPanel] = useState(false);
  const [selectedScreen, setSelectedScreen] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Fetch showtimes for selected date
  const { data: showtimes, isLoading: showtimesLoading, refetch: refetchShowtimes } = useQuery({
    queryKey: ['box-office-showtimes', profile?.organization_id, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('showtimes')
        .select(`
          *,
          movies (id, title, duration_minutes, poster_url, rating),
          screens (id, name, rows, columns)
        `)
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .gte('start_time', startOfDay(selectedDate).toISOString())
        .lte('start_time', endOfDay(selectedDate).toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data as Showtime[];
    },
    enabled: !!profile?.organization_id,
    refetchInterval: 30000,
  });

  // Fetch seat layouts
  const { data: seatLayouts } = useQuery({
    queryKey: ['box-office-seats', selectedShowtime?.screens?.id],
    queryFn: async () => {
      if (!selectedShowtime?.screens?.id) return [];
      const { data, error } = await supabase
        .from('seat_layouts')
        .select('*')
        .eq('screen_id', selectedShowtime.screens.id);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedShowtime?.screens?.id,
  });

  // Fetch booked seats
  const { data: bookedSeats, refetch: refetchBookedSeats } = useQuery({
    queryKey: ['box-office-booked-seats', selectedShowtime?.id],
    queryFn: async () => {
      if (!selectedShowtime?.id) return [];
      const { data, error } = await supabase
        .from('booked_seats')
        .select('row_label, seat_number')
        .eq('showtime_id', selectedShowtime.id);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedShowtime?.id,
  });

  // Fetch seat availability for all today's showtimes
  const { data: seatAvailability } = useQuery({
    queryKey: ['box-office-seat-availability', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id || !showtimes) return {};
      
      const showtimeIds = showtimes.map(s => s.id);
      if (showtimeIds.length === 0) return {};

      const { data, error } = await supabase
        .from('booked_seats')
        .select('showtime_id')
        .in('showtime_id', showtimeIds);

      if (error) throw error;

      // Count booked seats per showtime
      const counts: Record<string, number> = {};
      data?.forEach(seat => {
        counts[seat.showtime_id] = (counts[seat.showtime_id] || 0) + 1;
      });

      return counts;
    },
    enabled: !!profile?.organization_id && !!showtimes && showtimes.length > 0,
    refetchInterval: 30000,
  });

  // Fetch concession items
  const { data: concessionItems } = useQuery({
    queryKey: ['box-office-concessions', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('concession_items')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('is_available', true)
        .order('category')
        .order('display_order');
      if (error) throw error;
      return data as ConcessionItem[];
    },
    enabled: !!profile?.organization_id,
  });

  // Fetch today's sales
  const { data: todaysSales, refetch: refetchSales } = useQuery({
    queryKey: ['box-office-today-sales', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return { count: 0, revenue: 0 };
      const today = new Date();
      const { data, error } = await supabase
        .from('bookings')
        .select('total_amount')
        .eq('organization_id', profile.organization_id)
        .gte('created_at', startOfDay(today).toISOString())
        .lte('created_at', endOfDay(today).toISOString())
        .in('status', ['confirmed', 'paid']);

      if (error) throw error;
      const revenue = data?.reduce((sum, b) => sum + Number(b.total_amount), 0) || 0;
      return { count: data?.length || 0, revenue };
    },
    enabled: !!profile?.organization_id,
    refetchInterval: 60000,
  });

  // Real-time seat subscription
  useEffect(() => {
    if (!selectedShowtime?.id) return;

    const channel = supabase
      .channel(`box-office-seats-${selectedShowtime.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'booked_seats',
          filter: `showtime_id=eq.${selectedShowtime.id}`,
        },
        (payload) => {
          const newSeat = payload.new as { row_label: string; seat_number: number };
          setSelectedSeats(prev => {
            const wasSelected = prev.some(
              s => s.row_label === newSeat.row_label && s.seat_number === newSeat.seat_number
            );
            if (wasSelected) {
              toast.warning(`Seat ${newSeat.row_label}${newSeat.seat_number} was just booked`);
              return prev.filter(
                s => !(s.row_label === newSeat.row_label && s.seat_number === newSeat.seat_number)
              );
            }
            return prev;
          });
          refetchBookedSeats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedShowtime?.id]);

  // Get unique screens for filter
  const uniqueScreens = useMemo(() => {
    if (!showtimes) return [];
    const screenMap = new Map<string, { id: string; name: string }>();
    showtimes.forEach(s => {
      if (!screenMap.has(s.screens.id)) {
        screenMap.set(s.screens.id, { id: s.screens.id, name: s.screens.name });
      }
    });
    return Array.from(screenMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [showtimes]);

  // Filter showtimes - exclude past showtimes (only for today) and apply filters
  const filteredShowtimes = useMemo(() => {
    if (!showtimes) return [];
    const now = new Date();
    const isToday = isSameDay(selectedDate, now);
    
    // Filter out past showtimes only for today
    let result = isToday 
      ? showtimes.filter(s => new Date(s.start_time) > now)
      : showtimes;
    
    // Apply screen filter
    if (selectedScreen) {
      result = result.filter(s => s.screens.id === selectedScreen);
    }
    
    // Then apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.movies.title.toLowerCase().includes(query) ||
        s.screens.name.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [showtimes, searchQuery, selectedScreen, selectedDate]);

  // Helper to check if a showtime is sold out
  const getShowtimeAvailability = (showtime: Showtime) => {
    const totalSeats = showtime.screens.rows * showtime.screens.columns;
    const bookedCount = seatAvailability?.[showtime.id] || 0;
    const availableSeats = totalSeats - bookedCount;
    const isSoldOut = availableSeats <= 0;
    const isLowAvailability = availableSeats > 0 && availableSeats / totalSeats < 0.2;
    return { availableSeats, totalSeats, isSoldOut, isLowAvailability };
  };

  // Group showtimes by movie
  const showtimesByMovie = useMemo(() => {
    if (!filteredShowtimes) return [];
    const movieMap = new Map<string, { movie: Showtime['movies']; showtimes: Showtime[] }>();
    
    filteredShowtimes.forEach(showtime => {
      const movieId = showtime.movies.id;
      if (!movieMap.has(movieId)) {
        movieMap.set(movieId, {
          movie: showtime.movies,
          showtimes: [],
        });
      }
      movieMap.get(movieId)!.showtimes.push(showtime);
    });
    
    // Sort showtimes within each movie by start time
    movieMap.forEach(entry => {
      entry.showtimes.sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
    });
    
    return Array.from(movieMap.values());
  }, [filteredShowtimes]);

  // Group concessions by category
  const concessionsByCategory = useMemo(() => {
    if (!concessionItems) return {};
    const grouped: Record<string, ConcessionItem[]> = {};
    concessionItems.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    return grouped;
  }, [concessionItems]);

  // Seat helpers
  const isSeatBooked = (row: string, num: number) => {
    return bookedSeats?.some(s => s.row_label === row && s.seat_number === num);
  };

  const isSeatSelected = (row: string, num: number) => {
    return selectedSeats.some(s => s.row_label === row && s.seat_number === num);
  };

  const toggleSeat = (seat: any) => {
    if (!selectedShowtime || !seat.is_available || isSeatBooked(seat.row_label, seat.seat_number)) return;

    const isSelected = isSeatSelected(seat.row_label, seat.seat_number);
    const price = seat.seat_type === 'vip' && selectedShowtime.vip_price
      ? selectedShowtime.vip_price
      : selectedShowtime.price;

    // Trigger haptic feedback
    triggerHaptic(isSelected ? 'light' : 'medium');

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

  // Concession helpers
  const addConcession = (item: ConcessionItem) => {
    triggerHaptic('medium');
    setSelectedConcessions(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) {
        return prev.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeConcession = (itemId: string) => {
    triggerHaptic('light');
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

  // Calculate totals
  const ticketsSubtotal = selectedSeats.reduce((sum, s) => sum + s.price, 0);
  const concessionsSubtotal = selectedConcessions.reduce((sum, c) => sum + (c.item.price * c.quantity), 0);
  const subtotal = ticketsSubtotal + concessionsSubtotal;
  const discountAmount = appliedPromo 
    ? (appliedPromo.discount_type === 'percentage' 
      ? ticketsSubtotal * (appliedPromo.discount_value / 100) 
      : Math.min(appliedPromo.discount_value, ticketsSubtotal))
    : 0;
  const totalAmount = subtotal - discountAmount;

  // Customer lookup by phone
  const searchCustomerByPhone = async () => {
    if (!phoneSearch.trim() || !profile?.organization_id) return;
    
    setIsSearchingCustomer(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, full_name, email, phone, loyalty_points')
        .eq('organization_id', profile.organization_id)
        .ilike('phone', `%${phoneSearch.replace(/\D/g, '')}%`)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFoundCustomer(data);
        setBookingData({
          customer_name: data.full_name,
          customer_email: data.email,
          customer_phone: data.phone || '',
        });
        toast.success(`Found: ${data.full_name}`);
      } else {
        toast.info('No customer found with that phone number');
        setFoundCustomer(null);
      }
    } catch (error) {
      toast.error('Error searching customer');
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  // Apply promo code
  const applyPromo = async () => {
    if (!promoCode.trim() || !profile?.organization_id) return;
    
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('id, code, discount_type, discount_value, min_purchase_amount')
        .eq('organization_id', profile.organization_id)
        .eq('code', promoCode.toUpperCase())
        .eq('is_active', true)
        .single();
      
      if (error || !data) {
        toast.error('Invalid promo code');
        return;
      }
      
      if (subtotal < data.min_purchase_amount) {
        toast.error(`Minimum purchase of $${data.min_purchase_amount} required`);
        return;
      }
      
      setAppliedPromo(data);
      setPromoCode('');
      toast.success('Promo code applied!');
    } catch (error) {
      toast.error('Failed to apply promo code');
    }
  };

  // Process booking
  const processBooking = async (paymentMethod: 'cash' | 'card') => {
    if (!selectedShowtime || selectedSeats.length === 0 || !profile?.organization_id) return;

    setIsProcessing(true);
    try {
      const { data: refData } = await supabase.rpc('generate_booking_reference');
      const bookingReference = refData as string;

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          organization_id: profile.organization_id,
          showtime_id: selectedShowtime.id,
          customer_name: bookingData.customer_name || 'Walk-in Customer',
          customer_email: bookingData.customer_email || 'walkin@boxoffice.local',
          customer_phone: bookingData.customer_phone || null,
          total_amount: totalAmount,
          discount_amount: discountAmount,
          promo_code_id: appliedPromo?.id || null,
          booking_reference: bookingReference,
          status: 'paid',
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      const seatsToBook = selectedSeats.map(seat => ({
        booking_id: booking.id,
        showtime_id: selectedShowtime.id,
        row_label: seat.row_label,
        seat_number: seat.seat_number,
        seat_type: seat.seat_type,
        price: seat.price,
      }));

      const { error: seatsError } = await supabase
        .from('booked_seats')
        .insert(seatsToBook);

      if (seatsError) throw seatsError;

      // Save concessions
      if (selectedConcessions.length > 0) {
        const concessionsToBook = selectedConcessions.map(c => ({
          booking_id: booking.id,
          concession_item_id: c.item.id,
          quantity: c.quantity,
          unit_price: c.item.price,
        }));

        await supabase
          .from('booking_concessions')
          .insert(concessionsToBook);
      }

      setBookingRef(bookingReference);
      setStep('confirmation');
      toast.success('Booking completed!');
      refetchSales();
    } catch (error: any) {
      console.error('Booking error:', error);
      toast.error(error.message || 'Failed to process booking');
    } finally {
      setIsProcessing(false);
    }
  };

  // Print ticket
  const printTicket = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Courier New', monospace; 
            width: 80mm; 
            padding: 4mm;
            font-size: 12px;
          }
          .header { text-align: center; margin-bottom: 4mm; border-bottom: 1px dashed #000; padding-bottom: 3mm; }
          .header h1 { font-size: 16px; margin-bottom: 2mm; }
          .qr { text-align: center; margin: 4mm 0; }
          .qr svg { width: 50mm; height: 50mm; }
          .ref { text-align: center; font-size: 18px; font-weight: bold; margin: 3mm 0; letter-spacing: 2px; }
          .divider { border-top: 1px dashed #000; margin: 3mm 0; }
          .row { display: flex; justify-content: space-between; margin: 2mm 0; }
          .label { color: #666; }
          .value { font-weight: bold; text-align: right; }
          .seats { margin: 3mm 0; }
          .seats-list { display: flex; flex-wrap: wrap; gap: 2mm; margin-top: 2mm; }
          .seat { background: #f0f0f0; padding: 1mm 2mm; border-radius: 2px; font-weight: bold; }
          .total { font-size: 16px; margin-top: 3mm; }
          .footer { text-align: center; margin-top: 4mm; font-size: 10px; color: #666; }
          .cut-line { border-top: 1px dashed #000; margin: 4mm 0; position: relative; }
          .cut-line::before { content: '✂'; position: absolute; left: -2mm; top: -6px; background: white; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${organization?.name || 'Cinema'}</h1>
          <p>${organization?.address || ''}</p>
        </div>
        
        <div class="qr">
          ${printContent.querySelector('.qr-container')?.innerHTML || ''}
        </div>
        
        <div class="ref">${bookingRef}</div>
        
        <div class="divider"></div>
        
        <div class="row">
          <span class="label">Movie:</span>
          <span class="value">${selectedShowtime?.movies.title}</span>
        </div>
        
        <div class="row">
          <span class="label">Date:</span>
          <span class="value">${selectedShowtime ? format(new Date(selectedShowtime.start_time), 'MMM d, yyyy') : ''}</span>
        </div>
        
        <div class="row">
          <span class="label">Time:</span>
          <span class="value">${selectedShowtime ? format(new Date(selectedShowtime.start_time), 'h:mm a') : ''}</span>
        </div>
        
        <div class="row">
          <span class="label">Screen:</span>
          <span class="value">${selectedShowtime?.screens.name}</span>
        </div>
        
        <div class="seats">
          <span class="label">Seats:</span>
          <div class="seats-list">
            ${selectedSeats.map(s => `<span class="seat">${s.row_label}${s.seat_number}</span>`).join('')}
          </div>
        </div>
        
        ${selectedConcessions.length > 0 ? `
          <div class="divider"></div>
          <div class="label">Concessions:</div>
          ${selectedConcessions.map(c => `
            <div class="row">
              <span>${c.item.name} x${c.quantity}</span>
              <span>$${(c.item.price * c.quantity).toFixed(2)}</span>
            </div>
          `).join('')}
        ` : ''}
        
        <div class="divider"></div>
        
        <div class="row total">
          <span>TOTAL PAID:</span>
          <span>$${totalAmount.toFixed(2)}</span>
        </div>
        
        <div class="cut-line"></div>
        
        <div class="footer">
          <p>Thank you for your purchase!</p>
          <p>Please arrive 15 minutes before showtime.</p>
          <p>${format(new Date(), 'MMM d, yyyy h:mm a')}</p>
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Reset for new sale
  const startNewSale = () => {
    setStep('showtimes');
    setSelectedShowtime(null);
    setSelectedSeats([]);
    setSelectedConcessions([]);
    setBookingData({ customer_name: '', customer_email: '', customer_phone: '' });
    setAppliedPromo(null);
    setPromoCode('');
    setBookingRef(null);
    setFoundCustomer(null);
    setPhoneSearch('');
    refetchShowtimes();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Group seats by row
  const seatsByRow = useMemo(() => {
    if (!seatLayouts) return {};
    const grouped: Record<string, any[]> = {};
    seatLayouts.forEach(seat => {
      if (!grouped[seat.row_label]) {
        grouped[seat.row_label] = [];
      }
      grouped[seat.row_label].push(seat);
    });
    Object.keys(grouped).forEach(row => {
      grouped[row].sort((a, b) => a.seat_number - b.seat_number);
    });
    return grouped;
  }, [seatLayouts]);

  const sortedRows = Object.keys(seatsByRow).sort().reverse();

  if (!profile?.organization_id || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Progress steps configuration
  const progressSteps = [
    { key: 'showtimes', label: 'Showtime', icon: Film },
    { key: 'seats_snacks', label: 'Seats & Snacks', icon: Ticket },
    { key: 'customer', label: 'Customer', icon: User },
    { key: 'payment', label: 'Payment', icon: CreditCard },
  ] as const;

  const currentStepIndex = progressSteps.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20 md:pb-0">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="h-16 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            {step !== 'showtimes' && step !== 'confirmation' && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  if (step === 'seats_snacks') {
                    setStep('showtimes');
                    setSelectedShowtime(null);
                    setSelectedSeats([]);
                  } else if (step === 'customer') {
                    setStep('seats_snacks');
                  } else if (step === 'payment') {
                    setStep('customer');
                  }
                }}
                className="touch-manipulation"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Ticket className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">Box Office</span>
            </div>
            {organization && (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {organization.name}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-muted rounded-xl">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{todaysSales?.count || 0} sales</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold">${todaysSales?.revenue.toFixed(2) || '0.00'}</span>
              </div>
            </div>

            <Button 
              variant={showShiftPanel ? "default" : "outline"} 
              size="sm" 
              onClick={() => setShowShiftPanel(!showShiftPanel)}
              className="gap-2"
            >
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Shift</span>
              {hasActiveShift && (
                <span className="h-2 w-2 bg-green-500 rounded-full" />
              )}
            </Button>

            <Button variant="outline" size="icon" onClick={() => refetchShowtimes()}>
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>

        {/* Progress Stepper - only show during booking flow */}
        {step !== 'showtimes' && step !== 'confirmation' && (
          <div className="px-4 lg:px-6 py-3 bg-muted/50 border-t">
            <div className="flex items-center justify-center gap-1 sm:gap-2 max-w-2xl mx-auto">
            {progressSteps.map((progressStep, index) => {
                const StepIcon = progressStep.icon;
                const isCompleted = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const isUpcoming = index > currentStepIndex;
                const isClickable = isCompleted;

                const handleStepClick = () => {
                  if (!isClickable) return;
                  setStep(progressStep.key);
                };

                return (
                  <div key={progressStep.key} className="flex items-center">
                    <button
                      type="button"
                      onClick={handleStepClick}
                      disabled={!isClickable}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1.5 rounded-full text-xs font-medium transition-colors",
                        isCompleted && "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30",
                        isCurrent && "bg-primary text-primary-foreground cursor-default",
                        isUpcoming && "bg-muted text-muted-foreground cursor-not-allowed",
                        isClickable && "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold",
                        isCompleted && "bg-primary text-primary-foreground",
                        isCurrent && "bg-primary-foreground text-primary",
                        isUpcoming && "bg-muted-foreground/30 text-muted-foreground"
                      )}>
                        {isCompleted ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span className="hidden sm:inline">{progressStep.label}</span>
                    </button>
                    {index < progressSteps.length - 1 && (
                      <div className={cn(
                        "w-4 sm:w-8 h-0.5 mx-1",
                        index < currentStepIndex ? "bg-primary" : "bg-muted-foreground/30"
                      )} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-6">
        {/* Shift Management Panel */}
        {showShiftPanel && user && profile?.organization_id && (
          <div className="mb-6 max-w-md">
            <ShiftManagement 
              userId={user.id}
              organizationId={profile.organization_id}
              onShiftChange={setHasActiveShift}
            />
          </div>
        )}

        {/* Step: Select Showtime */}
        {step === 'showtimes' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">
                  {isSameDay(selectedDate, new Date()) ? "Today's" : "Tomorrow's"} Showtimes
                </h1>
                <p className="text-muted-foreground">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
              </div>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search movies or screens..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Date Picker: Today / Tomorrow */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex gap-1 bg-muted p-1 rounded-lg">
                <Button
                  variant={isSameDay(selectedDate, new Date()) ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedDate(new Date())}
                  className="touch-manipulation gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Today
                </Button>
                <Button
                  variant={isSameDay(selectedDate, addDays(new Date(), 1)) ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedDate(addDays(new Date(), 1))}
                  className="touch-manipulation gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Tomorrow
                </Button>
              </div>

              {/* Screen Filters */}
              {uniqueScreens.length > 1 && (
                <div className="flex flex-wrap gap-2 border-l pl-3 ml-1">
                  <Button
                    variant={selectedScreen === null ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setSelectedScreen(null)}
                    className="touch-manipulation"
                  >
                    All Screens
                  </Button>
                  {uniqueScreens.map((screen) => (
                    <Button
                      key={screen.id}
                      variant={selectedScreen === screen.id ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setSelectedScreen(screen.id)}
                      className="touch-manipulation"
                    >
                      {screen.name}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {showtimesLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-xl" />
                ))}
              </div>
            ) : showtimesByMovie.length === 0 ? (
              <Card className="p-12 text-center">
                <Film className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">No Showtimes Today</h2>
                <p className="text-muted-foreground">There are no scheduled showtimes for today.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {showtimesByMovie.map(({ movie, showtimes: movieShowtimes }) => (
                  <Card 
                    key={movie.id}
                    className="overflow-hidden"
                  >
                    <div className="aspect-[3/4] relative bg-muted">
                      {movie.poster_url ? (
                        <img 
                          src={movie.poster_url} 
                          alt={movie.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="h-16 w-16 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                        <h3 className="font-bold text-white line-clamp-2">{movie.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {movie.rating && (
                            <Badge variant="secondary" className="text-xs">{movie.rating}</Badge>
                          )}
                          <span className="text-white/80 text-sm">{movie.duration_minutes} min</span>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-2">Select a showtime:</p>
                      <div className="flex flex-wrap gap-2">
                        {movieShowtimes.map((showtime) => {
                          const { availableSeats, isSoldOut, isLowAvailability } = getShowtimeAvailability(showtime);
                          
                          return (
                            <Button
                              key={showtime.id}
                              variant="outline"
                              size="sm"
                              disabled={isSoldOut}
                              className={cn(
                                "touch-manipulation flex-col h-auto py-2",
                                !isSoldOut && "hover:bg-primary hover:text-primary-foreground",
                                isLowAvailability && !isSoldOut && "border-amber-500/50",
                                isSoldOut && "opacity-60 cursor-not-allowed"
                              )}
                              onClick={() => {
                                if (!isSoldOut) {
                                  setSelectedShowtime(showtime);
                                  setStep('seats_snacks');
                                }
                              }}
                            >
                              <span className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {format(new Date(showtime.start_time), 'h:mm a')}
                              </span>
                              {isSoldOut ? (
                                <Badge variant="destructive" className="text-[10px] mt-0.5 py-0">
                                  Sold Out
                                </Badge>
                              ) : (
                                <span className={cn(
                                  "text-xs mt-0.5",
                                  isLowAvailability ? "text-amber-500" : "opacity-70"
                                )}>
                                  {availableSeats} left • {showtime.screens.name}
                                </span>
                              )}
                            </Button>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t text-sm text-muted-foreground">
                        <span>From ${Math.min(...movieShowtimes.map(s => s.price)).toFixed(2)}</span>
                        {movieShowtimes.some(s => s.vip_price) && (
                          <span>VIP from ${Math.min(...movieShowtimes.filter(s => s.vip_price).map(s => s.vip_price!)).toFixed(2)}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Select Seats & Snacks (Side by Side) */}
        {step === 'seats_snacks' && selectedShowtime && (
          <div className="space-y-4 pb-24">
            <div>
              <h1 className="text-2xl font-bold">{selectedShowtime.movies.title}</h1>
              <p className="text-muted-foreground">
                {format(new Date(selectedShowtime.start_time), 'h:mm a')} • {selectedShowtime.screens.name}
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Left Panel: Seats */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <Ticket className="h-5 w-5" />
                    Select Seats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-2">
                    <div className="w-3/4 h-2 bg-primary/30 rounded-full mx-auto mb-2" />
                    <span className="text-xs text-muted-foreground uppercase tracking-widest">Screen</span>
                  </div>

                  <ScrollArea className="h-[350px]">
                    <div className="space-y-2 p-2">
                      {sortedRows.map(row => (
                        <div key={row} className="flex items-center gap-2">
                          <span className="w-6 text-center font-medium text-muted-foreground text-sm">{row}</span>
                          <div className="flex gap-1 flex-wrap">
                            {seatsByRow[row].map((seat: any) => {
                              const isBooked = isSeatBooked(seat.row_label, seat.seat_number);
                              const isSelected = isSeatSelected(seat.row_label, seat.seat_number);
                              const isVip = seat.seat_type === 'vip';
                              const isUnavailable = !seat.is_available || seat.seat_type === 'unavailable';

                              return (
                                <button
                                  key={seat.id}
                                  disabled={isBooked || isUnavailable}
                                  onClick={() => toggleSeat(seat)}
                                  className={cn(
                                    'w-8 h-8 rounded text-xs font-medium touch-manipulation',
                                    'flex items-center justify-center',
                                    'transition-all duration-150 ease-out',
                                    'active:scale-90',
                                    isUnavailable && 'bg-muted text-muted-foreground cursor-not-allowed',
                                    isBooked && 'bg-destructive/30 text-destructive cursor-not-allowed',
                                    isSelected && 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1 scale-110',
                                    !isBooked && !isSelected && !isUnavailable && isVip && 'bg-amber-500/20 text-amber-600 hover:bg-amber-500/30 hover:scale-105',
                                    !isBooked && !isSelected && !isUnavailable && !isVip && 'bg-secondary hover:bg-secondary/80 hover:scale-105'
                                  )}
                                >
                                  {seat.seat_number}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  <div className="flex flex-wrap items-center justify-center gap-3 text-xs border-t pt-3">
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-secondary" />
                      <span>Available</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-amber-500/20 border border-amber-500/40" />
                      <span>VIP</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-primary" />
                      <span>Selected</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-destructive/30" />
                      <span>Booked</span>
                    </div>
                  </div>

                  {selectedSeats.length > 0 && (
                    <div className="border-t pt-3">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                        Selected ({selectedSeats.length})
                      </Label>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedSeats
                          .sort((a, b) => a.row_label.localeCompare(b.row_label) || a.seat_number - b.seat_number)
                          .map(seat => (
                            <Badge 
                              key={`${seat.row_label}${seat.seat_number}`}
                              variant={seat.seat_type === 'vip' ? 'default' : 'secondary'}
                              className="cursor-pointer"
                              onClick={() => toggleSeat(seat)}
                            >
                              {seat.row_label}{seat.seat_number}
                              {seat.seat_type === 'vip' && ' ★'}
                              <X className="h-3 w-3 ml-1" />
                            </Badge>
                          ))}
                      </div>
                      <div className="flex justify-between mt-3 font-bold">
                        <span>Tickets</span>
                        <span>${ticketsSubtotal.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Right Panel: Snacks */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <Popcorn className="h-5 w-5" />
                    Add Snacks
                    {selectedConcessions.length > 0 && (
                      <Badge variant="secondary">{selectedConcessions.reduce((sum, c) => sum + c.quantity, 0)}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[450px]">
                    <div className="space-y-4 pr-2">
                      {Object.entries(concessionsByCategory).map(([category, items]) => (
                        <div key={category}>
                          <h3 className="text-sm font-semibold mb-2 capitalize text-muted-foreground">{category}</h3>
                          <div className="grid grid-cols-2 gap-2">
                            {items.map(item => {
                              const qty = getConcessionQuantity(item.id);
                              return (
                                <Card 
                                  key={item.id}
                                  className={cn(
                                    'overflow-hidden cursor-pointer touch-manipulation',
                                    'transition-all duration-150 ease-out',
                                    'hover:scale-[1.02] active:scale-95',
                                    qty > 0 && 'ring-2 ring-primary scale-[1.02]'
                                  )}
                                  onClick={() => addConcession(item)}
                                >
                                  <div className="aspect-[3/2] relative bg-muted">
                                    {item.image_url ? (
                                      <img 
                                        src={item.image_url} 
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <Popcorn className="h-6 w-6 text-muted-foreground" />
                                      </div>
                                    )}
                                    {qty > 0 && (
                                      <div className="absolute top-1 right-1 bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs">
                                        {qty}
                                      </div>
                                    )}
                                  </div>
                                  <CardContent className="p-2">
                                    <h4 className="font-medium text-xs line-clamp-1">{item.name}</h4>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-primary font-bold text-sm">${item.price.toFixed(2)}</span>
                                      {qty > 0 && (
                                        <Button 
                                          variant="outline" 
                                          size="icon" 
                                          className="h-5 w-5"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            removeConcession(item.id);
                                          }}
                                        >
                                          <Minus className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {Object.keys(concessionsByCategory).length === 0 && (
                        <div className="text-center py-8">
                          <Popcorn className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground text-sm">No concession items available</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  {selectedConcessions.length > 0 && (
                    <div className="border-t pt-3 mt-3 space-y-1">
                      {selectedConcessions.map(c => (
                        <div key={c.item.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{c.item.name} × {c.quantity}</span>
                          <span>${(c.item.price * c.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold pt-2">
                        <span>Snacks</span>
                        <span>${concessionsSubtotal.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Bottom Order Summary Bar */}
            <FloatingOrderSummary
              selectedSeats={selectedSeats}
              selectedConcessions={selectedConcessions}
              subtotal={subtotal}
              onContinue={() => setStep('customer')}
            />
          </div>
        )}

        {/* Step: Customer Info */}
        {step === 'customer' && selectedShowtime && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Customer Information</h1>
              <p className="text-muted-foreground">Optional - leave blank for walk-in customer</p>
            </div>

            {/* Phone Lookup */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Phone className="h-4 w-4" />
                  Quick Customer Lookup
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter phone number..."
                    value={phoneSearch}
                    onChange={(e) => setPhoneSearch(e.target.value)}
                    className="h-12"
                  />
                  <Button 
                    onClick={searchCustomerByPhone}
                    disabled={isSearchingCustomer || !phoneSearch.trim()}
                    className="h-12"
                  >
                    {isSearchingCustomer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                {foundCustomer && (
                  <div className="mt-3 p-3 bg-primary/10 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      <span className="font-medium">{foundCustomer.full_name}</span>
                      <Badge variant="secondary">{foundCustomer.loyalty_points} pts</Badge>
                    </div>
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Customer name (optional)"
                    value={bookingData.customer_name}
                    onChange={(e) => setBookingData(prev => ({ ...prev, customer_name: e.target.value }))}
                    className="h-12 text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Email for receipt (optional)"
                    value={bookingData.customer_email}
                    onChange={(e) => setBookingData(prev => ({ ...prev, customer_email: e.target.value }))}
                    className="h-12 text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Phone number (optional)"
                    value={bookingData.customer_phone}
                    onChange={(e) => setBookingData(prev => ({ ...prev, customer_phone: e.target.value }))}
                    className="h-12 text-lg"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Promo Code */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Tag className="h-4 w-4" />
                  Promo Code
                </CardTitle>
              </CardHeader>
              <CardContent>
                {appliedPromo ? (
                  <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-primary" />
                      <span className="font-mono">{appliedPromo.code}</span>
                      <Badge variant="secondary">
                        {appliedPromo.discount_type === 'percentage' 
                          ? `${appliedPromo.discount_value}% off` 
                          : `$${appliedPromo.discount_value} off`}
                      </Badge>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setAppliedPromo(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter promo code"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      className="uppercase h-12"
                    />
                    <Button onClick={applyPromo} className="h-12">Apply</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tickets × {selectedSeats.length}</span>
                  <span>${ticketsSubtotal.toFixed(2)}</span>
                </div>
                {selectedConcessions.map(c => (
                  <div key={c.item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{c.item.name} × {c.quantity}</span>
                    <span>${(c.item.price * c.quantity).toFixed(2)}</span>
                  </div>
                ))}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-primary">
                    <span>Discount</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button 
              size="lg" 
              className="w-full h-14 text-lg touch-manipulation"
              onClick={() => setStep('payment')}
            >
              Proceed to Payment
            </Button>
          </div>
        )}

        {/* Step: Payment */}
        {step === 'payment' && selectedShowtime && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Payment</h1>
              <p className="text-muted-foreground">Select payment method</p>
            </div>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  ${totalAmount.toFixed(2)}
                </div>
                <p className="text-muted-foreground">
                  {selectedSeats.length} ticket{selectedSeats.length > 1 ? 's' : ''}
                  {selectedConcessions.length > 0 && ` + ${selectedConcessions.length} item${selectedConcessions.length > 1 ? 's' : ''}`}
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Button 
                size="lg" 
                variant="outline"
                className="h-24 flex-col gap-2 touch-manipulation"
                onClick={() => processBooking('cash')}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <>
                    <DollarSign className="h-8 w-8" />
                    <span className="text-lg">Cash</span>
                  </>
                )}
              </Button>
              <Button 
                size="lg" 
                className="h-24 flex-col gap-2 touch-manipulation"
                onClick={() => processBooking('card')}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="h-8 w-8" />
                    <span className="text-lg">Card</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Confirmation */}
        {step === 'confirmation' && bookingRef && selectedShowtime && (
          <div className="max-w-xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20">
              <Check className="h-10 w-10 text-primary" />
            </div>

            <div>
              <h1 className="text-2xl font-bold">Booking Complete!</h1>
              <p className="text-muted-foreground">Show this QR code at the gate</p>
            </div>

            <Card className="overflow-hidden" ref={printRef}>
              <CardContent className="p-6 space-y-4">
                <div className="qr-container bg-white p-6 rounded-xl inline-block">
                  <QRCodeSVG 
                    value={JSON.stringify({ ref: bookingRef, cinema: organization?.slug })}
                    size={200}
                    level="H"
                  />
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Booking Reference</p>
                  <p className="text-2xl font-mono font-bold">{bookingRef}</p>
                </div>

                <div className="border-t pt-4 space-y-2 text-left">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Movie</span>
                    <span className="font-medium">{selectedShowtime.movies.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time</span>
                    <span>{format(new Date(selectedShowtime.start_time), 'h:mm a')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Screen</span>
                    <span>{selectedShowtime.screens.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Seats</span>
                    <span>{selectedSeats.map(s => `${s.row_label}${s.seat_number}`).join(', ')}</span>
                  </div>
                  {selectedConcessions.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-muted-foreground mb-1">Concessions:</p>
                      {selectedConcessions.map(c => (
                        <div key={c.item.id} className="flex justify-between text-sm">
                          <span>{c.item.name} × {c.quantity}</span>
                          <span>${(c.item.price * c.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-between font-bold pt-2 border-t">
                    <span>Total Paid</span>
                    <span>${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Button 
                size="lg" 
                variant="outline"
                className="h-14 text-lg touch-manipulation"
                onClick={printTicket}
              >
                <Printer className="h-5 w-5 mr-2" />
                Print Ticket
              </Button>
              <Button 
                size="lg" 
                className="h-14 text-lg touch-manipulation"
                onClick={startNewSale}
              >
                <Plus className="h-5 w-5 mr-2" />
                New Sale
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Stats Bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-card border-t p-4">
        <div className="flex items-center justify-around">
          <div className="text-center">
            <p className="text-2xl font-bold">{todaysSales?.count || 0}</p>
            <p className="text-xs text-muted-foreground">Sales Today</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">${todaysSales?.revenue.toFixed(2) || '0.00'}</p>
            <p className="text-xs text-muted-foreground">Revenue</p>
          </div>
        </div>
      </div>
    </div>
  );
}
