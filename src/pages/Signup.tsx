import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Check, Globe } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { signupSchema, type SignupFormData } from '@/lib/validations';

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ message: string; slug: string } | null>(null);
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
    setSuccess(null);

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

    setSuccess({
      message: 'Your cinema has been registered successfully! Please check your email to verify your account.',
      slug: organizationSlug || previewSlug,
    });
  };

  if (success) {
    return (
      <AuthLayout
        title="Registration Successful!"
        subtitle="Your cinema account has been created"
      >
        <div className="space-y-6">
          <Alert className="border-primary/50 bg-primary/10">
            <Check className="h-4 w-4 text-primary" />
            <AlertDescription className="text-foreground">
              {success.message}
            </AlertDescription>
          </Alert>

          <div className="p-4 bg-card rounded-lg border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Globe className="h-4 w-4" />
              Your Cinema Dashboard URL
            </div>
            <code className="text-primary font-mono text-sm">
              {success.slug}.cinetix.com
            </code>
          </div>

          <div className="space-y-3">
            <Button onClick={() => navigate('/login')} className="w-full">
              Go to Login
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="w-full"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
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

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('confirmPassword')}
                className={errors.confirmPassword ? 'border-destructive pr-10' : 'pr-10'}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
