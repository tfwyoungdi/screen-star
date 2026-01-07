import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Clock, Calendar, Star, ChevronLeft, ChevronRight } from 'lucide-react';
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
    <section className="relative h-screen min-h-[700px] overflow-hidden" style={{ backgroundColor: '#0a0a12' }}>
      {/* Background Movie Poster */}
      {featuredMovies.map((movie, index) => (
        <div
          key={movie.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={movie.poster_url!}
            alt={movie.title}
            className="absolute inset-0 w-full h-full object-cover object-top scale-105"
          />
          {/* Gradient Overlays - matching the reference */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a12] via-[#0a0a12]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a12]/90 via-transparent to-[#0a0a12]/70" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a12]/50 via-transparent to-[#0a0a12]" />
        </div>
      ))}

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col justify-end px-6 lg:px-12 pb-20">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 max-w-7xl mx-auto w-full">
          {/* Left Side - Movie Info */}
          <div className="flex-1">
            {/* Movie Title */}
            <h1 
              className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6 leading-none tracking-tight"
              style={{ 
                fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif",
                textShadow: '2px 4px 20px rgba(0,0,0,0.8)'
              }}
            >
              {currentMovie.title}
            </h1>

            {/* Meta Info Row */}
            <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
              {currentMovie.genre && (
                <span className="text-white/80">{currentMovie.genre}</span>
              )}
              <span className="flex items-center gap-1.5 text-white/80">
                <Calendar className="h-4 w-4" style={{ color: primaryColor }} />
                {new Date().getFullYear()}
              </span>
              <span className="flex items-center gap-1.5 text-white/80">
                <Clock className="h-4 w-4" style={{ color: primaryColor }} />
                {formatDuration(currentMovie.duration_minutes)}
              </span>
            </div>

            {/* Star Rating & Age Rating */}
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className="h-5 w-5"
                    style={{ color: primaryColor }}
                    fill={star <= 4 ? primaryColor : 'transparent'}
                  />
                ))}
              </div>
              {currentMovie.rating && (
                <Badge 
                  variant="outline" 
                  className="border-white/40 text-white bg-transparent text-xs px-3 py-1"
                >
                  {currentMovie.rating}
                </Badge>
              )}
            </div>

            {/* Action Buttons - Matching reference style */}
            <div className="flex flex-wrap gap-3">
              <Link to={`/cinema/${cinemaSlug}#movies`}>
                <Button
                  size="lg"
                  className="font-bold px-8 py-6 text-base rounded-md border-2 hover:opacity-90 transition-opacity"
                  style={{ 
                    backgroundColor: primaryColor, 
                    borderColor: primaryColor,
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
                      size="lg"
                      variant="outline"
                      className="font-bold px-8 py-6 text-base rounded-md border-2 text-white hover:bg-white/10 transition-colors"
                      style={{ borderColor: primaryColor, color: primaryColor }}
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
                  size="lg"
                  variant="outline"
                  className="font-bold px-8 py-6 text-base rounded-md border-2 text-white hover:bg-white/10 transition-colors"
                  style={{ borderColor: primaryColor, color: primaryColor }}
                >
                  Review
                </Button>
              )}

              <Link to={`/cinema/${cinemaSlug}#movies`}>
                <Button
                  size="lg"
                  variant="outline"
                  className="font-bold px-8 py-6 text-base rounded-md border-2 text-white hover:bg-white/10 transition-colors"
                  style={{ borderColor: primaryColor, color: primaryColor }}
                >
                  More
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Side - Director & Description */}
          <div className="hidden lg:block max-w-sm text-right space-y-4">
            <div>
              <span className="text-white/60 text-sm">Director : </span>
              <span style={{ color: primaryColor }} className="text-sm font-medium">Film Director</span>
            </div>
            <div>
              <span className="text-white/60 text-sm">Cast : </span>
              <span style={{ color: primaryColor }} className="text-sm font-medium">Featured Stars</span>
            </div>
            {currentMovie.description && (
              <p className="text-white/70 text-sm leading-relaxed line-clamp-3 mt-4">
                {currentMovie.description}
              </p>
            )}
          </div>
        </div>

        {/* Navigation Dots - Centered */}
        {featuredMovies.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            {featuredMovies.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'w-8' 
                    : 'w-2.5 bg-white/30 hover:bg-white/50'
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
