import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Check, AlertCircle } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validations';
import { supabase } from '@/integrations/supabase/client';

export default function ResetPassword() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

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
    const { error } = await updatePassword(data.password);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(true);
  };

  // Show loading while checking session
  if (isValidSession === null) {
    return (
      <AuthLayout title="Reset Password" subtitle="Please wait...">
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AuthLayout>
    );
  }

  // Show error if invalid session
  if (!isValidSession) {
    return (
      <AuthLayout
        title="Invalid Reset Link"
        subtitle="This password reset link is invalid or has expired"
      >
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-destructive/20 rounded-full">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>

          <Alert variant="destructive">
            <AlertDescription className="text-center">
              The password reset link is invalid or has expired. Please request a new one.
            </AlertDescription>
          </Alert>

          <Button onClick={() => navigate('/forgot-password')} className="w-full">
            Request New Reset Link
          </Button>
        </div>
      </AuthLayout>
    );
  }

  // Show success state
  if (success) {
    return (
      <AuthLayout
        title="Password Updated!"
        subtitle="Your password has been successfully changed"
      >
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/20 rounded-full">
              <Check className="h-8 w-8 text-primary" />
            </div>
          </div>

          <Alert className="border-primary/50 bg-primary/10">
            <AlertDescription className="text-foreground text-center">
              You can now sign in with your new password.
            </AlertDescription>
          </Alert>

          <Button onClick={() => navigate('/login')} className="w-full">
            Go to Login
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set New Password"
      subtitle="Enter your new password below"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
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
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
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
              Updating password...
            </>
          ) : (
            'Update Password'
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
