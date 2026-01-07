import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validations';

export default function ForgotPassword() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { resetPassword } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError(null);
    const { error } = await resetPassword(data.email);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(true);
  };

  if (success) {
    return (
      <AuthLayout
        title="Check Your Email"
        subtitle="We've sent you a password reset link"
      >
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/20 rounded-full">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>

          <Alert className="border-primary/50 bg-primary/10">
            <AlertDescription className="text-foreground text-center">
              If an account exists with that email, you will receive a password reset link shortly.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Link to="/login">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </Link>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Didn't receive the email? Check your spam folder or{' '}
            <button
              onClick={() => setSuccess(false)}
              className="text-primary hover:text-primary/80 transition-colors"
            >
              try again
            </button>
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="Enter your email to reset your password"
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

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
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

        <Link to="/login" className="block">
          <Button variant="ghost" className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Button>
        </Link>
      </form>
    </AuthLayout>
  );
}
