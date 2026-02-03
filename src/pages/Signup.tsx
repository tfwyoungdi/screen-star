import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Check, Globe, Building2, User, Mail, Lock, ArrowRight } from 'lucide-react';
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
  const password = watch('password');

  // Generate preview slug from cinema name
  const previewSlug = cinemaName
    ? cinemaName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    : 'your-cinema';

  // Password strength indicator
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { strength: 0, label: '' };
    let strength = 0;
    if (pass.length >= 8) strength++;
    if (/[A-Z]/.test(pass)) strength++;
    if (/[a-z]/.test(pass)) strength++;
    if (/[0-9]/.test(pass)) strength++;
    if (/[^A-Za-z0-9]/.test(pass)) strength++;
    
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const colors = ['', 'bg-destructive', 'bg-orange-500', 'bg-yellow-500', 'bg-chart-3', 'bg-primary'];
    return { strength, label: labels[strength], color: colors[strength] };
  };

  const passwordStrength = getPasswordStrength(password || '');

  const onSubmit = async (data: SignupFormData) => {
    setError(null);
    setSuccess(null);

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

    setSuccess({
      message: 'Your cinema has been registered successfully! Please check your email to verify your account.',
      slug: organizationSlug || previewSlug,
    });
  };

  if (success) {
    return (
      <AuthLayout
        title="You're all set! 🎉"
        subtitle="Your cinema account has been created"
        showTestimonial={false}
      >
        <div className="space-y-6">
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Check your inbox</p>
                <p className="text-sm text-muted-foreground">
                  We've sent a verification link to your email. Click it to activate your account.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-secondary/50 rounded-xl border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Globe className="h-4 w-4" />
              Your Cinema Dashboard URL
            </div>
            <div className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border">
              <code className="text-primary font-mono text-sm flex-1">
                {success.slug}.cinetix.com
              </code>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Button 
              onClick={() => navigate('/login')} 
              className="w-full h-12 text-base font-semibold gap-2"
            >
              Continue to Login
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="w-full text-muted-foreground hover:text-foreground"
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
      title="Create your account"
      subtitle="Start your 14-day free trial. No credit card required."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {error && (
          <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Cinema Name Field */}
        <div className="space-y-2">
          <Label htmlFor="cinemaName" className="text-sm font-medium">
            Cinema Name
          </Label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
            </div>
            <Input
              id="cinemaName"
              placeholder="Grand Cinema Palace"
              {...register('cinemaName')}
              className={`h-12 pl-10 ${errors.cinemaName ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            />
          </div>
          {errors.cinemaName ? (
            <p className="text-sm text-destructive">{errors.cinemaName.message}</p>
          ) : cinemaName && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Globe className="h-3 w-3" />
              <span>Your URL:</span>
              <span className="text-primary font-mono font-medium">{previewSlug}.cinetix.com</span>
            </div>
          )}
        </div>

        {/* Admin Name Field */}
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-sm font-medium">
            Your Full Name
          </Label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              <User className="h-4 w-4" />
            </div>
            <Input
              id="fullName"
              placeholder="John Smith"
              {...register('fullName')}
              className={`h-12 pl-10 ${errors.fullName ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            />
          </div>
          {errors.fullName && (
            <p className="text-sm text-destructive">{errors.fullName.message}</p>
          )}
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email Address
          </Label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Mail className="h-4 w-4" />
            </div>
            <Input
              id="email"
              type="email"
              placeholder="admin@yourcinema.com"
              {...register('email')}
              className={`h-12 pl-10 ${errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            />
          </div>
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        {/* Password Fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Lock className="h-4 w-4" />
              </div>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                {...register('password')}
                className={`h-12 pl-10 pr-10 ${errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
            
            {/* Password strength indicator */}
            {password && (
              <div className="space-y-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        level <= passwordStrength.strength
                          ? passwordStrength.color
                          : 'bg-border'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Password strength: <span className="font-medium">{passwordStrength.label}</span>
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm Password
            </Label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Lock className="h-4 w-4" />
              </div>
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                {...register('confirmPassword')}
                className={`h-12 pl-10 pr-10 ${errors.confirmPassword ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full h-12 text-base font-semibold mt-6"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating your account...
            </>
          ) : (
            'Create Account'
          )}
        </Button>

        {/* Divider */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-sm text-muted-foreground">
              Already have an account?
            </span>
          </div>
        </div>

        {/* Sign in link */}
        <Button
          type="button"
          variant="outline"
          className="w-full h-11"
          onClick={() => navigate('/login')}
        >
          Sign in to your account
        </Button>
      </form>
    </AuthLayout>
  );
}
