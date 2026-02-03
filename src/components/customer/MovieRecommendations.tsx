import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sparkles, Star, Clock, Loader2, Film, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface MovieRecommendation {
  id: string;
  title: string;
  genre: string | null;
  rating: string | null;
  description: string | null;
  poster_url: string | null;
  duration_minutes: number;
  reason: string;
  matchScore: number;
}

interface RecommendationsResponse {
  recommendations: MovieRecommendation[];
  basedOn: 'ai_personalized' | 'genre_match' | 'popular' | 'none_available';
  topGenres?: string[];
  moviesWatched?: number;
  message?: string;
}

interface MovieRecommendationsProps {
  customerId: string;
  organizationId: string;
  primaryColor: string;
}

export function MovieRecommendations({ 
  customerId, 
  organizationId, 
  primaryColor 
}: MovieRecommendationsProps) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recommend-movies`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ customerId, organizationId }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Recommendation error:', err);
      setError('Unable to load recommendations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (customerId && organizationId) {
      fetchRecommendations();
    }
  }, [customerId, organizationId]);

  const handleBookMovie = (movieId: string) => {
    navigate(`/cinema/${slug}/book?movie=${movieId}`);
  };

  const getMatchColor = (score: number) => {
    if (score >= 85) return 'text-green-400';
    if (score >= 70) return 'text-amber-400';
    return 'text-blue-400';
  };

  const getBasedOnLabel = () => {
    switch (data?.basedOn) {
      case 'ai_personalized':
        return (
          <Badge className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-500/30">
            <Sparkles className="h-3 w-3 mr-1" />
            AI Personalized
          </Badge>
        );
      case 'genre_match':
        return (
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
            Genre Match
          </Badge>
        );
      case 'popular':
        return (
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
            Popular Picks
          </Badge>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-8 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/60 mb-4" />
          <p className="text-white/60">Analyzing your preferences...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-8 text-center">
          <Film className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60 mb-4">{error}</p>
          <Button
            variant="outline"
            onClick={() => fetchRecommendations()}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (data?.basedOn === 'none_available') {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-8 text-center">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <Star className="h-8 w-8" style={{ color: primaryColor }} />
          </div>
          <p className="text-white font-medium mb-2">You're a true cinema fan!</p>
          <p className="text-white/60">{data.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data?.recommendations || data.recommendations.length === 0) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-8 text-center">
          <Film className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60">No recommendations available right now</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getBasedOnLabel()}
          {data.topGenres && data.topGenres.length > 0 && (
            <span className="text-white/40 text-sm">
              You love: {data.topGenres.join(', ')}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchRecommendations(true)}
          disabled={refreshing}
          className="text-white/60 hover:text-white hover:bg-white/10"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {data.recommendations.map((movie) => (
          <Card 
            key={movie.id} 
            className="bg-white/5 border-white/10 overflow-hidden hover:bg-white/10 transition-colors"
          >
            <div className="flex">
              {/* Poster */}
              <div className="w-24 h-36 flex-shrink-0 bg-white/5">
                {movie.poster_url ? (
                  <img
                    src={movie.poster_url}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="h-8 w-8 text-white/20" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 p-4 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-white font-semibold line-clamp-1">
                    {movie.title}
                  </h3>
                  <div className={`text-sm font-bold ${getMatchColor(movie.matchScore)}`}>
                    {movie.matchScore}%
                  </div>
                </div>

                {/* Match Progress */}
                <div className="mb-2">
                  <Progress 
                    value={movie.matchScore} 
                    className="h-1.5 bg-white/10"
                    style={{ 
                      ['--progress-foreground' as any]: primaryColor 
                    }}
                  />
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-2 text-xs text-white/40 mb-2">
                  {movie.genre && (
                    <span className="truncate">{movie.genre}</span>
                  )}
                  {movie.rating && (
                    <>
                      <span>•</span>
                      <span>{movie.rating}</span>
                    </>
                  )}
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {movie.duration_minutes}m
                  </span>
                </div>

                {/* AI Reason */}
                <p className="text-white/60 text-xs line-clamp-2 mb-3 flex-1">
                  <Sparkles className="h-3 w-3 inline mr-1 text-purple-400" />
                  {movie.reason}
                </p>

                {/* Book Button */}
                <Button
                  size="sm"
                  onClick={() => handleBookMovie(movie.id)}
                  className="w-full text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  Book Now
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {data.moviesWatched && data.moviesWatched > 0 && (
        <p className="text-white/40 text-xs text-center">
          Based on {data.moviesWatched} movies you've watched at this cinema
        </p>
      )}
    </div>
  );
}
