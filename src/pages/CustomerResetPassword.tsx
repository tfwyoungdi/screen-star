import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Check, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const resetPasswordSchema = z.object({
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

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function CustomerResetPassword() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  // Fetch cinema data
  const { data: cinema, isLoading: cinemaLoading } = useQuery({
    queryKey: ['cinema', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        // Use organizations_public view to avoid permission denied errors for anonymous users
        .from('organizations_public')
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
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check if there's a recovery token in the URL hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      
      if (type === 'recovery' && accessToken) {
        // Set the session from the recovery link
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: hashParams.get('refresh_token') || '',
        });
        
        if (error) {
          setIsValidSession(false);
        } else {
          setIsValidSession(true);
        }
      } else if (session) {
        setIsValidSession(true);
      } else {
        setIsValidSession(false);
      }
    };

    checkSession();
  }, []);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setError(null);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    }
  };

  if (cinemaLoading || isValidSession === null) {
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

  // Show error if invalid session
  if (!isValidSession) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0a0a0f' }}>
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-red-500/20">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">Invalid Reset Link</h1>
            <p className="text-white/60 mb-8">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Button
              onClick={() => navigate(`/cinema/${slug}/forgot-password`)}
              className="w-full"
              style={{ 
                backgroundColor: cinema.primary_color,
                color: '#000',
              }}
            >
              Request New Reset Link
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Show success state
  if (success) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0a0a0f' }}>
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md text-center">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: `${cinema.primary_color}20` }}
            >
              <Check className="h-8 w-8" style={{ color: cinema.primary_color }} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">Password Updated!</h1>
            <p className="text-white/60 mb-8">
              Your password has been successfully changed. You can now sign in with your new password.
            </p>
            <Button
              onClick={() => navigate(`/cinema/${slug}/login`)}
              className="w-full"
              style={{ 
                backgroundColor: cinema.primary_color,
                color: '#000',
              }}
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
            <h1 className="text-2xl font-bold text-white mb-2">Set New Password</h1>
            <p className="text-white/60">
              Enter your new password below
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
              <Label htmlFor="password" className="text-white/80">New Password</Label>
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
              <Label htmlFor="confirmPassword" className="text-white/80">Confirm New Password</Label>
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
                  Updating password...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
