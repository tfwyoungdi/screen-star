import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { loginSchema, type LoginFormData } from '@/lib/validations';
import { supabase } from '@/integrations/supabase/client';
import { checkRateLimit, formatWaitTime, RATE_LIMITS } from '@/lib/rateLimiter';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);

    // Check rate limit before attempting login
    const rateCheck = checkRateLimit(RATE_LIMITS.LOGIN);
    if (rateCheck.isLimited) {
      const waitTime = formatWaitTime(rateCheck.resetInSeconds);
      setError(`Too many login attempts. Please wait ${waitTime} before trying again.`);
      return;
    }

    const { error } = await signIn(data.email, data.password);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.');
      } else if (error.message.includes('Email not confirmed')) {
        setError('Please verify your email address before logging in.');
      } else {
        setError(error.message);
      }
      return;
    }

    // Verify user has cinema_admin or manager role (only these roles can use /login)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Authentication failed. Please try again.');
      await supabase.auth.signOut();
      return;
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const userRoles = roles?.map(r => r.role) || [];
    const allowedRoles = ['cinema_admin', 'manager'];
    const hasAllowedRole = userRoles.some(role => allowedRoles.includes(role));

    if (!hasAllowedRole) {
      // Sign out and show error - only cinema admins/managers can use this login
      await supabase.auth.signOut();
      setError("You don't have an account.");
      return;
    }

    navigate('/dashboard');
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to access your cinema dashboard"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="admin@yourcinema.com"
            {...register('email')}
            className={errors.email ? 'border-destructive' : ''}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              to="/forgot-password"
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              {...register('password')}
              className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || authLoading}
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

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Register your cinema
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
