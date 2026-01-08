import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format, isSameDay, addDays, startOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Film, Ticket, Clock, MapPin, Phone, Mail, Calendar, Play, X } from 'lucide-react';
import { CinemaHero } from '@/components/public/CinemaHero';

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
}

interface Showtime {
  id: string;
  start_time: string;
  price: number;
  screens: { name: string };
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

export default function PublicCinema() {
  const { slug } = useParams<{ slug: string }>();
  const [cinema, setCinema] = useState<CinemaData | null>(null);
  const [movies, setMovies] = useState<MovieWithShowtimes[]>([]);
  const [allMovies, setAllMovies] = useState<MovieWithShowtimes[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Track page view
  const trackPageView = async (orgId: string) => {
    try {
      // Get or create a visitor ID for anonymous tracking
      let visitorId = localStorage.getItem('visitor_id');
      if (!visitorId) {
        visitorId = crypto.randomUUID();
        localStorage.setItem('visitor_id', visitorId);
      }

      await supabase.from('page_views').insert({
        organization_id: orgId,
        page_path: `/cinema/${slug}`,
        visitor_id: visitorId,
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
      });
    } catch (error) {
      // Silently fail - don't disrupt user experience for analytics
      console.error('Failed to track page view:', error);
    }
  };

  useEffect(() => {
    if (slug) {
      fetchCinemaData();
    }
  }, [slug]);

  const fetchCinemaData = async () => {
    try {
      // Fetch cinema with extended info
      const { data: cinemaData, error: cinemaError } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, primary_color, secondary_color, about_text, contact_email, contact_phone, address, social_facebook, social_instagram, social_twitter')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (cinemaError) throw cinemaError;

      if (!cinemaData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setCinema(cinemaData);
      
      // Track page view after confirming cinema exists
      trackPageView(cinemaData.id);
      const { data: moviesData } = await supabase
        .from('movies')
        .select('id, title, description, duration_minutes, poster_url, genre, rating, trailer_url')
        .eq('organization_id', cinemaData.id)
        .eq('is_active', true);

      if (moviesData && moviesData.length > 0) {
        // Store all movies for hero display
        setAllMovies(moviesData.map(m => ({ ...m, showtimes: [] })));
        
        // Fetch showtimes for each movie
        const moviesWithShowtimes = await Promise.all(
          moviesData.map(async (movie) => {
            const { data: showtimes } = await supabase
              .from('showtimes')
              .select('id, start_time, price, screens (name)')
              .eq('movie_id', movie.id)
              .eq('is_active', true)
              .gte('start_time', new Date().toISOString())
              .order('start_time')
              .limit(6);

            return {
              ...movie,
              showtimes: showtimes || [],
            };
          })
        );

        // Only include movies with upcoming showtimes for the listing
        setMovies(moviesWithShowtimes.filter(m => m.showtimes.length > 0));
      }
    } catch (error) {
      console.error('Error fetching cinema:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

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
      />

      {/* Now Showing */}
      <section id="movies" className="py-12 md:py-16" style={{ backgroundColor: '#0a0a0f' }}>
        <div className="container mx-auto px-4">
          {/* Header with title and date tabs */}
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 mb-8">
            <h3 className="text-2xl md:text-3xl font-bold text-white whitespace-nowrap">
              Now Showing
            </h3>
            
            {/* Date Tabs */}
            {(() => {
              const today = startOfDay(new Date());
              const dates = Array.from({ length: 5 }, (_, i) => addDays(today, i));
              
              return (
                <div className="flex items-center gap-1 md:gap-2 overflow-x-auto pb-2 md:pb-0">
                  {dates.map((date, index) => (
                    <button
                      key={date.toISOString()}
                      className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium whitespace-nowrap rounded-sm transition-colors ${
                        index === 0
                          ? 'border-b-2'
                          : 'text-white/60 hover:text-white'
                      }`}
                      style={index === 0 ? { 
                        color: cinema?.primary_color || '#D4AF37',
                        borderColor: cinema?.primary_color || '#D4AF37'
                      } : undefined}
                    >
                      {format(date, 'MMM do')}
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Movies Grid */}
          {movies.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {movies.map((movie) => (
                  <div key={movie.id} className="flex gap-3">
                    {/* Movie Poster */}
                    <div className="relative w-24 md:w-28 flex-shrink-0 aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 group">
                      {movie.poster_url ? (
                        <img
                          src={movie.poster_url}
                          alt={movie.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="h-8 w-8 text-gray-600" />
                        </div>
                      )}
                      
                      {/* Hover overlay with play button */}
                      {movie.trailer_url && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: cinema?.primary_color || '#D4AF37' }}
                          >
                            <Play className="h-4 w-4 text-black ml-0.5" fill="black" />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Movie Info & Showtimes */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium text-sm md:text-base leading-tight mb-2 line-clamp-2">
                        {movie.title}
                      </h4>
                      
                      {/* Showtimes */}
                      <div className="flex flex-wrap gap-1.5">
                        {movie.showtimes.slice(0, 4).map((showtime) => (
                          <Link
                            key={showtime.id}
                            to={`/cinema/${slug}/book?showtime=${showtime.id}`}
                          >
                            <button
                              className="px-2 py-1 text-xs font-medium rounded border border-white/20 text-white/80 hover:border-white/40 hover:text-white transition-colors"
                            >
                              {format(new Date(showtime.start_time), 'h:mm a')}
                            </button>
                          </Link>
                        ))}
                        {movie.showtimes.length > 4 && (
                          <span className="px-2 py-1 text-xs text-white/50">
                            +{movie.showtimes.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* See All Link */}
              <div className="flex justify-end mt-6">
                <button 
                  className="text-sm font-medium hover:underline"
                  style={{ color: cinema?.primary_color || '#D4AF37' }}
                >
                  See All
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <Film className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                No movies are currently scheduled. Check back soon!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-16" style={{ backgroundColor: 'hsl(var(--card))' }}>
        <div className="container mx-auto px-4">
          <h3 className="text-2xl font-bold text-foreground mb-8">About Us</h3>
          
          {cinema?.about_text && (
            <p className="text-muted-foreground mb-8 max-w-3xl">{cinema.about_text}</p>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="pt-6 text-center">
                <div
                  className="p-4 rounded-full inline-block mb-4"
                  style={{ backgroundColor: `${cinema?.primary_color}20` }}
                >
                  <Ticket className="h-8 w-8" style={{ color: cinema?.primary_color }} />
                </div>
                <h4 className="font-semibold text-foreground mb-2">Easy Booking</h4>
                <p className="text-muted-foreground text-sm">
                  Book your tickets online in just a few clicks
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div
                  className="p-4 rounded-full inline-block mb-4"
                  style={{ backgroundColor: `${cinema?.primary_color}20` }}
                >
                  <Clock className="h-8 w-8" style={{ color: cinema?.primary_color }} />
                </div>
                <h4 className="font-semibold text-foreground mb-2">Flexible Showtimes</h4>
                <p className="text-muted-foreground text-sm">
                  Multiple showtimes to fit your schedule
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div
                  className="p-4 rounded-full inline-block mb-4"
                  style={{ backgroundColor: `${cinema?.primary_color}20` }}
                >
                  <Film className="h-8 w-8" style={{ color: cinema?.primary_color }} />
                </div>
                <h4 className="font-semibold text-foreground mb-2">Latest Movies</h4>
                <p className="text-muted-foreground text-sm">
                  Catch the newest blockbusters and classics
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Contact Info */}
          {(cinema?.contact_email || cinema?.contact_phone || cinema?.address) && (
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              {cinema?.contact_email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5" style={{ color: cinema?.primary_color }} />
                  <a href={`mailto:${cinema.contact_email}`} className="text-foreground hover:underline">
                    {cinema.contact_email}
                  </a>
                </div>
              )}
              {cinema?.contact_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5" style={{ color: cinema?.primary_color }} />
                  <a href={`tel:${cinema.contact_phone}`} className="text-foreground hover:underline">
                    {cinema.contact_phone}
                  </a>
                </div>
              )}
              {cinema?.address && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5" style={{ color: cinema?.primary_color }} />
                  <span className="text-foreground">{cinema.address}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-8 border-t"
        style={{ backgroundColor: cinema?.secondary_color || 'hsl(var(--card))' }}
      >
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} {cinema?.name}. Powered by CineTix.
          </p>
        </div>
      </footer>
    </div>
  );
}
