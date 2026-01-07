import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Film, Ticket, Clock, MapPin, Phone, Mail } from 'lucide-react';

interface CinemaData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
}

export default function PublicCinema() {
  const { slug } = useParams<{ slug: string }>();
  const [cinema, setCinema] = useState<CinemaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchCinema();
    }
  }, [slug]);

  const fetchCinema = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, primary_color, secondary_color')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setNotFound(true);
      } else {
        setCinema(data);
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
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

  // Apply custom cinema colors via CSS variables
  const customStyles = {
    '--cinema-primary': cinema?.primary_color || '#D4AF37',
    '--cinema-secondary': cinema?.secondary_color || '#1a1a2e',
  } as React.CSSProperties;

  return (
    <div className="min-h-screen" style={customStyles}>
      {/* Header with cinema branding */}
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
                style={{ backgroundColor: `${cinema?.primary_color}20` || 'hsl(var(--primary) / 0.2)' }}
              >
                <Film
                  className="h-6 w-6"
                  style={{ color: cinema?.primary_color || 'hsl(var(--primary))' }}
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
            <a href="#contact" className="text-foreground/80 hover:text-foreground transition-colors">
              Contact
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section
        className="py-20 text-center"
        style={{
          background: `linear-gradient(135deg, ${cinema?.secondary_color || '#1a1a2e'} 0%, ${cinema?.primary_color}20 100%)`,
        }}
      >
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Welcome to {cinema?.name}
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Experience the magic of cinema. Browse our latest movies and book your tickets online.
          </p>
          <Button
            size="lg"
            style={{
              backgroundColor: cinema?.primary_color || 'hsl(var(--primary))',
              color: '#000',
            }}
            className="hover:opacity-90 transition-opacity"
          >
            <Ticket className="mr-2 h-5 w-5" />
            Book Tickets
          </Button>
        </div>
      </section>

      {/* Now Showing Section */}
      <section id="movies" className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <h3 className="text-2xl font-bold text-foreground mb-8 flex items-center gap-2">
            <Film
              className="h-6 w-6"
              style={{ color: cinema?.primary_color || 'hsl(var(--primary))' }}
            />
            Now Showing
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Placeholder movies - will be replaced with real data */}
            {[
              { title: 'Coming Soon', description: 'Movies will appear here once scheduled' },
            ].map((movie, index) => (
              <Card key={index} className="overflow-hidden">
                <div
                  className="h-48 flex items-center justify-center"
                  style={{ backgroundColor: `${cinema?.secondary_color}80` || 'hsl(var(--muted))' }}
                >
                  <Film className="h-12 w-12 text-muted-foreground" />
                </div>
                <CardHeader>
                  <CardTitle className="text-lg">{movie.title}</CardTitle>
                  <CardDescription>{movie.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-muted-foreground">
              No movies are currently scheduled. Check back soon!
            </p>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16" style={{ backgroundColor: 'hsl(var(--card))' }}>
        <div className="container mx-auto px-4">
          <h3 className="text-2xl font-bold text-foreground mb-8">About Us</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="pt-6 text-center">
                <div
                  className="p-4 rounded-full inline-block mb-4"
                  style={{ backgroundColor: `${cinema?.primary_color}20` }}
                >
                  <Ticket
                    className="h-8 w-8"
                    style={{ color: cinema?.primary_color }}
                  />
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
                  <Clock
                    className="h-8 w-8"
                    style={{ color: cinema?.primary_color }}
                  />
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
                  <Film
                    className="h-8 w-8"
                    style={{ color: cinema?.primary_color }}
                  />
                </div>
                <h4 className="font-semibold text-foreground mb-2">Latest Movies</h4>
                <p className="text-muted-foreground text-sm">
                  Catch the newest blockbusters and classics
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <h3 className="text-2xl font-bold text-foreground mb-8">Contact Us</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4">
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: `${cinema?.primary_color}20` }}
              >
                <MapPin
                  className="h-5 w-5"
                  style={{ color: cinema?.primary_color }}
                />
              </div>
              <div>
                <p className="font-medium text-foreground">Location</p>
                <p className="text-sm text-muted-foreground">Contact cinema for address</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: `${cinema?.primary_color}20` }}
              >
                <Phone
                  className="h-5 w-5"
                  style={{ color: cinema?.primary_color }}
                />
              </div>
              <div>
                <p className="font-medium text-foreground">Phone</p>
                <p className="text-sm text-muted-foreground">Contact cinema for phone</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: `${cinema?.primary_color}20` }}
              >
                <Mail
                  className="h-5 w-5"
                  style={{ color: cinema?.primary_color }}
                />
              </div>
              <div>
                <p className="font-medium text-foreground">Email</p>
                <p className="text-sm text-muted-foreground">Contact cinema for email</p>
              </div>
            </div>
          </div>
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
