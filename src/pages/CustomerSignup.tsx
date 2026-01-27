import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowLeft, Check } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { checkRateLimit, formatWaitTime, RATE_LIMITS } from '@/lib/rateLimiter';

const signupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function CustomerSignup() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { signUp, user, loading: authLoading } = useCustomerAuth();

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
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading && cinema && !success) {
      navigate(`/cinema/${slug}/account`);
    }
  }, [user, authLoading, cinema, slug, navigate, success]);

  const onSubmit = async (data: SignupFormData) => {
    if (!cinema) return;
    
    setError(null);

    // Check rate limit before attempting signup
    const rateCheck = checkRateLimit(RATE_LIMITS.CUSTOMER_SIGNUP);
    if (rateCheck.isLimited) {
      const waitTime = formatWaitTime(rateCheck.resetInSeconds);
      setError(`Too many signup attempts. Please wait ${waitTime} before trying again.`);
      return;
    }

    const { error } = await signUp(data.email, data.password, data.fullName, cinema.id);

    if (error) {
      if (error.message.includes('User already registered')) {
        setError('An account with this email already exists. Please sign in instead.');
      } else if (error.message.includes('security purposes')) {
        setError('Please wait a moment before trying again.');
      } else {
        setError(error.message);
      }
      return;
    }

    setSuccess(true);
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

  if (success) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0a0a0f' }}>
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

        <main className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md text-center">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: `${cinema.primary_color}20` }}
            >
              <Check className="h-8 w-8" style={{ color: cinema.primary_color }} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">Check Your Email</h1>
            <p className="text-white/60 mb-8">
              We've sent a confirmation link to your email address. Please click the link to verify your account and start earning rewards!
            </p>
            <Button
              onClick={() => navigate(`/cinema/${slug}/login`)}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              Go to Login
            </Button>
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
            <h1 className="text-2xl font-bold text-white mb-2">Create Your Account</h1>
            <p className="text-white/60">
              Join {cinema.name} and start earning rewards
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
              <Label htmlFor="fullName" className="text-white/80">Full Name</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                {...register('fullName')}
                className={`bg-white/5 border-white/10 text-white placeholder:text-white/40 ${
                  errors.fullName ? 'border-red-500' : ''
                }`}
              />
              {errors.fullName && (
                <p className="text-sm text-red-400">{errors.fullName.message}</p>
              )}
            </div>

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

            <div className="grid grid-cols-2 gap-4">
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white/80">Confirm</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('confirmPassword')}
                    className={`bg-white/5 border-white/10 text-white placeholder:text-white/40 pr-10 ${
                      errors.confirmPassword ? 'border-red-500' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-400">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <p className="text-xs text-white/40">
              Password must be at least 8 characters with uppercase, lowercase, and a number.
            </p>

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
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>

            <p className="text-center text-sm text-white/60">
              Already have an account?{' '}
              <Link
                to={`/cinema/${slug}/login`}
                className="font-medium hover:underline"
                style={{ color: cinema.primary_color }}
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
