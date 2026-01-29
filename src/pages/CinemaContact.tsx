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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CinemaHeader } from '@/components/public/CinemaHeader';
import { Film, ArrowLeft, MapPin, Phone, Mail, Clock, Send, CheckCircle, Facebook, Instagram, Twitter, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { checkRateLimit, RATE_LIMITS, formatWaitTime } from '@/lib/rateLimiter';
interface CinemaData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  social_facebook: string | null;
  social_instagram: string | null;
  social_twitter: string | null;
}

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  email: z.string().trim().email('Please enter a valid email').max(255, 'Email must be less than 255 characters'),
  subject: z.string().trim().min(5, 'Subject must be at least 5 characters').max(200, 'Subject must be less than 200 characters'),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(2000, 'Message must be less than 2000 characters'),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function CinemaContact() {
  const { slug } = useParams<{ slug: string }>();
  const [submitted, setSubmitted] = useState(false);

  const { data: cinema, isLoading, isError } = useQuery({
    queryKey: ['public-cinema-contact', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        // Use organizations_public view to avoid permission denied errors for anonymous users
        .from('organizations_public')
        .select('id, name, slug, logo_url, primary_color, contact_email, contact_phone, address, social_facebook, social_instagram, social_twitter')
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

  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  const onSubmit = async (data: ContactFormData) => {
    if (!cinema) return;

    // Check rate limit before submission
    const rateCheck = checkRateLimit(RATE_LIMITS.CONTACT_FORM);
    if (rateCheck.isLimited) {
      const waitTime = formatWaitTime(rateCheck.resetInSeconds);
      setRateLimitError(`Too many submissions. Please wait ${waitTime} before trying again.`);
      toast.error(`Please wait ${waitTime} before submitting again.`);
      return;
    }
    setRateLimitError(null);

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

      // Send email notification to admin if contact email is configured
      if (cinema.contact_email) {
        try {
          await supabase.functions.invoke('send-contact-notification', {
            body: {
              organizationId: cinema.id,
              cinemaName: cinema.name,
              adminEmail: cinema.contact_email,
              senderName: data.name,
              senderEmail: data.email,
              subject: data.subject,
              message: data.message,
            },
          });
        } catch (emailError) {
          // Log but don't fail if email fails - submission was still saved
          console.error('Failed to send email notification:', emailError);
        }
      }

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
      <CinemaHeader
        slug={slug!}
        cinemaName={cinema.name}
        logoUrl={cinema.logo_url}
        primaryColor={cinema.primary_color}
        currentPage="contact"
      />

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

              {/* Social Media Links */}
              {(cinema.social_facebook || cinema.social_instagram || cinema.social_twitter) && (
                <div className="p-6 rounded-xl border border-white/10 bg-white/5">
                  <h3 className="font-medium text-white mb-4">Follow Us</h3>
                  <div className="flex items-center gap-3">
                    {cinema.social_facebook && (
                      <a
                        href={cinema.social_facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                        aria-label="Facebook"
                      >
                        <Facebook className="h-5 w-5" style={{ color: cinema.primary_color }} />
                        <span className="text-sm text-white/70">Facebook</span>
                      </a>
                    )}
                    {cinema.social_instagram && (
                      <a
                        href={cinema.social_instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                        aria-label="Instagram"
                      >
                        <Instagram className="h-5 w-5" style={{ color: cinema.primary_color }} />
                        <span className="text-sm text-white/70">Instagram</span>
                      </a>
                    )}
                    {cinema.social_twitter && (
                      <a
                        href={cinema.social_twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                        aria-label="Twitter"
                      >
                        <Twitter className="h-5 w-5" style={{ color: cinema.primary_color }} />
                        <span className="text-sm text-white/70">Twitter</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
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
                  
                  {rateLimitError && (
                    <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{rateLimitError}</AlertDescription>
                    </Alert>
                  )}
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
