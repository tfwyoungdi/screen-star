import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { checkRateLimit, formatWaitTime, RATE_LIMITS } from '@/lib/rateLimiter';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function CustomerLogin() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn, user, customer, loading: authLoading } = useCustomerAuth();

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
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Redirect if already logged in with customer data
  useEffect(() => {
    if (!authLoading && user && customer) {
      navigate(`/cinema/${slug}/account`);
    }
  }, [user, authLoading, customer, slug, navigate]);

  const onSubmit = async (data: LoginFormData) => {
    if (!cinema) return;
    
    setError(null);

    // Check rate limit before attempting login
    const rateCheck = checkRateLimit(RATE_LIMITS.CUSTOMER_LOGIN);
    if (rateCheck.isLimited) {
      const waitTime = formatWaitTime(rateCheck.resetInSeconds);
      setError(`Too many login attempts. Please wait ${waitTime} before trying again.`);
      return;
    }

    const { error } = await signIn(data.email, data.password, cinema.id);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.');
      } else if (error.message.includes('Email not confirmed')) {
        setError('Please verify your email before logging in.');
      } else {
        setError(error.message);
      }
      return;
    }

    navigate(`/cinema/${slug}/account`);
  };

  if (cinemaLoading || authLoading) {
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

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Header */}
      <header className="border-b border-white/10 p-4">
        <div className="container mx-auto">
          <Link 
            to={`/cinema/${slug}`} 
            className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {cinema.name}
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
            <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-white/60">
              Sign in to your {cinema.name} account
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

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/80">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className={`bg-white/5 border-white/10 text-white placeholder:text-white/40 pr-10 ${
                    errors.password ? 'border-red-500' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-400">{errors.password.message}</p>
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
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            <div className="text-center">
              <Link
                to={`/cinema/${slug}/forgot-password`}
                className="text-sm hover:underline"
                style={{ color: cinema.primary_color }}
              >
                Forgot your password?
              </Link>
            </div>

            <p className="text-center text-sm text-white/60">
              Don't have an account?{' '}
              <Link
                to={`/cinema/${slug}/signup`}
                className="font-medium hover:underline"
                style={{ color: cinema.primary_color }}
              >
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
