import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Clock, Calendar, Star, ChevronLeft, ChevronRight, Search, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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

export function CinemaHero({ movies, cinemaSlug, cinemaName, primaryColor = '#F59E0B', logoUrl }: CinemaHeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

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
                  <div className="w-8 h-8 bg-amber-500 rotate-45 flex items-center justify-center">
                    <div className="w-4 h-4 bg-amber-500 -rotate-45" />
                  </div>
                  <span className="text-xl font-bold text-white">{cinemaName}</span>
                </div>
              )}
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <Search className="h-5 w-5 text-white/70 hover:text-white cursor-pointer" />
              <a href="#" className="text-white/90 hover:text-white font-medium">HOME</a>
              <a href="#movies" className="text-white/70 hover:text-white">MOVIE</a>
              <a href="#about" className="text-white/70 hover:text-white">ABOUT</a>
              <Grid3X3 className="h-5 w-5 text-white/70 hover:text-white cursor-pointer" />
            </nav>
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

  return (
    <section className="relative h-[600px] overflow-hidden" style={{ backgroundColor: '#0a0a12' }}>
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
            <Search className="h-4 w-4 text-white/70 hover:text-white cursor-pointer transition-colors" />
            <a href="#" className="text-white text-sm font-medium hover:text-amber-400 transition-colors">HOME</a>
            <a href="#movies" className="text-white/70 text-sm hover:text-white font-medium transition-colors">MOVIE</a>
            <a href="#about" className="text-white/70 text-sm hover:text-white font-medium transition-colors">ABOUT</a>
            <Grid3X3 className="h-4 w-4 text-white/70 hover:text-white cursor-pointer transition-colors" />
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col justify-end px-6 lg:px-12 pb-12">
        <div className="max-w-7xl mx-auto w-full">
          {/* Movie Title */}
          <h1 
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 leading-none tracking-tight"
            style={{ 
              fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif",
              textShadow: '2px 4px 20px rgba(0,0,0,0.8)'
            }}
          >
            {currentMovie.title.toUpperCase()}
          </h1>

          {/* Meta Info Row */}
          <div className="flex flex-wrap items-center gap-3 mb-5 text-sm text-white/80">
            <span>{new Date().getFullYear()}</span>
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: primaryColor }} />
            <span>{formatDuration(currentMovie.duration_minutes)}</span>
            {currentMovie.rating && (
              <>
                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: primaryColor }} />
                <span className="px-2 py-0.5 border border-white/40 rounded text-xs">
                  {currentMovie.rating}
                </span>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <Link to={`/cinema/${cinemaSlug}#movies`}>
              <Button
                size="default"
                className="font-semibold px-5 py-2 text-sm rounded-md hover:opacity-90 transition-opacity"
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
                    size="default"
                    variant="outline"
                    className="font-semibold px-5 py-2 text-sm rounded-md border text-white hover:bg-white/10 transition-colors"
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
                size="default"
                variant="outline"
                className="font-semibold px-5 py-2 text-sm rounded-md border text-white hover:bg-white/10 transition-colors"
                style={{ borderColor: 'rgba(255,255,255,0.4)' }}
              >
                Review
              </Button>
            )}

            <Button
              size="default"
              variant="ghost"
              className="font-semibold px-5 py-2 text-sm rounded-md text-white hover:bg-white/10 transition-colors"
            >
              More
            </Button>
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
