import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Film, ArrowLeft, MapPin, Phone, Mail, Clock, Send, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CinemaData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
}

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function CinemaContact() {
  const { slug } = useParams<{ slug: string }>();
  const [submitted, setSubmitted] = useState(false);

  const { data: cinema, isLoading, isError } = useQuery({
    queryKey: ['public-cinema-contact', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, primary_color, contact_email, contact_phone, address')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data as CinemaData | null;
    },
    enabled: !!slug,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    if (!cinema) return;

    try {
      const { error } = await supabase
        .from('contact_submissions')
        .insert({
          organization_id: cinema.id,
          name: data.name,
          email: data.email,
          subject: data.subject,
          message: data.message,
        });

      if (error) throw error;

      setSubmitted(true);
      reset();
      toast.success('Message sent successfully!');
    } catch (error) {
      console.error('Error submitting contact form:', error);
      toast.error('Failed to send message. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0a0a0f' }}>
        <div className="container mx-auto px-4 py-20">
          <Skeleton className="h-12 w-64 mb-8" />
          <Skeleton className="h-96 w-full" />
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
              <Link to={`/cinema/${slug}/about`} className="text-white/70 hover:text-white text-sm transition-colors">ABOUT</Link>
              <Link to={`/cinema/${slug}/careers`} className="text-white/70 hover:text-white text-sm transition-colors">CAREERS</Link>
              <Link to={`/cinema/${slug}/contact`} className="text-white text-sm font-medium">CONTACT</Link>
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
            Contact Us
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            Have questions or feedback? We'd love to hear from you.
          </p>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Info */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Get in Touch</h2>
                <div className="space-y-4">
                  {cinema.address && (
                    <div className="flex items-start gap-4 p-4 rounded-xl border border-white/10 bg-white/5">
                      <MapPin className="h-6 w-6 shrink-0" style={{ color: cinema.primary_color }} />
                      <div>
                        <h3 className="font-medium text-white mb-1">Address</h3>
                        <p className="text-white/60 text-sm">{cinema.address}</p>
                      </div>
                    </div>
                  )}
                  {cinema.contact_phone && (
                    <div className="flex items-start gap-4 p-4 rounded-xl border border-white/10 bg-white/5">
                      <Phone className="h-6 w-6 shrink-0" style={{ color: cinema.primary_color }} />
                      <div>
                        <h3 className="font-medium text-white mb-1">Phone</h3>
                        <a href={`tel:${cinema.contact_phone}`} className="text-white/60 hover:text-white text-sm transition-colors">
                          {cinema.contact_phone}
                        </a>
                      </div>
                    </div>
                  )}
                  {cinema.contact_email && (
                    <div className="flex items-start gap-4 p-4 rounded-xl border border-white/10 bg-white/5">
                      <Mail className="h-6 w-6 shrink-0" style={{ color: cinema.primary_color }} />
                      <div>
                        <h3 className="font-medium text-white mb-1">Email</h3>
                        <a href={`mailto:${cinema.contact_email}`} className="text-white/60 hover:text-white text-sm transition-colors">
                          {cinema.contact_email}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 rounded-xl border border-white/10 bg-white/5">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="h-6 w-6" style={{ color: cinema.primary_color }} />
                  <h3 className="font-medium text-white">Opening Hours</h3>
                </div>
                <div className="space-y-2 text-sm text-white/60">
                  <div className="flex justify-between">
                    <span>Monday - Friday</span>
                    <span>10:00 AM - 11:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saturday - Sunday</span>
                    <span>9:00 AM - 12:00 AM</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="p-8 rounded-xl border border-white/10 bg-white/5">
              {submitted ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 mx-auto mb-4" style={{ color: cinema.primary_color }} />
                  <h3 className="text-xl font-semibold text-white mb-2">Message Sent!</h3>
                  <p className="text-white/60 mb-6">
                    Thank you for reaching out. We'll get back to you as soon as possible.
                  </p>
                  <Button 
                    onClick={() => setSubmitted(false)}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <h2 className="text-xl font-semibold text-white mb-6">Send a Message</h2>
                  
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-white/80">Name</Label>
                    <Input
                      id="name"
                      {...register('name')}
                      placeholder="Your name"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-400">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white/80">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register('email')}
                      placeholder="your@email.com"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    />
                    {errors.email && (
                      <p className="text-sm text-red-400">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-white/80">Subject</Label>
                    <Input
                      id="subject"
                      {...register('subject')}
                      placeholder="What's this about?"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    />
                    {errors.subject && (
                      <p className="text-sm text-red-400">{errors.subject.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-white/80">Message</Label>
                    <Textarea
                      id="message"
                      {...register('message')}
                      placeholder="Your message..."
                      rows={5}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40 resize-none"
                    />
                    {errors.message && (
                      <p className="text-sm text-red-400">{errors.message.message}</p>
                    )}
                  </div>

                  <Button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full hover:opacity-90"
                    style={{ backgroundColor: cinema.primary_color }}
                  >
                    {isSubmitting ? (
                      'Sending...'
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} {cinema.name}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
