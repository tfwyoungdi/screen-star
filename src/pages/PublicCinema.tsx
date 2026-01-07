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

        // Only include movies with upcoming showtimes
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
      {/* Header */}
      <header
        className="border-b"
        style={{ backgroundColor: cinema?.secondary_color || 'hsl(var(--card))' }}
      >
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {cinema?.logo_url ? (
              <img
                src={cinema.logo_url}
                alt={`${cinema.name} logo`}
                className="h-12 w-auto object-contain"
              />
            ) : (
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: `${cinema?.primary_color}20` }}
              >
                <Film
                  className="h-6 w-6"
                  style={{ color: cinema?.primary_color }}
                />
              </div>
            )}
            <h1 className="text-2xl font-bold text-foreground">{cinema?.name}</h1>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <a href="#movies" className="text-foreground/80 hover:text-foreground transition-colors">
              Now Showing
            </a>
            <a href="#about" className="text-foreground/80 hover:text-foreground transition-colors">
              About
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section
        className="py-16 text-center"
        style={{
          background: `linear-gradient(135deg, ${cinema?.secondary_color || '#1a1a2e'} 0%, ${cinema?.primary_color}20 100%)`,
        }}
      >
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Welcome to {cinema?.name}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Experience the magic of cinema. Browse our latest movies and book your tickets online.
          </p>
        </div>
      </section>

      {/* Now Showing */}
      <section id="movies" className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <h3 className="text-2xl font-bold text-foreground mb-8 flex items-center gap-2">
            <Film className="h-6 w-6" style={{ color: cinema?.primary_color }} />
            Now Showing
          </h3>

          {movies.length > 0 ? (
            <div className="space-y-8">
              {movies.map((movie) => {
                // Group showtimes by date
                const showtimesByDate = movie.showtimes.reduce((acc, showtime) => {
                  const dateKey = format(new Date(showtime.start_time), 'yyyy-MM-dd');
                  if (!acc[dateKey]) {
                    acc[dateKey] = [];
                  }
                  acc[dateKey].push(showtime);
                  return acc;
                }, {} as Record<string, Showtime[]>);

                const dates = Object.keys(showtimesByDate).sort();
                const today = startOfDay(new Date());

                return (
                  <Card key={movie.id} className="overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                      {/* Movie Poster */}
                      <div
                        className="w-full md:w-48 h-64 md:h-auto flex-shrink-0 flex items-center justify-center relative group"
                        style={{ backgroundColor: `${cinema?.secondary_color}80` }}
                      >
                        {movie.poster_url ? (
                          <img
                            src={movie.poster_url}
                            alt={movie.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Film className="h-16 w-16 text-muted-foreground" />
                        )}
                        {movie.rating && (
                          <Badge className="absolute top-2 right-2" variant="secondary">
                            {movie.rating}
                          </Badge>
                        )}
                        
                        {/* Trailer Play Button */}
                        {movie.trailer_url && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <button className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div 
                                  className="w-14 h-14 rounded-full flex items-center justify-center"
                                  style={{ backgroundColor: cinema?.primary_color }}
                                >
                                  <Play className="h-6 w-6 text-white ml-1" fill="white" />
                                </div>
                              </button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl p-0 overflow-hidden">
                              <DialogHeader className="p-4 pb-0">
                                <DialogTitle>{movie.title} - Trailer</DialogTitle>
                              </DialogHeader>
                              <div className="aspect-video">
                                <iframe
                                  src={getTrailerEmbed(movie.trailer_url)!}
                                  className="w-full h-full"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>

                      {/* Movie Info & Showtimes */}
                      <div className="flex-1 p-6">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="text-xl font-bold">{movie.title}</h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {movie.duration_minutes} min
                              </span>
                              {movie.genre && <span>{movie.genre}</span>}
                            </div>
                          </div>
                          {movie.trailer_url && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="gap-1">
                                  <Play className="h-3 w-3" />
                                  Trailer
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl p-0 overflow-hidden">
                                <DialogHeader className="p-4 pb-0">
                                  <DialogTitle>{movie.title} - Trailer</DialogTitle>
                                </DialogHeader>
                                <div className="aspect-video">
                                  <iframe
                                    src={getTrailerEmbed(movie.trailer_url)!}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>

                        {movie.description && (
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {movie.description}
                          </p>
                        )}

                        {/* Showtimes grouped by date */}
                        {dates.length > 0 && (
                          <Tabs defaultValue={dates[0]} className="w-full">
                            <TabsList className="mb-3 flex-wrap h-auto gap-1">
                              {dates.slice(0, 7).map((date) => {
                                const dateObj = new Date(date);
                                const isToday = isSameDay(dateObj, today);
                                const isTomorrow = isSameDay(dateObj, addDays(today, 1));
                                
                                return (
                                  <TabsTrigger key={date} value={date} className="text-xs px-3 py-1.5">
                                    {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : format(dateObj, 'EEE, MMM d')}
                                  </TabsTrigger>
                                );
                              })}
                            </TabsList>
                            {dates.slice(0, 7).map((date) => (
                              <TabsContent key={date} value={date} className="mt-0">
                                <div className="flex flex-wrap gap-2">
                                  {showtimesByDate[date].map((showtime) => (
                                    <Link
                                      key={showtime.id}
                                      to={`/cinema/${slug}/book?showtime=${showtime.id}`}
                                    >
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-sm hover:border-primary"
                                        style={{ 
                                          '--tw-ring-color': cinema?.primary_color 
                                        } as React.CSSProperties}
                                      >
                                        {format(new Date(showtime.start_time), 'h:mm a')}
                                        <span className="ml-2 text-xs text-muted-foreground">
                                          ${showtime.price}
                                        </span>
                                      </Button>
                                    </Link>
                                  ))}
                                </div>
                              </TabsContent>
                            ))}
                          </Tabs>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <Film className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No movies are currently scheduled. Check back soon!
                </p>
              </CardContent>
            </Card>
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
