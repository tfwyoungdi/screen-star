import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Globe } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { signupSchema, type SignupFormData } from '@/lib/validations';
import { checkRateLimit, formatWaitTime, RATE_LIMITS } from '@/lib/rateLimiter';

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const cinemaName = watch('cinemaName');

  // Generate preview slug from cinema name
  const previewSlug = cinemaName
    ? cinemaName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    : 'your-cinema';

  const onSubmit = async (data: SignupFormData) => {
    setError(null);

    // Check rate limit before attempting signup
    const rateCheck = checkRateLimit(RATE_LIMITS.SIGNUP);
    if (rateCheck.isLimited) {
      const waitTime = formatWaitTime(rateCheck.resetInSeconds);
      setError(`Too many registration attempts. Please wait ${waitTime} before trying again.`);
      return;
    }

    const { error, organizationSlug } = await signUp(
      data.email,
      data.password,
      data.fullName,
      data.cinemaName
    );

    if (error) {
      if (error.message.includes('User already registered')) {
        setError('An account with this email already exists. Please sign in instead.');
      } else if (error.message.includes('duplicate key')) {
        setError('A cinema with this name already exists. Please choose a different name.');
      } else if (error.message.includes('security purposes') || error.message.includes('after') && error.message.includes('seconds')) {
        setError('Please wait a moment before trying again. This is a security measure.');
      } else {
        setError(error.message);
      }
      return;
    }

    // Redirect to choose plan page
    navigate('/choose-plan');
  };

  return (
    <AuthLayout
      title="Register Your Cinema"
      subtitle="Create your admin account and get started"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="cinemaName">Cinema Name</Label>
          <Input
            id="cinemaName"
            placeholder="Grand Cinema Palace"
            {...register('cinemaName')}
            className={errors.cinemaName ? 'border-destructive' : ''}
          />
          {errors.cinemaName && (
            <p className="text-sm text-destructive">{errors.cinemaName.message}</p>
          )}
          {cinemaName && !errors.cinemaName && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Globe className="h-3 w-3" />
              Your URL: <span className="text-primary font-mono">{previewSlug}.cinetix.com</span>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullName">Admin Full Name</Label>
          <Input
            id="fullName"
            placeholder="John Smith"
            {...register('fullName')}
            className={errors.fullName ? 'border-destructive' : ''}
          />
          {errors.fullName && (
            <p className="text-sm text-destructive">{errors.fullName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Admin Email</Label>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                {...register('password')}
                className={errors.password ? 'border-destructive pr-12' : 'pr-12'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-0 h-full px-3 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors min-w-[44px]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                {...register('confirmPassword')}
                className={errors.confirmPassword ? 'border-destructive pr-12' : 'pr-12'}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-0 top-0 h-full px-3 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors min-w-[44px]"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Password must be at least 8 characters with uppercase, lowercase, and a number.
        </p>

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating your cinema...
            </>
          ) : (
            'Register Cinema'
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
