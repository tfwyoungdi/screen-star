import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { format, addDays, subDays, isSameDay, startOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Clock, Heart, Minus, Plus, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Movie {
  id: string;
  title: string;
  duration_minutes: number;
  poster_url: string | null;
  description: string | null;
  genre: string | null;
  rating: string | null;
}

interface Screen {
  id: string;
  name: string;
  rows: number;
  columns: number;
}

interface Showtime {
  id: string;
  start_time: string;
  price: number;
  vip_price: number | null;
  movie_id: string;
  screen_id: string;
  screens: Screen;
  movies: Movie;
}

interface SelectedSeat {
  row_label: string;
  seat_number: number;
  seat_type: string;
  price: number;
}

interface SeatLayout {
  id: string;
  row_label: string;
  seat_number: number;
  seat_type: string;
  is_available: boolean;
  screen_id: string;
}

export default function CinemaBooking() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const movieId = searchParams.get('movie');
  const initialShowtimeId = searchParams.get('showtime');

  const [cinema, setCinema] = useState<any>(null);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedShowtime, setSelectedShowtime] = useState<Showtime | null>(null);
  const [seatLayouts, setSeatLayouts] = useState<SeatLayout[]>([]);
  const [bookedSeats, setBookedSeats] = useState<{ row_label: string; seat_number: number }[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [seatCount, setSeatCount] = useState(2);
  const [showtimeAvailability, setShowtimeAvailability] = useState<Record<string, { booked: number; total: number }>>({});
  const [seatTypeFilter, setSeatTypeFilter] = useState<'all' | 'regular' | 'vip'>('all');

  // Generate dates for the date picker (5 days)
  const dateRange = useMemo(() => {
    const dates: Date[] = [];
    for (let i = -1; i <= 3; i++) {
      dates.push(addDays(startOfDay(new Date()), i));
    }
    return dates;
  }, []);

  // Filter showtimes for selected date
  const filteredShowtimes = useMemo(() => {
    return showtimes.filter(s => {
      const showtimeDate = startOfDay(new Date(s.start_time));
      return isSameDay(showtimeDate, selectedDate) && new Date(s.start_time) > new Date();
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [showtimes, selectedDate]);

  useEffect(() => {
    if (slug) {
      fetchData();
    }
  }, [slug, movieId, initialShowtimeId]);

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

      // Fetch movie if movieId provided
      if (movieId) {
        const { data: movieData } = await supabase
          .from('movies')
          .select('*')
          .eq('id', movieId)
          .single();
        setMovie(movieData);

        // Fetch showtimes for this movie
        const { data: showtimesData } = await supabase
          .from('showtimes')
          .select(`*, movies (*), screens (*)`)
          .eq('movie_id', movieId)
          .eq('organization_id', cinemaData.id)
          .eq('is_active', true)
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true });

        setShowtimes(showtimesData || []);

        // Fetch availability for all showtimes
        if (showtimesData && showtimesData.length > 0) {
          await fetchShowtimeAvailability(showtimesData);
        }

        // If initialShowtimeId provided, select it
        if (initialShowtimeId && showtimesData) {
          const initialShowtime = showtimesData.find(s => s.id === initialShowtimeId);
          if (initialShowtime) {
            setSelectedShowtime(initialShowtime);
            setSelectedDate(startOfDay(new Date(initialShowtime.start_time)));
            await fetchSeatsForShowtime(initialShowtime);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchShowtimeAvailability = async (showtimesList: Showtime[]) => {
    const availability: Record<string, { booked: number; total: number }> = {};
    
    // Get unique screen IDs
    const screenIds = [...new Set(showtimesList.map(s => s.screen_id))];
    
    // Fetch total seats per screen
    const { data: seatLayouts } = await supabase
      .from('seat_layouts')
      .select('screen_id, is_available')
      .in('screen_id', screenIds);
    
    const totalSeatsPerScreen: Record<string, number> = {};
    seatLayouts?.forEach(seat => {
      if (seat.is_available) {
        totalSeatsPerScreen[seat.screen_id] = (totalSeatsPerScreen[seat.screen_id] || 0) + 1;
      }
    });
    
    // Fetch booked seats count per showtime
    const { data: bookedCounts } = await supabase
      .from('booked_seats')
      .select('showtime_id')
      .in('showtime_id', showtimesList.map(s => s.id));
    
    const bookedPerShowtime: Record<string, number> = {};
    bookedCounts?.forEach(seat => {
      bookedPerShowtime[seat.showtime_id] = (bookedPerShowtime[seat.showtime_id] || 0) + 1;
    });
    
    // Build availability map
    showtimesList.forEach(showtime => {
      const total = totalSeatsPerScreen[showtime.screen_id] || 0;
      const booked = bookedPerShowtime[showtime.id] || 0;
      availability[showtime.id] = { booked, total };
    });
    
    setShowtimeAvailability(availability);
  };

  const fetchSeatsForShowtime = async (showtime: Showtime) => {
    // Fetch seat layouts
    const { data: layouts } = await supabase
      .from('seat_layouts')
      .select('*')
      .eq('screen_id', showtime.screens.id);
    setSeatLayouts(layouts || []);

    // Fetch booked seats
    const { data: booked } = await supabase
      .from('booked_seats')
      .select('row_label, seat_number')
      .eq('showtime_id', showtime.id);
    setBookedSeats(booked || []);
    setSelectedSeats([]);
  };

  const handleShowtimeSelect = async (showtime: Showtime) => {
    setSelectedShowtime(showtime);
    await fetchSeatsForShowtime(showtime);
  };

  // Real-time subscription for seat availability updates
  useEffect(() => {
    if (!selectedShowtime) return;

    const channel = supabase
      .channel(`seats-${selectedShowtime.id}`)
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
          
          // Add the newly booked seat to the booked seats list
          setBookedSeats((prev) => {
            const alreadyExists = prev.some(
              (s) => s.row_label === newSeat.row_label && s.seat_number === newSeat.seat_number
            );
            if (alreadyExists) return prev;
            return [...prev, { row_label: newSeat.row_label, seat_number: newSeat.seat_number }];
          });

          // Update availability count for the current showtime
          setShowtimeAvailability((prev) => {
            const current = prev[selectedShowtime.id];
            if (!current) return prev;
            return {
              ...prev,
              [selectedShowtime.id]: { ...current, booked: current.booked + 1 }
            };
          });

          // Remove the seat from selected seats if another user booked it
          setSelectedSeats((prev) => {
            const wasSelected = prev.some(
              (s) => s.row_label === newSeat.row_label && s.seat_number === newSeat.seat_number
            );
            if (wasSelected) {
              toast.warning(`Seat ${newSeat.row_label}${newSeat.seat_number} was just booked by another user`);
              return prev.filter(
                (s) => !(s.row_label === newSeat.row_label && s.seat_number === newSeat.seat_number)
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
  }, [selectedShowtime?.id]);

  // Real-time subscription for showtime updates (price changes, etc.)
  useEffect(() => {
    if (!cinema?.id) return;

    const showtimesChannel = supabase
      .channel('showtimes-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'showtimes',
          filter: `organization_id=eq.${cinema.id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Showtime;
            setShowtimes((prev) =>
              prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
            );
            // Update selected showtime if it was changed
            if (selectedShowtime?.id === updated.id) {
              setSelectedShowtime((prev) => prev ? { ...prev, ...updated } : prev);
            }
          } else if (payload.eventType === 'DELETE') {
            setShowtimes((prev) => prev.filter((s) => s.id !== payload.old.id));
            if (selectedShowtime?.id === payload.old.id) {
              setSelectedShowtime(null);
              toast.warning('This showtime is no longer available');
            }
          }
        }
      )
      .subscribe();

    // Subscribe to seat_layouts changes (screen updates)
    const seatsChannel = supabase
      .channel('seat-layouts-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seat_layouts',
        },
        () => {
          // Refetch seat layouts if selected showtime exists
          if (selectedShowtime) {
            fetchSeatsForShowtime(selectedShowtime);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(showtimesChannel);
      supabase.removeChannel(seatsChannel);
    };
  }, [cinema?.id, selectedShowtime?.id]);

  const isSeatBooked = (row: string, num: number) => {
    return bookedSeats.some(s => s.row_label === row && s.seat_number === num);
  };

  const isSeatSelected = (row: string, num: number) => {
    return selectedSeats.some(s => s.row_label === row && s.seat_number === num);
  };

  const toggleSeat = (seat: SeatLayout) => {
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

  const handleAddToCart = () => {
    if (selectedSeats.length === 0 || !selectedShowtime) {
      toast.error('Please select at least one seat');
      return;
    }
    // Store selected seats in sessionStorage for the booking flow
    sessionStorage.setItem('selectedSeats', JSON.stringify(selectedSeats));
    // Navigate to the full booking flow with seats pre-selected
    navigate(`/cinema/${slug}/book?showtime=${selectedShowtime.id}&fromBooking=true`);
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => direction === 'next' ? addDays(prev, 1) : subDays(prev, 1));
  };

  const totalAmount = selectedSeats.reduce((sum, s) => sum + s.price, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!cinema || !movie) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Movie not found</div>
      </div>
    );
  }

  const primaryColor = cinema.primary_color || '#DC2626';

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col lg:flex-row">
      {/* Left Panel - Movie Info */}
      <div className="lg:w-1/2 relative overflow-hidden min-h-[400px] lg:min-h-screen">
        {/* Poster Image */}
        {movie.poster_url && (
          <img 
            src={movie.poster_url} 
            alt={movie.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        
        {/* Gradient Overlay */}
        <div 
          className="absolute inset-0"
          style={{
            background: movie.poster_url 
              ? 'linear-gradient(to bottom, transparent 0%, rgba(26, 26, 46, 0.6) 50%, rgba(26, 26, 46, 1) 100%)'
              : `linear-gradient(135deg, ${primaryColor}40 0%, #1a1a2e 100%)`
          }}
        />
        
        {/* Content */}
        <div className="relative z-10 p-6 lg:p-10 flex flex-col min-h-[400px] lg:min-h-screen justify-end">
          {/* Top Info */}
          <div className="absolute top-6 right-6 flex items-center gap-4 text-white/80 text-sm">
            <span>{movie.duration_minutes}min</span>
            {movie.rating && (
              <>
                <span className="flex items-center gap-1">
                  <span className="text-yellow-400">★</span> {movie.rating}
                </span>
              </>
            )}
            <Heart className="h-5 w-5 cursor-pointer hover:text-red-500 transition-colors" />
          </div>

          {/* Back button */}
          <button 
            onClick={() => navigate(`/cinema/${slug}`)}
            className="absolute top-6 left-6 text-white/80 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {/* Movie Title & Description */}
          <div className="mt-auto">
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4 uppercase tracking-wide">
              {movie.title}
            </h1>
            {movie.description && (
              <p className="text-white/70 text-sm lg:text-base leading-relaxed max-w-lg">
                {movie.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Booking Interface */}
      <div className="lg:w-1/2 bg-[#1a1a2e] p-6 lg:p-8 flex flex-col">
        {/* Date Selector */}
        <div className="mb-6">
          <h3 className="text-white/60 text-center text-sm mb-3">
            {format(selectedDate, 'MMMM')}
          </h3>
          <div className="flex items-center justify-center gap-2">
            <button 
              onClick={() => navigateDate('prev')}
              className="p-2 text-white/60 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <div className="flex gap-2">
              {dateRange.map((date) => {
                const isSelected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, new Date());
                const isPast = date < startOfDay(new Date());
                
                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => !isPast && setSelectedDate(date)}
                    disabled={isPast}
                    className={cn(
                      "flex flex-col items-center px-4 py-2 rounded-xl transition-all min-w-[60px]",
                      isSelected 
                        ? "text-white" 
                        : isPast 
                          ? "text-white/30 cursor-not-allowed"
                          : "text-white/60 hover:text-white hover:bg-white/10"
                    )}
                    style={isSelected ? { backgroundColor: primaryColor } : undefined}
                  >
                    <span className="text-xs uppercase">
                      {isToday ? 'Today' : format(date, 'EEE')}
                    </span>
                    <span className="text-xl font-bold">{format(date, 'd')}</span>
                  </button>
                );
              })}
            </div>
            
            <button 
              onClick={() => navigateDate('next')}
              className="p-2 text-white/60 hover:text-white transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Time Selector */}
        <div className="mb-6">
          <h3 className="text-white/60 text-center text-sm mb-3">Time</h3>
          <div className="flex flex-wrap justify-center gap-2">
            {filteredShowtimes.length === 0 ? (
              <p className="text-white/40 text-sm">No showtimes available for this date</p>
            ) : (
              filteredShowtimes.map((showtime) => {
                const isSelected = selectedShowtime?.id === showtime.id;
                const availability = showtimeAvailability[showtime.id];
                const available = availability ? availability.total - availability.booked : null;
                const isSoldOut = availability && available === 0;
                const hasVipPrice = showtime.vip_price && showtime.vip_price !== showtime.price;
                
                return (
                  <button
                    key={showtime.id}
                    onClick={() => !isSoldOut && handleShowtimeSelect(showtime)}
                    disabled={isSoldOut}
                    className={cn(
                      "px-4 py-3 rounded-lg transition-all flex flex-col items-center min-w-[100px]",
                      isSoldOut
                        ? "bg-white/5 text-white/30 cursor-not-allowed"
                        : isSelected 
                          ? "text-white" 
                          : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                    )}
                    style={isSelected && !isSoldOut ? { backgroundColor: primaryColor } : undefined}
                  >
                    <span className="text-lg font-bold">
                      {format(new Date(showtime.start_time), 'HH:mm')}
                    </span>
                    <span className="text-xs opacity-70 mb-1">
                      {showtime.screens.name}
                    </span>
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="opacity-80">${showtime.price}</span>
                      {hasVipPrice && (
                        <>
                          <span className="opacity-40">|</span>
                          <span className="text-amber-400">${showtime.vip_price}</span>
                        </>
                      )}
                    </div>
                    {availability && (
                      <span className={cn(
                        "text-[10px] mt-0.5",
                        isSoldOut ? "text-red-400" : available && available <= 10 ? "text-yellow-400" : "opacity-60"
                      )}>
                        {isSoldOut ? 'Sold Out' : `${available} left`}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Seat Counter */}
        {selectedShowtime && (
          <div className="mb-6">
            <h3 className="text-white/60 text-center text-sm mb-3">Seats</h3>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setSeatCount(Math.max(1, seatCount - 1))}
                className="w-10 h-10 rounded-full border border-white/20 text-white/60 hover:border-white/40 hover:text-white flex items-center justify-center transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(seatCount, 5) }).map((_, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-t-lg"
                    style={{ 
                      backgroundColor: selectedSeats[i] ? primaryColor : 'rgba(255,255,255,0.2)',
                      borderBottom: `2px solid ${selectedSeats[i] ? primaryColor : 'rgba(255,255,255,0.3)'}`
                    }}
                  />
                ))}
                {seatCount > 5 && (
                  <span className="text-white/60 text-sm ml-2">+{seatCount - 5}</span>
                )}
              </div>
              
              <button
                onClick={() => setSeatCount(Math.min(10, seatCount + 1))}
                className="w-10 h-10 rounded-full border border-white/20 text-white/60 hover:border-white/40 hover:text-white flex items-center justify-center transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Seat Map */}
        {selectedShowtime && seatLayouts.length > 0 && (
          <div className="flex-1 flex flex-col">
            {/* Seat Type Filter */}
            <div className="flex justify-center gap-2 mb-4">
              {(['all', 'regular', 'vip'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSeatTypeFilter(filter)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-medium transition-all",
                    seatTypeFilter === filter
                      ? "text-white"
                      : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                  )}
                  style={seatTypeFilter === filter ? { backgroundColor: primaryColor } : undefined}
                >
                  {filter === 'all' ? 'All Seats' : filter === 'regular' ? 'Regular' : 'VIP'}
                </button>
              ))}
            </div>

            {/* Screen indicator */}
            <div className="text-center mb-4">
              <div className="text-white/40 text-xs mb-2">Screen</div>
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
                {Array.from({ length: selectedShowtime.screens.rows }, (_, i) => {
                  const rowLabel = String.fromCharCode(65 + i);
                  const rowSeats = seatLayouts
                    .filter(s => s.row_label === rowLabel)
                    .sort((a, b) => a.seat_number - b.seat_number);

                  return (
                    <div key={rowLabel} className="flex items-center gap-1.5">
                      {rowSeats.map((seat) => {
                        const isBooked = isSeatBooked(seat.row_label, seat.seat_number);
                        const isSelected = isSeatSelected(seat.row_label, seat.seat_number);
                        const isUnavailable = !seat.is_available || seat.seat_type === 'unavailable';
                        const isVip = seat.seat_type === 'vip';
                        const isFilteredOut = seatTypeFilter !== 'all' && 
                          ((seatTypeFilter === 'vip' && !isVip) || (seatTypeFilter === 'regular' && isVip));
                        const isClickable = !isBooked && !isUnavailable && !isFilteredOut;

                        return (
                          <button
                            key={`${seat.row_label}${seat.seat_number}`}
                            onClick={() => isClickable && toggleSeat(seat)}
                            disabled={!isClickable}
                            className={cn(
                              "w-5 h-5 lg:w-6 lg:h-6 rounded-full transition-all",
                              // Hidden seats
                              isUnavailable && "opacity-0 cursor-default",
                              // Filtered out seats (dimmed but visible)
                              !isUnavailable && isFilteredOut && "opacity-20 cursor-not-allowed",
                              // Booked seats (not filtered out)
                              !isUnavailable && !isFilteredOut && isBooked && "bg-white/20 cursor-not-allowed",
                              // Available VIP seats (not filtered, not selected)
                              !isUnavailable && !isFilteredOut && !isBooked && !isSelected && isVip && 
                                "bg-amber-400 hover:bg-amber-300 cursor-pointer ring-1 ring-amber-500/50",
                              // Available regular seats (not filtered, not selected)
                              !isUnavailable && !isFilteredOut && !isBooked && !isSelected && !isVip && 
                                "bg-white/80 hover:bg-white cursor-pointer",
                              // Selected seats
                              isSelected && "cursor-pointer"
                            )}
                            style={isSelected ? { backgroundColor: primaryColor } : undefined}
                            title={`${seat.row_label}${seat.seat_number}${isVip ? ' (VIP)' : ''}`}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 lg:gap-6 py-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-white/80" />
                <span className="text-white/60">Regular</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-400 ring-1 ring-amber-500/50" />
                <span className="text-white/60">VIP</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-white/20" />
                <span className="text-white/60">Taken</span>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: primaryColor }}
                />
                <span className="text-white/60">Selected</span>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Breakdown & Add to Cart Button */}
        <div className="mt-auto pt-4 space-y-3">
          {selectedSeats.length > 0 && (
            <div className="bg-white/5 rounded-lg p-3 space-y-2">
              {(() => {
                const regularSeats = selectedSeats.filter(s => s.seat_type !== 'vip');
                const vipSeats = selectedSeats.filter(s => s.seat_type === 'vip');
                const regularTotal = regularSeats.reduce((sum, s) => sum + s.price, 0);
                const vipTotal = vipSeats.reduce((sum, s) => sum + s.price, 0);
                
                return (
                  <>
                    {regularSeats.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">
                          Regular × {regularSeats.length}
                        </span>
                        <span className="text-white">${regularTotal.toFixed(2)}</span>
                      </div>
                    )}
                    {vipSeats.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-amber-400">
                          VIP × {vipSeats.length}
                        </span>
                        <span className="text-amber-400">${vipTotal.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t border-white/10 pt-2 flex justify-between font-semibold">
                      <span className="text-white">Total</span>
                      <span className="text-white">${totalAmount.toFixed(2)}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
          
          <Button
            onClick={handleAddToCart}
            disabled={selectedSeats.length === 0}
            className="w-full py-6 text-lg font-semibold rounded-xl transition-all"
            style={{ 
              backgroundColor: selectedSeats.length > 0 ? primaryColor : 'rgba(255,255,255,0.1)',
              color: selectedSeats.length > 0 ? 'white' : 'rgba(255,255,255,0.4)'
            }}
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            {selectedSeats.length > 0 
              ? `Add to cart - $${totalAmount.toFixed(2)}`
              : 'Select seats to continue'
            }
          </Button>
        </div>
      </div>
    </div>
  );
}
