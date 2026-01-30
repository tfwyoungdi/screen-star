import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Clock, Calendar, Star, ChevronLeft, ChevronRight, Search, Grid3X3, User, LogIn, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { CustomerLoyaltyWidget } from '@/components/loyalty/CustomerLoyaltyWidget';
interface Movie {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  poster_url: string | null;
  genre: string | null;
  rating: string | null;
  trailer_url: string | null;
}

interface CinemaHeroProps {
  movies: Movie[];
  cinemaSlug: string;
  cinemaName: string;
  primaryColor?: string;
  logoUrl?: string | null;
  organizationId?: string;
  websiteTemplate?: string | null;
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

const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

export function CinemaHero({ movies, cinemaSlug, cinemaName, primaryColor = '#F59E0B', logoUrl, organizationId, websiteTemplate }: CinemaHeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, customer, loading } = useCustomerAuth();

  // Use all movies, even without showtimes, for hero display
  const featuredMovies = movies.filter(m => m.poster_url).slice(0, 5);
  const currentMovie = featuredMovies[currentIndex];

  // Auto-rotate slides
  useEffect(() => {
    if (!isAutoPlaying || featuredMovies.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredMovies.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, featuredMovies.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToPrevious = () => {
    goToSlide(currentIndex === 0 ? featuredMovies.length - 1 : currentIndex - 1);
  };

  const goToNext = () => {
    goToSlide((currentIndex + 1) % featuredMovies.length);
  };

  if (!currentMovie) {
    return (
      <section className="relative h-screen min-h-[600px] flex flex-col" style={{ backgroundColor: '#0a0a12' }}>
        {/* Header */}
        <header className="relative z-20 px-6 lg:px-12 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt={cinemaName} className="h-10 w-auto" />
              ) : (
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rotate-45 flex items-center justify-center"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <div className="w-4 h-4 -rotate-45" style={{ backgroundColor: primaryColor }} />
                  </div>
                  <span className="text-xl font-bold text-white">{cinemaName}</span>
                </div>
              )}
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <a href="#" className="text-white/90 hover:text-white font-medium text-sm">HOME</a>
              <a href="#movies" className="text-white/70 hover:text-white text-sm">MOVIE</a>
              <Link to={`/cinema/${cinemaSlug}/careers`} className="text-white/70 hover:text-white text-sm">CAREERS</Link>
              <Link to={`/cinema/${cinemaSlug}/contact`} className="text-white/70 hover:text-white text-sm">CONTACT</Link>
              
              {/* Auth Buttons */}
              {!loading && (
                <>
                  {user && customer ? (
                    <Link to={`/cinema/${cinemaSlug}/account`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white/70 hover:text-white hover:bg-white/10"
                      >
                        <User className="h-4 w-4 mr-2" />
                        My Account
                      </Button>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Link to={`/cinema/${cinemaSlug}/login`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white/70 hover:text-white hover:bg-white/10"
                        >
                          <LogIn className="h-4 w-4 mr-2" />
                          Login
                        </Button>
                      </Link>
                      <Link to={`/cinema/${cinemaSlug}/signup`}>
                        <Button
                          size="sm"
                          style={{ 
                            backgroundColor: primaryColor,
                            color: '#000',
                          }}
                          className="hover:opacity-90"
                        >
                          Sign Up
                        </Button>
                      </Link>
                    </div>
                  )}
                </>
              )}
              
              {organizationId && (
                <CustomerLoyaltyWidget 
                  organizationId={organizationId} 
                  primaryColor={primaryColor} 
                />
              )}
            </nav>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent 
                side="right" 
                className="w-[280px] border-white/10 p-0"
                style={{ backgroundColor: '#0a0a0f' }}
              >
                <div className="flex flex-col p-4">
                  <a href="#" className="py-3 text-white font-medium">HOME</a>
                  <a href="#movies" className="py-3 text-white/70">MOVIE</a>
                  <Link to={`/cinema/${cinemaSlug}/careers`} className="py-3 text-white/70">CAREERS</Link>
                  <Link to={`/cinema/${cinemaSlug}/contact`} className="py-3 text-white/70">CONTACT</Link>
                  
                  {!loading && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      {user && customer ? (
                        <Link to={`/cinema/${cinemaSlug}/account`} onClick={() => setMobileMenuOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start text-white/70">
                            <User className="h-5 w-5 mr-2" />
                            My Account
                          </Button>
                        </Link>
                      ) : (
                        <>
                          <Link to={`/cinema/${cinemaSlug}/login`} onClick={() => setMobileMenuOpen(false)}>
                            <Button variant="ghost" className="w-full justify-start text-white/70">
                              <LogIn className="h-5 w-5 mr-2" />
                              Login
                            </Button>
                          </Link>
                          <Link to={`/cinema/${cinemaSlug}/signup`} onClick={() => setMobileMenuOpen(false)}>
                            <Button
                              className="w-full mt-2"
                              style={{ backgroundColor: primaryColor, color: '#000' }}
                            >
                              Sign Up
                            </Button>
                          </Link>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Welcome to {cinemaName}
            </h2>
            <p className="text-lg text-white/70">
              No movies currently showing. Check back soon!
            </p>
          </div>
        </div>
      </section>
    );
  }

  const isCinemaCarousel = websiteTemplate === 'cinema-carousel';
  const isLuxuryPremiere = websiteTemplate === 'luxury-premiere';
  
  // Colors for Luxury Premiere
  const luxuryAccent = '#D4A574';
  const luxuryBg = '#0D0A0B';

  return (
    <section 
      className="relative h-[400px] md:h-[600px] overflow-hidden" 
      style={{ backgroundColor: isLuxuryPremiere ? luxuryBg : '#0a0a12' }}
    >
      {/* Background Movie Poster - Fixed size container */}
      {featuredMovies.map((movie, index) => (
        <div
          key={movie.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="absolute inset-0">
            <img
              src={movie.poster_url!}
              alt={movie.title}
              className="w-full h-full object-cover object-center"
              style={{ objectPosition: 'center 20%' }}
            />
          </div>
          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a12] via-[#0a0a12]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a12]/90 via-transparent to-[#0a0a12]/70" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a12]/50 via-transparent to-[#0a0a12]" />
        </div>
      ))}

      {/* Header Navigation */}
      <header className="relative z-20 px-6 lg:px-12 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={cinemaName} className="h-8 w-auto" />
            ) : (
              <div className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rotate-45 flex items-center justify-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  <div className="w-2 h-2 bg-black/20 -rotate-45" />
                </div>
                <span className="text-lg font-bold text-white">{cinemaName}</span>
              </div>
            )}
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#" className="text-white text-sm font-medium hover:text-white/80 transition-colors">HOME</a>
            <a href="#movies" className="text-white/70 text-sm hover:text-white font-medium transition-colors">MOVIE</a>
            <Link to={`/cinema/${cinemaSlug}/careers`} className="text-white/70 text-sm hover:text-white font-medium transition-colors">CAREERS</Link>
            <Link to={`/cinema/${cinemaSlug}/contact`} className="text-white/70 text-sm hover:text-white font-medium transition-colors">CONTACT</Link>
            
            {/* Auth Buttons */}
            {!loading && (
              <>
                {user && customer ? (
                  <Link to={`/cinema/${cinemaSlug}/account`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white/70 hover:text-white hover:bg-white/10"
                    >
                      <User className="h-4 w-4 mr-2" />
                      My Account
                    </Button>
                  </Link>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link to={`/cinema/${cinemaSlug}/login`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white/70 hover:text-white hover:bg-white/10"
                      >
                        <LogIn className="h-4 w-4 mr-2" />
                        Login
                      </Button>
                    </Link>
                    <Link to={`/cinema/${cinemaSlug}/signup`}>
                      <Button
                        size="sm"
                        style={{ 
                          backgroundColor: primaryColor,
                          color: '#000',
                        }}
                        className="hover:opacity-90"
                      >
                        Sign Up
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            )}
            
            {organizationId && (
              <CustomerLoyaltyWidget 
                organizationId={organizationId} 
                primaryColor={primaryColor} 
              />
            )}
          </nav>

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent 
              side="right" 
              className="w-[280px] border-white/10 p-0"
              style={{ backgroundColor: '#0a0a0f' }}
            >
              <div className="flex flex-col p-4">
                <a href="#" className="py-3 text-white font-medium">HOME</a>
                <a href="#movies" className="py-3 text-white/70">MOVIE</a>
                <Link to={`/cinema/${cinemaSlug}/careers`} className="py-3 text-white/70" onClick={() => setMobileMenuOpen(false)}>CAREERS</Link>
                <Link to={`/cinema/${cinemaSlug}/contact`} className="py-3 text-white/70" onClick={() => setMobileMenuOpen(false)}>CONTACT</Link>
                
                {!loading && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    {user && customer ? (
                      <Link to={`/cinema/${cinemaSlug}/account`} onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start text-white/70">
                          <User className="h-5 w-5 mr-2" />
                          My Account
                        </Button>
                      </Link>
                    ) : (
                      <>
                        <Link to={`/cinema/${cinemaSlug}/login`} onClick={() => setMobileMenuOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start text-white/70">
                            <LogIn className="h-5 w-5 mr-2" />
                            Login
                          </Button>
                        </Link>
                        <Link to={`/cinema/${cinemaSlug}/signup`} onClick={() => setMobileMenuOpen(false)}>
                          <Button
                            className="w-full mt-2"
                            style={{ backgroundColor: primaryColor, color: '#000' }}
                          >
                            Sign Up
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col justify-center px-6 lg:px-12">
        <div className={cn(
          "max-w-7xl mx-auto w-full",
          isLuxuryPremiere && "text-center"
        )}>
          {/* Category Label for Cinema Carousel */}
          {isCinemaCarousel && currentMovie.genre && (
            <span
              className="text-base font-medium italic"
              style={{ color: primaryColor }}
            >
              {currentMovie.genre} Movie
            </span>
          )}

          {/* Luxury Premiere header */}
          {isLuxuryPremiere && (
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="h-px w-12" style={{ backgroundColor: luxuryAccent }} />
              <span 
                className="text-xs tracking-[0.3em] uppercase"
                style={{ color: luxuryAccent }}
              >
                Now Showing
              </span>
              <div className="h-px w-12" style={{ backgroundColor: luxuryAccent }} />
            </div>
          )}

          {/* Movie Title */}
          <h1 
            className={cn(
              "font-bold text-white leading-none tracking-tight",
              isLuxuryPremiere 
                ? "text-3xl sm:text-4xl md:text-6xl lg:text-7xl mb-4 md:mb-6" 
                : "text-2xl sm:text-3xl md:text-5xl lg:text-6xl mb-2 md:mb-3"
            )}
            style={{ 
              fontFamily: isLuxuryPremiere ? "'Playfair Display', serif" : "'Arial Black', 'Helvetica Neue', sans-serif",
              textShadow: '2px 4px 20px rgba(0,0,0,0.8)'
            }}
          >
            {isLuxuryPremiere ? (
              <>
                {currentMovie.title}
              </>
            ) : isCinemaCarousel ? (
              currentMovie.title
            ) : (
              currentMovie.title.toUpperCase()
            )}
          </h1>

          {/* Description for Cinema Carousel */}
          {isCinemaCarousel && currentMovie.description && (
            <p className="text-sm text-white/70 mb-6 max-w-lg leading-relaxed line-clamp-2">
              {currentMovie.description}
            </p>
          )}

          {/* Description for Luxury Premiere */}
          {isLuxuryPremiere && currentMovie.description && (
            <p 
              className="text-base mb-8 max-w-xl mx-auto leading-relaxed line-clamp-2"
              style={{ color: '#A89A9D' }}
            >
              {currentMovie.description}
            </p>
          )}

          {/* Meta Info Row - only for standard templates */}
          {!isCinemaCarousel && !isLuxuryPremiere && (
          <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4 md:mb-5 text-xs md:text-sm text-white/80">
            <span>{new Date().getFullYear()}</span>
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: primaryColor }} />
            <span>{formatDuration(currentMovie.duration_minutes)}</span>
            {currentMovie.rating && (
              <>
                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: primaryColor }} />
                <span className="px-1.5 md:px-2 py-0.5 border border-white/40 rounded text-xs">
                  {currentMovie.rating}
                </span>
              </>
            )}
          </div>
          )}

          {/* Action Buttons */}
          <div className={cn(
            "flex flex-wrap items-center gap-2 md:gap-3 mb-4 md:mb-5",
            isLuxuryPremiere && "justify-center"
          )}>
            {isLuxuryPremiere ? (
              <>
                <Link to={`/cinema/${cinemaSlug}/booking?movie=${currentMovie.id}`}>
                  <Button
                    size="sm"
                    className="font-semibold px-6 py-3 text-sm rounded-md hover:opacity-90 transition-opacity"
                    style={{ 
                      backgroundColor: primaryColor, 
                      color: '#fff',
                      boxShadow: `0 8px 32px ${primaryColor}40`
                    }}
                  >
                    Reserve Seats
                  </Button>
                </Link>
                {currentMovie.trailer_url && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="font-semibold px-6 py-3 text-sm rounded-md border-2 transition-colors"
                        style={{ 
                          borderColor: luxuryAccent,
                          color: luxuryAccent
                        }}
                      >
                        Watch Trailer
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-white/10">
                      <DialogHeader className="p-4 pb-0">
                        <DialogTitle className="text-white">{currentMovie.title} - Trailer</DialogTitle>
                      </DialogHeader>
                      <div className="aspect-video">
                        <iframe
                          src={getTrailerEmbed(currentMovie.trailer_url)!}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </>
            ) : isCinemaCarousel ? (
              <>
                <Link to={`/cinema/${cinemaSlug}/booking?movie=${currentMovie.id}`}>
                  <Button
                    size="sm"
                    className="font-semibold px-5 py-2.5 text-sm rounded-md hover:opacity-90 transition-opacity flex items-center gap-2"
                    style={{ 
                      backgroundColor: primaryColor, 
                      color: '#fff' 
                    }}
                  >
                    <span>◉</span> More Info
                  </Button>
                </Link>
                <Link to={`/cinema/${cinemaSlug}#movies`}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="font-semibold px-5 py-2.5 text-sm rounded-md border-2 text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                    style={{ borderColor: '#ffffff' }}
                  >
                    <span>◉</span> Get Ticket
                  </Button>
                </Link>
              </>
            ) : (
              <>
            <Link to={`/cinema/${cinemaSlug}#movies`}>
              <Button
                size="sm"
                className="font-semibold px-4 md:px-5 py-1.5 md:py-2 text-xs md:text-sm rounded-md hover:opacity-90 transition-opacity"
                style={{ 
                  backgroundColor: primaryColor, 
                  color: '#000' 
                }}
              >
                Book Tickets
              </Button>
            </Link>
            
            {currentMovie.trailer_url ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="font-semibold px-4 md:px-5 py-1.5 md:py-2 text-xs md:text-sm rounded-md border text-white hover:bg-white/10 transition-colors"
                    style={{ borderColor: 'rgba(255,255,255,0.4)' }}
                  >
                    Review
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-white/10">
                  <DialogHeader className="p-4 pb-0">
                    <DialogTitle className="text-white">{currentMovie.title} - Trailer</DialogTitle>
                  </DialogHeader>
                  <div className="aspect-video">
                    <iframe
                      src={getTrailerEmbed(currentMovie.trailer_url)!}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="font-semibold px-4 md:px-5 py-1.5 md:py-2 text-xs md:text-sm rounded-md border text-white hover:bg-white/10 transition-colors"
                style={{ borderColor: 'rgba(255,255,255,0.4)' }}
              >
                Review
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              className="font-semibold px-4 md:px-5 py-1.5 md:py-2 text-xs md:text-sm rounded-md text-white hover:bg-white/10 transition-colors"
            >
              More
            </Button>
              </>
            )}
          </div>

        </div>

        {/* Navigation Dots */}
        {featuredMovies.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            {featuredMovies.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'w-6' 
                    : 'w-2 bg-white/30 hover:bg-white/50'
                }`}
                style={index === currentIndex ? { backgroundColor: primaryColor } : {}}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Arrow Navigation */}
      {featuredMovies.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/50 transition-all hidden md:flex items-center justify-center z-20"
            aria-label="Previous movie"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/50 transition-all hidden md:flex items-center justify-center z-20"
            aria-label="Next movie"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}
    </section>
  );
}
