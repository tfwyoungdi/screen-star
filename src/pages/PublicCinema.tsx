import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format, isSameDay, addDays, startOfDay } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Film, Ticket, Clock, MapPin, Phone, Mail, Calendar, Play, X, Search, Facebook, Instagram, Twitter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CinemaHero } from '@/components/public/CinemaHero';
import { CinemaChatbot } from '@/components/public/CinemaChatbot';

interface CinemaData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  about_text: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  social_facebook: string | null;
  social_instagram: string | null;
  social_twitter: string | null;
  website_template: string | null;
}

interface Showtime {
  id: string;
  start_time: string;
  price: number;
  screens?: { name: string; rows: number; columns: number } | null;
  bookedCount: number;
  capacity: number;
}

interface MovieWithShowtimes {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  poster_url: string | null;
  genre: string | null;
  rating: string | null;
  trailer_url: string | null;
  status: string;
  release_date: string | null;
  showtimes: Showtime[];
}

const extractVideoId = (url: string): { type: 'youtube' | 'vimeo' | null; id: string | null } => {
  const ytRegex = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const ytMatch = url.match(ytRegex);
  if (ytMatch) return { type: 'youtube', id: ytMatch[1] };

  const vimeoRegex = /(?:vimeo\.com\/)(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch) return { type: 'vimeo', id: vimeoMatch[1] };

  return { type: null, id: null };
};

const getTrailerEmbed = (url: string | null): string | null => {
  if (!url) return null;
  const { type, id } = extractVideoId(url);
  if (!type || !id) return null;
  if (type === 'youtube') return `https://www.youtube.com/embed/${id}?autoplay=1`;
  if (type === 'vimeo') return `https://player.vimeo.com/video/${id}?autoplay=1`;
  return null;
};

const getAvailabilityStatus = (bookedCount: number, capacity: number): { label: string; color: string } | null => {
  const occupancyPercent = (bookedCount / capacity) * 100;
  
  if (occupancyPercent >= 95) {
    return { label: 'Sold Out', color: '#ef4444' }; // red
  } else if (occupancyPercent >= 80) {
    return { label: 'Almost Full', color: '#f97316' }; // orange
  } else if (occupancyPercent >= 50) {
    return { label: 'Filling Fast', color: '#eab308' }; // yellow
  }
  return null; // plenty of seats available
};

export default function PublicCinema() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<MovieWithShowtimes | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTrailer, setShowTrailer] = useState(false);

  // Get date range for tabs
  const today = startOfDay(new Date());
  const allDateOptions = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  // Fetch cinema data with React Query for auto-refresh
  const { data: cinema, isLoading: cinemaLoading, isError: cinemaError } = useQuery({
    queryKey: ['public-cinema', slug],
    queryFn: async () => {
      // Use organizations_public view to avoid RLS permission denied errors for anonymous users
      const { data, error } = await supabase
        .from('organizations_public')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data as unknown as CinemaData | null;
    },
    enabled: !!slug,
    staleTime: 60000,
  });

  // Fetch movies with showtimes
  const { data: moviesData, isLoading: moviesLoading } = useQuery<MovieWithShowtimes[]>({
    queryKey: ['public-movies', cinema?.id],
    queryFn: async (): Promise<MovieWithShowtimes[]> => {
      if (!cinema?.id) return [];
      
      const { data: moviesResult } = await supabase
        .from('movies')
        .select('id, title, description, duration_minutes, poster_url, genre, rating, trailer_url, status, release_date')
        .eq('organization_id', cinema.id)
        .eq('is_active', true);

      if (!moviesResult || moviesResult.length === 0) return [];

      // Fetch ALL showtimes for each movie with screen capacity
      const moviesWithShowtimes = await Promise.all(
        moviesResult.map(async (movie) => {
          type ShowtimeRow = {
            id: string;
            start_time: string;
            price: number;
            screens?: { name: string; rows: number; columns: number } | null;
          };

          // First try with screen join; if it fails (e.g. permissions), retry without join so showtimes still load.
          const primary = await supabase
            .from('showtimes')
            .select('id, start_time, price, screens (name, rows, columns)')
            // SECURITY: Ensure showtimes belong to the same cinema (prevents cross-tenant leakage)
            .eq('organization_id', cinema.id)
            .eq('movie_id', movie.id)
            .eq('is_active', true)
            .gte('start_time', new Date().toISOString())
            .order('start_time');

          let showtimesError = primary.error;
          let showtimes: ShowtimeRow[] = (primary.data as ShowtimeRow[] | null) ?? [];

          if (showtimesError) {
            console.warn('[PublicCinema] showtimes query failed; retrying without screens join', showtimesError);

            const retry = await supabase
              .from('showtimes')
              .select('id, start_time, price')
              .eq('organization_id', cinema.id)
              .eq('movie_id', movie.id)
              .eq('is_active', true)
              .gte('start_time', new Date().toISOString())
              .order('start_time');

            showtimesError = retry.error;
            showtimes = (retry.data as ShowtimeRow[] | null) ?? [];
          }

          if (showtimesError) {
            // Keep the page functional (empty showtimes) but preserve the real error for debugging.
            console.error('[PublicCinema] showtimes query failed', showtimesError);
          }

          if (!showtimes || showtimes.length === 0) {
            return { ...movie, showtimes: [] };
          }

          // Fetch booked seats count for each showtime
          const showtimeIds = showtimes.map(st => st.id);
          const { data: bookedSeats } = await supabase
            .from('booked_seats')
            .select('showtime_id')
            .in('showtime_id', showtimeIds);

          const bookedCountMap = (bookedSeats || []).reduce((acc, seat) => {
            acc[seat.showtime_id] = (acc[seat.showtime_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          const showtimesWithAvailability = showtimes.map(st => ({
            ...st,
            bookedCount: bookedCountMap[st.id] || 0,
            capacity: (st.screens?.rows || 10) * (st.screens?.columns || 12),
          }));

          return {
            ...movie,
            showtimes: showtimesWithAvailability,
          };
        })
      );

      return moviesWithShowtimes;
    },
    enabled: !!cinema?.id,
    staleTime: 60000,
  });

  // Real-time subscription for showtime changes
  useEffect(() => {
    if (!cinema?.id) return;

    const channel = supabase
      .channel('public-showtimes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'showtimes',
          filter: `organization_id=eq.${cinema.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['public-movies', cinema.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cinema?.id, queryClient]);

  // Real-time subscription for seat bookings (availability updates)
  useEffect(() => {
    if (!cinema?.id) return;

    const channel = supabase
      .channel('public-seat-bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booked_seats',
        },
        () => {
          // Refetch movies data to update availability indicators
          queryClient.invalidateQueries({ queryKey: ['public-movies', cinema.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cinema?.id, queryClient]);

  // Now Showing = movies with upcoming/active showtimes
  const movies = useMemo(() => 
    (moviesData || []).filter(m => m.showtimes.length > 0),
    [moviesData]
  );

  // Coming Soon = movies with status 'coming_soon' that have NO showtimes yet
  // These are new movies never shown at this cinema, before release date and first showtime
  const comingSoonMovies = useMemo(() => {
    const today = new Date();
    return (moviesData || []).filter(m => {
      // Must have no showtimes (never been scheduled at this cinema)
      if (m.showtimes.length > 0) return false;
      // Must be marked as coming_soon status
      if (m.status !== 'coming_soon') return false;
      // If there's a release date, it should be in the future (optional check)
      if (m.release_date && new Date(m.release_date) <= today) return false;
      return true;
    });
  }, [moviesData]);

  const allMovies = useMemo(() => 
    (moviesData || []).map(m => ({ ...m, showtimes: [] })),
    [moviesData]
  );

  // Get unique genres from all movies
  const genres = [...new Set(movies.map(m => m.genre).filter(Boolean))] as string[];

  // Filter dateOptions to only show dates with showtimes
  const dateOptions = useMemo(() => {
    return allDateOptions.filter(date => 
      movies.some(movie => 
        movie.showtimes.some(st => isSameDay(new Date(st.start_time), date))
      )
    );
  }, [movies, allDateOptions]);

  // Ensure selectedDateIndex is valid
  const safeSelectedDateIndex = Math.min(selectedDateIndex, Math.max(0, dateOptions.length - 1));
  const selectedDate = dateOptions[safeSelectedDateIndex] || today;

  // Filter movies by selected date, genre, and search query
  const filteredMovies = movies
    .map(movie => ({
      ...movie,
      showtimes: movie.showtimes.filter(st => 
        isSameDay(new Date(st.start_time), selectedDate)
      )
    }))
    .filter(movie => movie.showtimes.length > 0)
    .filter(movie => !selectedGenre || movie.genre === selectedGenre)
    .filter(movie => !searchQuery || movie.title.toLowerCase().includes(searchQuery.toLowerCase()));

  // Track page view on cinema load
  useEffect(() => {
    if (cinema?.id && slug) {
      const trackPageView = async () => {
        try {
          let visitorId = localStorage.getItem('visitor_id');
          if (!visitorId) {
            visitorId = crypto.randomUUID();
            localStorage.setItem('visitor_id', visitorId);
          }

          await supabase.from('page_views').insert({
            organization_id: cinema.id,
            page_path: `/cinema/${slug}`,
            visitor_id: visitorId,
            user_agent: navigator.userAgent,
            referrer: document.referrer || null,
          });
        } catch (error) {
          console.error('Failed to track page view:', error);
        }
      };
      trackPageView();
    }
  }, [cinema?.id, slug]);

  const loading = cinemaLoading || moviesLoading;
  const notFound = cinemaError || (!cinemaLoading && !cinema);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-20 w-full" />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-64 w-full mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Film className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Cinema Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The cinema you're looking for doesn't exist or is no longer active.
          </p>
          <Button asChild>
            <a href="/">Go to Homepage</a>
          </Button>
        </div>
      </div>
    );
  }

  const customStyles = {
    '--cinema-primary': cinema?.primary_color || '#D4AF37',
    '--cinema-secondary': cinema?.secondary_color || '#1a1a2e',
  } as React.CSSProperties;

  return (
    <div className="min-h-screen" style={customStyles}>

      {/* Hero */}
      <CinemaHero 
        movies={allMovies.length > 0 ? allMovies : movies}
        cinemaSlug={slug!}
        cinemaName={cinema?.name || ''}
        primaryColor={cinema?.primary_color || '#F59E0B'}
        logoUrl={cinema?.logo_url}
        organizationId={cinema?.id}
        websiteTemplate={cinema?.website_template}
      />

      {/* Dotted separator for Cinema Carousel template */}
      {cinema?.website_template === 'cinema-carousel' && (
        <div
          className="h-2 w-full"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, ${cinema?.primary_color || '#C87B56'} 0px, ${cinema?.primary_color || '#C87B56'} 12px, transparent 12px, transparent 24px)`,
            backgroundSize: '24px 4px',
            backgroundRepeat: 'repeat-x',
            backgroundPosition: 'center',
          }}
        />
      )}

      {/* Elegant separator for Luxury Premiere template */}
      {cinema?.website_template === 'luxury-premiere' && (
        <div className="flex items-center justify-center py-4" style={{ backgroundColor: '#0D0A0B' }}>
          <div className="flex items-center gap-3">
            <div className="h-px w-16" style={{ backgroundColor: '#D4A57430' }} />
            <div 
              className="w-2 h-2 rotate-45"
              style={{ backgroundColor: '#D4A574' }}
            />
            <div className="h-px w-16" style={{ backgroundColor: '#D4A57430' }} />
          </div>
        </div>
      )}

      {/* Gradient separator for Neon Pulse template */}
      {cinema?.website_template === 'neon-pulse' && (
        <div
          className="h-1 w-full"
          style={{
            background: `linear-gradient(90deg, transparent 0%, #64748B 30%, #94A3B8 70%, transparent 100%)`
          }}
        />
      )}

      {/* Now Showing */}
      <section 
        id="movies" 
        className="py-12 md:py-16 relative"
        style={{ 
          backgroundColor: cinema?.website_template === 'cinema-carousel' 
            ? '#ffffff' 
            : cinema?.website_template === 'luxury-premiere'
            ? '#0D0A0B'
            : cinema?.website_template === 'neon-pulse'
            ? '#0F172A'
            : '#0a0a0f' 
        }}
      >
        {/* Neon Pulse background effects */}
        {cinema?.website_template === 'neon-pulse' && (
          <>
            <div 
              className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[150px] opacity-15 pointer-events-none"
              style={{ backgroundColor: '#64748B' }}
            />
            <div 
              className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-[120px] opacity-10 pointer-events-none"
              style={{ backgroundColor: '#94A3B8' }}
            />
          </>
        )}
        <div className="container mx-auto px-4">
          {/* Section Header for Cinema Carousel */}
          {cinema?.website_template === 'cinema-carousel' && (
            <div className="text-center mb-8">
              <div className="flex justify-center mb-3">
                <Film className="h-5 w-5" style={{ color: cinema?.primary_color || '#C87B56' }} />
              </div>
              <span
                className="text-sm tracking-wide"
                style={{ color: cinema?.primary_color || '#C87B56' }}
              >
                Watch New Movies
              </span>
              <h3 className="text-2xl md:text-3xl font-bold mt-2 text-gray-900">
                Movies Now Playing
              </h3>
              
              {/* Date Tabs for Cinema Carousel */}
              <div className="flex items-center justify-center gap-2 md:gap-3 overflow-x-auto mt-6 pb-2">
                {dateOptions.map((date, index) => {
                  const isToday = isSameDay(date, today);
                  const isTomorrow = isSameDay(date, addDays(today, 1));
                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDateIndex(index)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                        safeSelectedDateIndex === index
                          ? 'shadow-md'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      style={safeSelectedDateIndex === index ? {
                        backgroundColor: cinema?.primary_color || '#C87B56',
                        color: '#fff'
                      } : undefined}
                    >
                      {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : format(date, 'EEE, MMM d')}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {cinema?.website_template === 'luxury-premiere' && (
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-px w-8" style={{ backgroundColor: '#D4A574' }} />
                <span 
                  className="text-xs tracking-[0.2em] uppercase"
                  style={{ color: '#D4A574' }}
                >
                  Featured Films
                </span>
              </div>
              <h3
                className="text-2xl md:text-3xl font-bold"
                style={{ color: '#FAF7F5', fontFamily: 'Playfair Display, serif' }}
              >
                Now Showing
              </h3>
              
              {/* Date Tabs for Luxury Premiere */}
              <div className="flex items-center gap-2 md:gap-3 overflow-x-auto mt-6 pb-2">
                {dateOptions.map((date, index) => {
                  const isToday = isSameDay(date, today);
                  const isTomorrow = isSameDay(date, addDays(today, 1));
                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDateIndex(index)}
                      className={`px-4 py-2 rounded text-sm font-medium transition-all whitespace-nowrap border ${
                        safeSelectedDateIndex === index
                          ? ''
                          : 'border-transparent'
                      }`}
                      style={safeSelectedDateIndex === index ? {
                        backgroundColor: '#8B2942',
                        borderColor: '#D4A574',
                        color: '#FAF7F5'
                      } : {
                        color: '#A89A9D',
                        backgroundColor: 'transparent'
                      }}
                    >
                      {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : format(date, 'EEE, MMM d')}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {cinema?.website_template === 'neon-pulse' && (
            <div className="mb-10 relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <span 
                  className="text-xs font-medium tracking-wider"
                  style={{ 
                    color: '#94A3B8'
                  }}
                >
                  ● FEATURED
                </span>
              </div>
              <h3
                className="text-2xl md:text-3xl font-bold"
                style={{ color: '#F8FAFC', fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Now Showing
              </h3>
              
              {/* Date Tabs for Neon Pulse */}
              <div className="flex items-center gap-2 md:gap-3 overflow-x-auto mt-6 pb-2">
                {dateOptions.map((date, index) => {
                  const isToday = isSameDay(date, today);
                  const isTomorrow = isSameDay(date, addDays(today, 1));
                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDateIndex(index)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                        safeSelectedDateIndex === index
                          ? ''
                          : ''
                      }`}
                      style={safeSelectedDateIndex === index ? {
                        backgroundColor: '#64748B',
                        color: '#F8FAFC'
                      } : {
                        color: '#94A3B8',
                        backgroundColor: '#1E293B'
                      }}
                    >
                      {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : format(date, 'EEE, MMM d')}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Header with title, search bar, and date tabs - Standard templates (not carousel, luxury, or neon-pulse) */}
          {cinema?.website_template !== 'cinema-carousel' && cinema?.website_template !== 'luxury-premiere' && cinema?.website_template !== 'neon-pulse' && (
          <div className="flex flex-col gap-6 mb-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h3 className="text-2xl md:text-3xl font-bold text-white">
                Now Showing
              </h3>
              
              {/* Search Bar */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                <Input
                  type="text"
                  placeholder="Search movies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
                />
              </div>
            </div>
            
            {/* Date Tabs + Genre Filters */}
            <div className="flex flex-col gap-4">
              {/* Date Tabs */}
              <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-2">
                {dateOptions.map((date, index) => {
                  const isToday = isSameDay(date, today);
                  const isTomorrow = isSameDay(date, addDays(today, 1));
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => setSelectedDateIndex(index)}
                      className={`px-4 md:px-6 py-2 md:py-3 text-sm md:text-base font-medium whitespace-nowrap rounded-lg transition-all ${
                        safeSelectedDateIndex === index
                          ? 'text-black'
                          : 'text-white/60 hover:text-white bg-white/5 hover:bg-white/10'
                      }`}
                      style={safeSelectedDateIndex === index ? { 
                        backgroundColor: cinema?.primary_color || '#D4AF37',
                      } : undefined}
                    >
                      <span className="block text-xs opacity-70">
                        {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : format(date, 'EEE')}
                      </span>
                      <span className="block">{format(date, 'MMM d')}</span>
                    </button>
                  );
                })}
              </div>

              {/* Genre Filter Chips */}
              {genres.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  <button
                    onClick={() => setSelectedGenre(null)}
                    className={`px-4 py-1.5 text-sm font-medium whitespace-nowrap rounded-full transition-all ${
                      selectedGenre === null
                        ? 'text-black'
                        : 'text-white/70 hover:text-white border border-white/20 hover:border-white/40'
                    }`}
                    style={selectedGenre === null ? { 
                      backgroundColor: cinema?.primary_color || '#D4AF37',
                    } : undefined}
                  >
                    All Genres
                  </button>
                  {genres.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => setSelectedGenre(genre)}
                      className={`px-4 py-1.5 text-sm font-medium whitespace-nowrap rounded-full transition-all ${
                        selectedGenre === genre
                          ? 'text-black'
                          : 'text-white/70 hover:text-white border border-white/20 hover:border-white/40'
                      }`}
                      style={selectedGenre === genre ? { 
                        backgroundColor: cinema?.primary_color || '#D4AF37',
                      } : undefined}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}

          {/* Movies List - Cinema Carousel Style (White background) */}
          {cinema?.website_template === 'cinema-carousel' && (
            <>
              {filteredMovies.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  {filteredMovies.map((movie) => (
                    <div 
                      key={movie.id} 
                      className="group relative cursor-pointer rounded-lg overflow-hidden shadow-lg bg-gray-50"
                      onClick={() => navigate(`/cinema/${slug}/booking?movie=${movie.id}`)}
                    >
                      {/* Poster with overlay */}
                      <div className="relative aspect-[3/4]">
                        {movie.poster_url ? (
                          <img
                            src={movie.poster_url}
                            alt={movie.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
                            <Film className="h-12 w-12 text-gray-500" />
                          </div>
                        )}
                        
                        {/* Genre/Duration overlay at bottom of poster */}
                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                          <span className="text-xs text-white/90">
                            {movie.genre || 'Movie'} / {movie.duration_minutes} Mins
                          </span>
                          <h4 className="font-semibold text-sm text-white mt-1 line-clamp-1">
                            {movie.title}
                          </h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/cinema/${slug}/booking?movie=${movie.id}`);
                            }}
                            className="mt-2 px-3 py-1 text-xs border border-white/80 text-white rounded hover:bg-white/20 transition-colors"
                          >
                            Get Ticket
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    No movies scheduled for {format(selectedDate, 'MMMM d')}{selectedGenre ? ` in ${selectedGenre}` : ''}. Try another date or genre!
                  </p>
                </div>
              )}
            </>
          )}

          {/* Movies List - Luxury Premiere Style */}
          {cinema?.website_template === 'luxury-premiere' && (
            <>
              {filteredMovies.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  {filteredMovies.map((movie) => (
                    <div 
                      key={movie.id} 
                      className="group cursor-pointer rounded-lg overflow-hidden"
                      style={{ 
                        backgroundColor: '#1A1315',
                        border: '1px solid rgba(212, 165, 116, 0.2)'
                      }}
                      onClick={() => navigate(`/cinema/${slug}/booking?movie=${movie.id}`)}
                    >
                      {/* Poster with hover overlay */}
                      <div className="relative aspect-[3/4] overflow-hidden">
                        {movie.poster_url ? (
                          <img
                            src={movie.poster_url}
                            alt={movie.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div 
                            className="w-full h-full flex items-center justify-center"
                            style={{ background: 'linear-gradient(180deg, #8B2942 0%, #1C1017 100%)' }}
                          >
                            <Film className="h-12 w-12 text-white/30" />
                          </div>
                        )}
                        
                        {/* Hover overlay */}
                        <div 
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center"
                          style={{ backgroundColor: 'rgba(139, 41, 66, 0.85)' }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/cinema/${slug}/booking?movie=${movie.id}`);
                            }}
                            className="px-4 py-2 text-xs font-medium tracking-wide border-2 rounded"
                            style={{ borderColor: '#fff', color: '#fff' }}
                          >
                            BOOK NOW
                          </button>
                        </div>
                      </div>
                      
                      {/* Card info */}
                      <div className="p-4" style={{ backgroundColor: '#1A1315' }}>
                        <h4 
                          className="font-semibold text-sm mb-1 line-clamp-1"
                          style={{ color: '#FAF7F5', fontFamily: 'Playfair Display, serif' }}
                        >
                          {movie.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: '#D4A574' }}>
                            {movie.genre || 'Movie'}
                          </span>
                          <span className="text-xs" style={{ color: '#A89A9D' }}>
                            • {movie.duration_minutes} min
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 mx-auto mb-4" style={{ color: '#A89A9D' }} />
                  <p style={{ color: '#A89A9D' }}>
                    No films scheduled for {format(selectedDate, 'MMMM d')}{selectedGenre ? ` in ${selectedGenre}` : ''}. Check back soon.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Movies List - Neon Pulse Style */}
          {cinema?.website_template === 'neon-pulse' && (
            <>
              {filteredMovies.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 relative z-10">
                  {filteredMovies.map((movie) => (
                    <div 
                      key={movie.id} 
                      className="group cursor-pointer rounded-xl overflow-hidden relative"
                      style={{ 
                        backgroundColor: '#1E293B',
                        border: '1px solid rgba(100, 116, 139, 0.3)'
                      }}
                      onClick={() => navigate(`/cinema/${slug}/booking?movie=${movie.id}`)}
                    >
                      {/* Poster with hover overlay */}
                      <div className="relative aspect-[3/4] overflow-hidden">
                        {movie.poster_url ? (
                          <img
                            src={movie.poster_url}
                            alt={movie.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div 
                            className="w-full h-full flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, rgba(100, 116, 139, 0.3) 0%, rgba(148, 163, 184, 0.2) 100%)' }}
                          >
                            <Film className="h-12 w-12 text-white/30" />
                          </div>
                        )}
                        
                        {/* Hover overlay */}
                        <div 
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center"
                          style={{ background: 'linear-gradient(135deg, rgba(100, 116, 139, 0.95) 0%, rgba(71, 85, 105, 0.95) 100%)' }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/cinema/${slug}/booking?movie=${movie.id}`);
                            }}
                            className="px-5 py-2 text-xs font-semibold tracking-wide rounded-full"
                            style={{ 
                              backgroundColor: '#fff',
                              color: '#0F172A',
                              boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                            }}
                          >
                            BOOK NOW
                          </button>
                        </div>
                      </div>
                      
                      {/* Card info */}
                      <div className="p-4" style={{ backgroundColor: '#1E293B' }}>
                        <h4 
                          className="font-semibold text-sm mb-2 line-clamp-1"
                          style={{ color: '#F8FAFC', fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          {movie.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span 
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ 
                              backgroundColor: 'rgba(100, 116, 139, 0.3)',
                              color: '#94A3B8' 
                            }}
                          >
                            {movie.genre || 'Movie'}
                          </span>
                          <span className="text-xs" style={{ color: '#64748B' }}>
                            {movie.duration_minutes} min
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 relative z-10">
                  <Calendar className="h-16 w-16 mx-auto mb-4" style={{ color: '#94A3B8' }} />
                  <p style={{ color: '#94A3B8' }}>
                    No films scheduled for {format(selectedDate, 'MMMM d')}{selectedGenre ? ` in ${selectedGenre}` : ''}. Check back soon.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Movies List - Standard Netflix/Streaming Style (Dark background) */}
          {cinema?.website_template !== 'cinema-carousel' && cinema?.website_template !== 'luxury-premiere' && cinema?.website_template !== 'neon-pulse' && (
            <>
          {filteredMovies.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {filteredMovies.map((movie) => (
                <div 
                  key={movie.id} 
                  className="group relative cursor-pointer"
                  onClick={() => navigate(`/cinema/${slug}/booking?movie=${movie.id}`)}
                >
                  {/* Poster Card */}
                  <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-gray-900">
                    {movie.poster_url ? (
                      <img
                        src={movie.poster_url}
                        alt={movie.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                        <Film className="h-12 w-12 text-gray-700" />
                      </div>
                    )}
                    
                    {/* Hover overlay with info */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                      
                      {/* Bottom info */}
                      <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        <div className="flex items-center gap-2 text-white/70 text-xs mb-2">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {movie.duration_minutes}m
                          </span>
                          {movie.rating && (
                            <span className="px-1.5 py-0.5 bg-white/20 rounded text-[10px] font-medium">
                              {movie.rating}
                            </span>
                          )}
                        </div>
                        {movie.genre && (
                          <span className="text-white/50 text-xs">{movie.genre}</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Rating badge - always visible */}
                    {movie.rating && (
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[10px] font-bold text-white">
                        {movie.rating}
                      </div>
                    )}
                    
                    {/* Showtime count badge */}
                    <div 
                      className="absolute top-2 right-2 px-2 py-1 rounded text-[10px] font-bold text-black"
                      style={{ backgroundColor: cinema?.primary_color || '#D4AF37' }}
                    >
                      {movie.showtimes.length} show{movie.showtimes.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  
                  {/* Title below poster */}
                  <div className="mt-2 px-0.5">
                    <h4 className="text-white font-medium text-sm leading-tight line-clamp-1 group-hover:text-white/80 transition-colors">
                      {movie.title}
                    </h4>
                    {/* Showtimes chips */}
                    {movie.showtimes.length > 0 && (
                      <div className="flex gap-1.5 mt-2 overflow-hidden pb-1">
                        {movie.showtimes.slice(0, movie.showtimes.length > 4 ? 3 : 4).map((showtime) => (
                          <button 
                            key={showtime.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/cinema/${slug}/booking?movie=${movie.id}&showtime=${showtime.id}`);
                            }}
                            className="shrink-0 text-[11px] font-medium px-2 py-1 rounded-md transition-colors hover:opacity-80 cursor-pointer"
                            style={{ 
                              backgroundColor: `${cinema?.primary_color || '#D4AF37'}20`,
                              color: cinema?.primary_color || '#D4AF37'
                            }}
                          >
                            {format(new Date(showtime.start_time), 'h:mm a')}
                          </button>
                        ))}
                        {movie.showtimes.length > 4 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMovie(movie);
                            }}
                            className="shrink-0 text-[11px] font-medium px-2 py-1 rounded-md transition-colors hover:opacity-80"
                            style={{ 
                              backgroundColor: `${cinema?.primary_color || '#D4AF37'}20`,
                              color: cinema?.primary_color || '#D4AF37'
                            }}
                          >
                            +{movie.showtimes.length - 3}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                No movies scheduled for {format(selectedDate, 'MMMM d')}{selectedGenre ? ` in ${selectedGenre}` : ''}. Try another date or genre!
              </p>
            </div>
          )}
            </>
          )}
        </div>
      </section>

      {/* Section Divider */}
      {comingSoonMovies.length > 0 && (
        <div className="relative" style={{ backgroundColor: '#0a0a0f' }}>
          <div className="container mx-auto px-4">
            <div 
              className="h-px w-full"
              style={{ 
                background: `linear-gradient(90deg, transparent, ${cinema?.primary_color || '#D4AF37'}40, transparent)` 
              }}
            />
          </div>
        </div>
      )}

      {/* Coming Soon */}
      {comingSoonMovies.length > 0 && (
        <section 
          id="coming-soon" 
          className="py-12 md:py-16" 
          style={{ 
            backgroundColor: cinema?.website_template === 'cinema-carousel' 
              ? '#f8f8f8' 
              : cinema?.website_template === 'luxury-premiere'
              ? '#0D0A0B'
              : cinema?.website_template === 'neon-pulse'
              ? '#0F172A'
              : '#0a0a0f' 
          }}
        >
          <div className="container mx-auto px-4">
            {/* Section Header - Cinema Carousel */}
            {cinema?.website_template === 'cinema-carousel' && (
              <div className="text-center mb-10">
                <div className="flex justify-center mb-3">
                  <Calendar className="h-5 w-5" style={{ color: cinema?.primary_color || '#C87B56' }} />
                </div>
                <span className="text-sm tracking-wide" style={{ color: cinema?.primary_color || '#C87B56' }}>
                  Upcoming Releases
                </span>
                <h3 className="text-2xl md:text-3xl font-bold mt-2 text-gray-900">
                  Coming Soon
                </h3>
              </div>
            )}

            {/* Section Header - Luxury Premiere */}
            {cinema?.website_template === 'luxury-premiere' && (
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-px w-8" style={{ backgroundColor: '#D4A574' }} />
                  <span className="text-xs tracking-[0.2em] uppercase" style={{ color: '#D4A574' }}>
                    Upcoming
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold" style={{ color: '#FAF7F5', fontFamily: 'Playfair Display, serif' }}>
                  Coming Soon
                </h3>
              </div>
            )}

            {/* Section Header - Neon Pulse */}
            {cinema?.website_template === 'neon-pulse' && (
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-medium tracking-wider" style={{ color: '#94A3B8' }}>
                    ○ UPCOMING
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold" style={{ color: '#F8FAFC', fontFamily: "'Space Grotesk', sans-serif" }}>
                  Coming Soon
                </h3>
              </div>
            )}

            {/* Section Header - Standard */}
            {cinema?.website_template !== 'cinema-carousel' && cinema?.website_template !== 'luxury-premiere' && cinema?.website_template !== 'neon-pulse' && (
              <div className="flex items-center gap-3 mb-10">
                <h3 className="text-2xl md:text-3xl font-bold text-white">
                  Coming Soon
                </h3>
                <Badge 
                  className="text-xs font-medium border-0"
                  style={{ 
                    backgroundColor: `${cinema?.primary_color || '#D4AF37'}20`,
                    color: cinema?.primary_color || '#D4AF37'
                  }}
                >
                  {comingSoonMovies.length} {comingSoonMovies.length === 1 ? 'Movie' : 'Movies'}
                </Badge>
              </div>
            )}

            {/* Movies Grid - Cinema Carousel */}
            {cinema?.website_template === 'cinema-carousel' && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {comingSoonMovies.map((movie) => (
                  <div key={movie.id} className="group relative rounded-lg overflow-hidden shadow-lg bg-white">
                    <div className="relative aspect-[2/3]">
                      {movie.poster_url ? (
                        <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <Film className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                      <Badge 
                        className="absolute top-2 left-2 text-xs font-semibold border-0"
                        style={{ backgroundColor: cinema?.primary_color || '#C87B56', color: '#fff' }}
                      >
                        Coming Soon
                      </Badge>
                    </div>
                    <div className="p-3">
                      <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">{movie.title}</h4>
                      {movie.release_date && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(movie.release_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Movies Grid - Luxury Premiere */}
            {cinema?.website_template === 'luxury-premiere' && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {comingSoonMovies.map((movie) => (
                  <div 
                    key={movie.id} 
                    className="group rounded-lg overflow-hidden"
                    style={{ backgroundColor: '#1A1315', border: '1px solid rgba(212, 165, 116, 0.2)' }}
                  >
                    <div className="relative aspect-[2/3]">
                      {movie.poster_url ? (
                        <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #8B2942 0%, #1C1017 100%)' }}>
                          <Film className="h-12 w-12 text-white/30" />
                        </div>
                      )}
                      <Badge 
                        className="absolute top-2 left-2 text-xs font-semibold border-0"
                        style={{ backgroundColor: '#D4A574', color: '#0D0A0B' }}
                      >
                        Coming Soon
                      </Badge>
                    </div>
                    <div className="p-3" style={{ backgroundColor: '#1A1315' }}>
                      <h4 className="text-sm font-semibold line-clamp-1" style={{ color: '#FAF7F5', fontFamily: 'Playfair Display, serif' }}>
                        {movie.title}
                      </h4>
                      {movie.release_date && (
                        <p className="text-xs flex items-center gap-1 mt-1" style={{ color: '#D4A574' }}>
                          <Calendar className="h-3 w-3" />
                          {format(new Date(movie.release_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Movies Grid - Neon Pulse */}
            {cinema?.website_template === 'neon-pulse' && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {comingSoonMovies.map((movie) => (
                  <div 
                    key={movie.id} 
                    className="group rounded-xl overflow-hidden"
                    style={{ backgroundColor: '#1E293B', border: '1px solid rgba(100, 116, 139, 0.3)' }}
                  >
                    <div className="relative aspect-[2/3]">
                      {movie.poster_url ? (
                        <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(100, 116, 139, 0.3) 0%, rgba(148, 163, 184, 0.2) 100%)' }}>
                          <Film className="h-12 w-12 text-white/30" />
                        </div>
                      )}
                      <Badge 
                        className="absolute top-2 left-2 text-xs font-semibold border-0"
                        style={{ backgroundColor: '#64748B', color: '#F8FAFC' }}
                      >
                        Coming Soon
                      </Badge>
                    </div>
                    <div className="p-3" style={{ backgroundColor: '#1E293B' }}>
                      <h4 className="text-sm font-semibold line-clamp-1" style={{ color: '#F8FAFC', fontFamily: "'Space Grotesk', sans-serif" }}>
                        {movie.title}
                      </h4>
                      {movie.release_date && (
                        <p className="text-xs flex items-center gap-1 mt-1" style={{ color: '#94A3B8' }}>
                          <Calendar className="h-3 w-3" />
                          {format(new Date(movie.release_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Movies Grid - Standard */}
            {cinema?.website_template !== 'cinema-carousel' && cinema?.website_template !== 'luxury-premiere' && cinema?.website_template !== 'neon-pulse' && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {comingSoonMovies.map((movie) => (
                  <div key={movie.id} className="group relative">
                    <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-gray-900">
                      {movie.poster_url ? (
                        <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                          <Film className="h-12 w-12 text-gray-700" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <Badge className="text-xs font-semibold border-0 shadow-lg" style={{ backgroundColor: cinema?.primary_color || '#D4AF37', color: '#000' }}>
                          Coming Soon
                        </Badge>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <div className="flex items-center gap-2 text-white/70 text-xs mb-2">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {movie.duration_minutes} min
                            </span>
                            {movie.rating && (
                              <Badge className="text-[10px] px-1.5 py-0 bg-white/10 text-white border-0">{movie.rating}</Badge>
                            )}
                          </div>
                          {movie.genre && <p className="text-white/50 text-xs">{movie.genre}</p>}
                          {movie.description && <p className="text-white/60 text-xs line-clamp-2 mt-2">{movie.description}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <h4 className="text-sm font-medium text-white/90 line-clamp-1 group-hover:text-white transition-colors">{movie.title}</h4>
                      {movie.release_date && (
                        <p className="text-xs text-white/50 flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(movie.release_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Movie Details Modal */}
      <Dialog open={!!selectedMovie} onOpenChange={(open) => !open && setSelectedMovie(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700 text-white p-0">
          {selectedMovie && (
            <>
              {/* Trailer Section */}
              {selectedMovie.trailer_url && showTrailer ? (
                <div className="relative aspect-video bg-black">
                  <iframe
                    src={getTrailerEmbed(selectedMovie.trailer_url) || ''}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  <button
                    onClick={() => setShowTrailer(false)}
                    className="absolute top-4 right-4 p-2 bg-black/70 rounded-full hover:bg-black transition-colors"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>
              ) : (
                <div className="relative aspect-video bg-gray-800">
                  {selectedMovie.poster_url ? (
                    <img
                      src={selectedMovie.poster_url}
                      alt={selectedMovie.title}
                      className="w-full h-full object-cover opacity-40"
                    />
                  ) : null}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {selectedMovie.trailer_url && (
                      <button
                        onClick={() => setShowTrailer(true)}
                        className="flex items-center gap-2 px-6 py-3 rounded-full text-black font-medium transition-transform hover:scale-105"
                        style={{ backgroundColor: cinema?.primary_color || '#D4AF37' }}
                      >
                        <Play className="h-5 w-5" fill="currentColor" />
                        Watch Trailer
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="p-6">
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-2xl md:text-3xl font-bold text-white">
                    {selectedMovie.title}
                  </DialogTitle>
                </DialogHeader>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  {selectedMovie.rating && (
                    <Badge className="bg-white/10 text-white border-0">
                      {selectedMovie.rating}
                    </Badge>
                  )}
                  <span className="flex items-center gap-1 text-white/60 text-sm">
                    <Clock className="h-4 w-4" />
                    {selectedMovie.duration_minutes} min
                  </span>
                  {selectedMovie.genre && (
                    <Badge variant="outline" className="text-white/70 border-white/30">
                      {selectedMovie.genre}
                    </Badge>
                  )}
                </div>

                {/* Description */}
                {selectedMovie.description && (
                  <p className="text-white/70 mb-6 leading-relaxed">
                    {selectedMovie.description}
                  </p>
                )}

                {/* All Showtimes */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">All Showtimes</h4>
                  
                  {/* Group showtimes by date */}
                  {(() => {
                    const allShowtimes = movies.find(m => m.id === selectedMovie.id)?.showtimes || [];
                    const groupedByDate = allShowtimes.reduce((acc, st) => {
                      const dateKey = format(new Date(st.start_time), 'yyyy-MM-dd');
                      if (!acc[dateKey]) acc[dateKey] = [];
                      acc[dateKey].push(st);
                      return acc;
                    }, {} as Record<string, Showtime[]>);

                    return (
                      <div className="space-y-6">
                        {Object.entries(groupedByDate).slice(0, 7).map(([dateKey, showtimes]) => {
                          // Group by screen within each date
                          const groupedByScreen = showtimes.reduce((acc, st) => {
                            const screenName = st.screens?.name || 'Screen';
                            if (!acc[screenName]) acc[screenName] = [];
                            acc[screenName].push(st);
                            return acc;
                          }, {} as Record<string, Showtime[]>);

                          return (
                            <div key={dateKey}>
                              <p className="text-white/50 text-sm mb-3 font-medium">
                                {format(new Date(dateKey), 'EEEE, MMMM d')}
                              </p>
                              <div className="space-y-3">
                                {Object.entries(groupedByScreen).map(([screenName, screenShowtimes]) => (
                                  <div key={screenName} className="flex flex-col gap-2">
                                    <span className="text-white/40 text-xs font-medium uppercase tracking-wide">
                                      {screenName}
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                      {screenShowtimes.map((showtime) => {
                                        const availability = getAvailabilityStatus(showtime.bookedCount, showtime.capacity);
                                        const isSoldOut = availability?.label === 'Sold Out';
                                        
                                        return (
                                          <Link
                                            key={showtime.id}
                                            to={isSoldOut ? '#' : `/cinema/${slug}/booking?movie=${selectedMovie.id}&showtime=${showtime.id}`}
                                            onClick={(e) => {
                                              if (isSoldOut) {
                                                e.preventDefault();
                                              } else {
                                                setSelectedMovie(null);
                                              }
                                            }}
                                          >
                                            <button
                                              className={`relative px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                                                isSoldOut 
                                                  ? 'border-white/10 text-white/30 cursor-not-allowed' 
                                                  : 'border-white/20 text-white/80 hover:text-black'
                                              }`}
                                              disabled={isSoldOut}
                                              onMouseEnter={(e) => {
                                                if (!isSoldOut) {
                                                  e.currentTarget.style.backgroundColor = cinema?.primary_color || '#D4AF37';
                                                  e.currentTarget.style.borderColor = cinema?.primary_color || '#D4AF37';
                                                }
                                              }}
                                              onMouseLeave={(e) => {
                                                if (!isSoldOut) {
                                                  e.currentTarget.style.backgroundColor = 'transparent';
                                                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                                                }
                                              }}
                                            >
                                              {format(new Date(showtime.start_time), 'h:mm a')}
                                              {availability && (
                                                <span 
                                                  className="ml-2 text-xs"
                                                  style={{ color: availability.color }}
                                                >
                                                  • {availability.label}
                                                </span>
                                              )}
                                            </button>
                                          </Link>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer
        className="py-8 border-t"
        style={{ backgroundColor: cinema?.secondary_color || 'hsl(var(--card))' }}
      >
        <div className="container mx-auto px-4">
          {/* Social Media Links */}
          {(cinema?.social_facebook || cinema?.social_instagram || cinema?.social_twitter) && (
            <div className="flex items-center justify-center gap-4 mb-6">
              {cinema?.social_facebook && (
                <a
                  href={cinema.social_facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5" style={{ color: cinema.primary_color }} />
                </a>
              )}
              {cinema?.social_instagram && (
                <a
                  href={cinema.social_instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" style={{ color: cinema.primary_color }} />
                </a>
              )}
              {cinema?.social_twitter && (
                <a
                  href={cinema.social_twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="h-5 w-5" style={{ color: cinema.primary_color }} />
                </a>
              )}
            </div>
          )}
          
          <p className="text-muted-foreground text-sm text-center">
            © {new Date().getFullYear()} {cinema?.name}. Powered by CineTix.
          </p>
        </div>
      </footer>

      {/* AI Chatbot */}
      {cinema?.id && (
        <CinemaChatbot
          organizationId={cinema.id}
          cinemaName={cinema.name}
          primaryColor={cinema.primary_color || '#D4AF37'}
        />
      )}
    </div>
  );
}
