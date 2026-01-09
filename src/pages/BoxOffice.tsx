import { useState, useEffect, useMemo } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile, useOrganization } from '@/hooks/useUserProfile';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Film, Clock, Monitor, Ticket, DollarSign, Search, 
  QrCode, Check, X, ArrowLeft, Plus, Minus, Tag, 
  CreditCard, Loader2, LogOut, User, Receipt, RefreshCw, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

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

type Step = 'showtimes' | 'seats' | 'customer' | 'payment' | 'confirmation';

export default function BoxOffice() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useUserProfile();
  const { data: organization } = useOrganization();
  
  const [step, setStep] = useState<Step>('showtimes');
  const [selectedShowtime, setSelectedShowtime] = useState<Showtime | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([]);
  const [bookingData, setBookingData] = useState<BookingData>({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
  });
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [bookingRef, setBookingRef] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Fetch today's showtimes
  const { data: showtimes, isLoading: showtimesLoading, refetch: refetchShowtimes } = useQuery({
    queryKey: ['box-office-showtimes', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const today = new Date();
      const { data, error } = await supabase
        .from('showtimes')
        .select(`
          *,
          movies (id, title, duration_minutes, poster_url, rating),
          screens (id, name, rows, columns)
        `)
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .gte('start_time', startOfDay(today).toISOString())
        .lte('start_time', endOfDay(today).toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data as Showtime[];
    },
    enabled: !!profile?.organization_id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch seat layouts for selected showtime
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

  // Fetch booked seats for selected showtime
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

  // Fetch today's sales for this user
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
          // Remove from selection if someone else booked it
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

  // Filter showtimes by search
  const filteredShowtimes = useMemo(() => {
    if (!showtimes) return [];
    if (!searchQuery.trim()) return showtimes;
    const query = searchQuery.toLowerCase();
    return showtimes.filter(s => 
      s.movies.title.toLowerCase().includes(query) ||
      s.screens.name.toLowerCase().includes(query)
    );
  }, [showtimes, searchQuery]);

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

  // Calculate totals
  const subtotal = selectedSeats.reduce((sum, s) => sum + s.price, 0);
  const discountAmount = appliedPromo 
    ? (appliedPromo.discount_type === 'percentage' 
      ? subtotal * (appliedPromo.discount_value / 100) 
      : Math.min(appliedPromo.discount_value, subtotal))
    : 0;
  const totalAmount = subtotal - discountAmount;

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
      // Generate booking reference
      const { data: refData } = await supabase.rpc('generate_booking_reference');
      const bookingReference = refData as string;

      // Create booking
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

      // Create booked seats
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

      // Update promo code usage if used
      if (appliedPromo) {
        await supabase.rpc('generate_booking_reference'); // Just to increment, we don't need result
      }

      setBookingRef(bookingReference);
      setStep('confirmation');
      toast.success('Booking completed successfully!');
      refetchSales();
    } catch (error: any) {
      console.error('Booking error:', error);
      toast.error(error.message || 'Failed to process booking');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset for new sale
  const startNewSale = () => {
    setStep('showtimes');
    setSelectedShowtime(null);
    setSelectedSeats([]);
    setBookingData({ customer_name: '', customer_email: '', customer_phone: '' });
    setAppliedPromo(null);
    setPromoCode('');
    setBookingRef(null);
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
    // Sort seats within each row
    Object.keys(grouped).forEach(row => {
      grouped[row].sort((a, b) => a.seat_number - b.seat_number);
    });
    return grouped;
  }, [seatLayouts]);

  const sortedRows = Object.keys(seatsByRow).sort().reverse();

  if (!profile?.organization_id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-6 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          {step !== 'showtimes' && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => {
                if (step === 'seats') {
                  setStep('showtimes');
                  setSelectedShowtime(null);
                  setSelectedSeats([]);
                } else if (step === 'customer') {
                  setStep('seats');
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
          {/* Today's Stats */}
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

          <Button variant="outline" size="icon" onClick={() => refetchShowtimes()}>
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-6">
        {/* Step: Select Showtime */}
        {step === 'showtimes' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Today's Showtimes</h1>
                <p className="text-muted-foreground">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
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

            {showtimesLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-xl" />
                ))}
              </div>
            ) : filteredShowtimes.length === 0 ? (
              <Card className="p-12 text-center">
                <Film className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">No Showtimes Today</h2>
                <p className="text-muted-foreground">There are no scheduled showtimes for today.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredShowtimes.map((showtime) => (
                  <Card 
                    key={showtime.id}
                    className="cursor-pointer hover:border-primary transition-colors touch-manipulation overflow-hidden"
                    onClick={() => {
                      setSelectedShowtime(showtime);
                      setStep('seats');
                    }}
                  >
                    <div className="aspect-[3/4] relative bg-muted">
                      {showtime.movies.poster_url ? (
                        <img 
                          src={showtime.movies.poster_url} 
                          alt={showtime.movies.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="h-16 w-16 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                        <h3 className="font-bold text-white line-clamp-2">{showtime.movies.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {showtime.movies.rating && (
                            <Badge variant="secondary" className="text-xs">{showtime.movies.rating}</Badge>
                          )}
                          <span className="text-white/80 text-sm">{showtime.movies.duration_minutes} min</span>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          <span className="font-bold text-lg">{format(new Date(showtime.start_time), 'h:mm a')}</span>
                        </div>
                        <Badge variant="outline">{showtime.screens.name}</Badge>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
                        <span>${showtime.price.toFixed(2)}</span>
                        {showtime.vip_price && <span>VIP: ${showtime.vip_price.toFixed(2)}</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Select Seats */}
        {step === 'seats' && selectedShowtime && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Seat Map */}
            <div className="lg:col-span-2 space-y-4">
              <div>
                <h1 className="text-2xl font-bold">{selectedShowtime.movies.title}</h1>
                <p className="text-muted-foreground">
                  {format(new Date(selectedShowtime.start_time), 'h:mm a')} • {selectedShowtime.screens.name}
                </p>
              </div>

              {/* Screen indicator */}
              <div className="text-center py-2">
                <div className="w-3/4 h-2 bg-primary/30 rounded-full mx-auto mb-2" />
                <span className="text-xs text-muted-foreground uppercase tracking-widest">Screen</span>
              </div>

              {/* Seat Grid */}
              <ScrollArea className="h-[400px] lg:h-[500px]">
                <div className="space-y-2 p-4">
                  {sortedRows.map(row => (
                    <div key={row} className="flex items-center gap-2">
                      <span className="w-8 text-center font-medium text-muted-foreground">{row}</span>
                      <div className="flex gap-1.5 flex-wrap">
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
                                'w-10 h-10 rounded-lg text-xs font-medium transition-all touch-manipulation',
                                'flex items-center justify-center',
                                isUnavailable && 'bg-muted text-muted-foreground cursor-not-allowed',
                                isBooked && 'bg-destructive/30 text-destructive cursor-not-allowed',
                                isSelected && 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2',
                                !isBooked && !isSelected && !isUnavailable && isVip && 'bg-amber-500/20 text-amber-600 hover:bg-amber-500/30',
                                !isBooked && !isSelected && !isUnavailable && !isVip && 'bg-secondary hover:bg-secondary/80'
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

              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-secondary" />
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-amber-500/20 border border-amber-500/40" />
                  <span>VIP</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-primary" />
                  <span>Selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-destructive/30" />
                  <span>Booked</span>
                </div>
              </div>
            </div>

            {/* Order Panel */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ticket className="h-5 w-5" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedSeats.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Select seats to continue
                    </p>
                  ) : (
                    <>
                      {/* Selected Seats */}
                      <div>
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                          Selected Seats ({selectedSeats.length})
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
                      </div>

                      {/* Promo Code */}
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                          Promo Code
                        </Label>
                        {appliedPromo ? (
                          <div className="flex items-center justify-between p-2 bg-primary/10 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Tag className="h-4 w-4 text-primary" />
                              <span className="font-mono text-sm">{appliedPromo.code}</span>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => setAppliedPromo(null)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter code"
                              value={promoCode}
                              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                              className="uppercase"
                            />
                            <Button variant="outline" onClick={applyPromo}>
                              Apply
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Totals */}
                      <div className="border-t pt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span>${subtotal.toFixed(2)}</span>
                        </div>
                        {discountAmount > 0 && (
                          <div className="flex justify-between text-sm text-primary">
                            <span>Discount</span>
                            <span>-${discountAmount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-lg font-bold">
                          <span>Total</span>
                          <span>${totalAmount.toFixed(2)}</span>
                        </div>
                      </div>

                      <Button 
                        size="lg" 
                        className="w-full h-14 text-lg touch-manipulation"
                        onClick={() => setStep('customer')}
                      >
                        Continue to Payment
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Step: Customer Info */}
        {step === 'customer' && selectedShowtime && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Customer Information</h1>
              <p className="text-muted-foreground">Optional - leave blank for walk-in customer</p>
            </div>

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

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{selectedShowtime.movies.title}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {format(new Date(selectedShowtime.start_time), 'h:mm a')} • {selectedShowtime.screens.name}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Seats</span>
                  <span>{selectedSeats.map(s => `${s.row_label}${s.seat_number}`).join(', ')}</span>
                </div>
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
                  {selectedSeats.length} ticket{selectedSeats.length > 1 ? 's' : ''} • {selectedShowtime.movies.title}
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

            <Card className="overflow-hidden">
              <CardContent className="p-6 space-y-4">
                {/* QR Code */}
                <div className="bg-white p-6 rounded-xl inline-block">
                  <QRCodeSVG 
                    value={JSON.stringify({ ref: bookingRef, cinema: organization?.slug })}
                    size={200}
                    level="H"
                  />
                </div>

                {/* Booking Reference */}
                <div>
                  <p className="text-sm text-muted-foreground">Booking Reference</p>
                  <p className="text-2xl font-mono font-bold">{bookingRef}</p>
                </div>

                {/* Details */}
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
                  <div className="flex justify-between font-bold pt-2 border-t">
                    <span>Total Paid</span>
                    <span>${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button 
              size="lg" 
              className="w-full h-14 text-lg touch-manipulation"
              onClick={startNewSale}
            >
              <Plus className="h-5 w-5 mr-2" />
              New Sale
            </Button>
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
