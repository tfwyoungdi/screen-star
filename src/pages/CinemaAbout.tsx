import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Film, MapPin, Phone, Mail, ArrowLeft, Heart, Star, Users, Target } from 'lucide-react';

interface CinemaData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  about_text: string | null;
  mission_text: string | null;
  values_json: { title: string; description: string; icon?: string }[] | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  heart: Heart,
  star: Star,
  users: Users,
  target: Target,
};

export default function CinemaAbout() {
  const { slug } = useParams<{ slug: string }>();

  const { data: cinema, isLoading, isError } = useQuery({
    queryKey: ['public-cinema-about', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, primary_color, secondary_color, about_text, mission_text, values_json, contact_email, contact_phone, address')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data as CinemaData | null;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0a0a0f' }}>
        <div className="container mx-auto px-4 py-20">
          <Skeleton className="h-12 w-64 mb-8" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !cinema) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0f' }}>
        <div className="text-center">
          <Film className="h-16 w-16 text-white/30 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Cinema Not Found</h1>
          <p className="text-white/60 mb-6">The cinema you're looking for doesn't exist.</p>
          <Button asChild>
            <a href="/">Go to Homepage</a>
          </Button>
        </div>
      </div>
    );
  }

  const values = Array.isArray(cinema.values_json) ? cinema.values_json : [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to={`/cinema/${slug}`} className="flex items-center gap-3">
              {cinema.logo_url ? (
                <img src={cinema.logo_url} alt={cinema.name} className="h-10 w-auto" />
              ) : (
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rotate-45"
                    style={{ backgroundColor: cinema.primary_color }}
                  />
                  <span className="text-xl font-bold text-white">{cinema.name}</span>
                </div>
              )}
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link to={`/cinema/${slug}`} className="text-white/70 hover:text-white text-sm transition-colors">HOME</Link>
              <Link to={`/cinema/${slug}#movies`} className="text-white/70 hover:text-white text-sm transition-colors">MOVIES</Link>
              <Link to={`/cinema/${slug}/about`} className="text-white text-sm font-medium">ABOUT</Link>
              <Link to={`/cinema/${slug}/careers`} className="text-white/70 hover:text-white text-sm transition-colors">CAREERS</Link>
              <Link to={`/cinema/${slug}/contact`} className="text-white/70 hover:text-white text-sm transition-colors">CONTACT</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 border-b border-white/10">
        <div className="container mx-auto px-4 text-center">
          <Link 
            to={`/cinema/${slug}`}
            className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Movies
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            About {cinema.name}
          </h1>
          {cinema.about_text && (
            <p className="text-lg text-white/70 max-w-3xl mx-auto">
              {cinema.about_text}
            </p>
          )}
        </div>
      </section>

      {/* Mission Section */}
      {cinema.mission_text && (
        <section className="py-16 border-b border-white/10">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-2xl font-bold text-white mb-6">Our Mission</h2>
              <p className="text-lg text-white/70 leading-relaxed">
                {cinema.mission_text}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Values Section */}
      {values.length > 0 && (
        <section className="py-16 border-b border-white/10">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-white text-center mb-12">Our Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {values.map((value, index) => {
                const IconComponent = value.icon ? iconMap[value.icon] : Star;
                return (
                  <div 
                    key={index}
                    className="p-6 rounded-xl border border-white/10 bg-white/5"
                  >
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                      style={{ backgroundColor: `${cinema.primary_color}20` }}
                    >
                      {IconComponent && (
                        <IconComponent className="h-6 w-6" style={{ color: cinema.primary_color }} />
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{value.title}</h3>
                    <p className="text-white/60 text-sm">{value.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Contact Info */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-white text-center mb-8">Get in Touch</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {cinema.address && (
                <div className="text-center p-4">
                  <MapPin className="h-8 w-8 mx-auto mb-3" style={{ color: cinema.primary_color }} />
                  <p className="text-white/70 text-sm">{cinema.address}</p>
                </div>
              )}
              {cinema.contact_phone && (
                <div className="text-center p-4">
                  <Phone className="h-8 w-8 mx-auto mb-3" style={{ color: cinema.primary_color }} />
                  <a href={`tel:${cinema.contact_phone}`} className="text-white/70 hover:text-white text-sm transition-colors">
                    {cinema.contact_phone}
                  </a>
                </div>
              )}
              {cinema.contact_email && (
                <div className="text-center p-4">
                  <Mail className="h-8 w-8 mx-auto mb-3" style={{ color: cinema.primary_color }} />
                  <a href={`mailto:${cinema.contact_email}`} className="text-white/70 hover:text-white text-sm transition-colors">
                    {cinema.contact_email}
                  </a>
                </div>
              )}
            </div>
            <div className="text-center mt-8">
              <Button 
                asChild
                style={{ backgroundColor: cinema.primary_color }}
                className="hover:opacity-90"
              >
                <Link to={`/cinema/${slug}/contact`}>Contact Us</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} {cinema.name}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
