import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { checkRateLimit, formatWaitTime, RATE_LIMITS } from '@/lib/rateLimiter';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function CustomerForgotPassword() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch cinema data
  const { data: cinema, isLoading: cinemaLoading } = useQuery({
    queryKey: ['cinema', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, logo_url, primary_color')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError(null);

    // Check rate limit before sending reset email
    const rateCheck = checkRateLimit(RATE_LIMITS.CUSTOMER_PASSWORD_RESET);
    if (rateCheck.isLimited) {
      const waitTime = formatWaitTime(rateCheck.resetInSeconds);
      setError(`Too many reset attempts. Please wait ${waitTime} before trying again.`);
      return;
    }
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/cinema/${slug}/reset-password`,
      });

      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    }
  };

  if (cinemaLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0f' }}>
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!cinema) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0f' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Cinema Not Found</h1>
          <Link to="/" className="text-amber-400 hover:underline">
            Go back home
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0a0a0f' }}>
        <header className="border-b border-white/10 p-4">
          <div className="container mx-auto">
            <Link 
              to={`/cinema/${slug}/login`} 
              className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md text-center">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: `${cinema.primary_color}20` }}
            >
              <Mail className="h-8 w-8" style={{ color: cinema.primary_color }} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">Check Your Email</h1>
            <p className="text-white/60 mb-8">
              If an account exists with that email, you will receive a password reset link shortly.
            </p>
            
            <div className="space-y-3">
              <Link to={`/cinema/${slug}/login`}>
                <Button 
                  variant="outline" 
                  className="w-full border-white/20 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </Link>
            </div>

            <p className="text-center text-xs text-white/40 mt-6">
              Didn't receive the email? Check your spam folder or{' '}
              <button
                onClick={() => setSuccess(false)}
                className="hover:underline"
                style={{ color: cinema.primary_color }}
              >
                try again
              </button>
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Header */}
      <header className="border-b border-white/10 p-4">
        <div className="container mx-auto">
          <Link 
            to={`/cinema/${slug}/login`} 
            className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            {cinema.logo_url ? (
              <img 
                src={cinema.logo_url} 
                alt={cinema.name} 
                className="h-16 w-auto mx-auto mb-4" 
              />
            ) : (
              <div 
                className="w-12 h-12 rotate-45 mx-auto mb-4"
                style={{ backgroundColor: cinema.primary_color }}
              />
            )}
            <h1 className="text-2xl font-bold text-white mb-2">Forgot Password</h1>
            <p className="text-white/60">
              Enter your email to reset your password
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
                <AlertDescription className="text-red-400">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/80">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
                className={`bg-white/5 border-white/10 text-white placeholder:text-white/40 ${
                  errors.email ? 'border-red-500' : ''
                }`}
              />
              {errors.email && (
                <p className="text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
              style={{ 
                backgroundColor: cinema.primary_color,
                color: '#000',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending reset link...
                </>
              ) : (
                'Send Reset Link'
              )}
            </Button>

            <Link to={`/cinema/${slug}/login`} className="block">
              <Button 
                variant="ghost" 
                className="w-full text-white/70 hover:text-white hover:bg-white/10"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </Link>
          </form>
        </div>
      </main>
    </div>
  );
}
