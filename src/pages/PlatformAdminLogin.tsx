import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import logo from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { loginSchema, type LoginFormData } from '@/lib/validations';
import { getDefaultRouteForRole, type PlatformRoleType } from '@/lib/platformRoleConfig';
import { GENERIC_ERRORS } from '@/lib/errorMessages';

export default function PlatformAdminLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      // Check server-side rate limit before attempting login
      const { data: rateLimitResult, error: rateLimitError } = await supabase.rpc(
        'check_platform_login_rate_limit',
        { _identifier: data.email.toLowerCase() }
      );

      if (rateLimitError) {
        console.error('Rate limit check error:', rateLimitError);
        // Continue with login if rate limit check fails (don't block)
      } else if (rateLimitResult && typeof rateLimitResult === 'object' && rateLimitResult !== null) {
        const result = rateLimitResult as { allowed?: boolean; error?: string; retry_after_seconds?: number };
        if (!result.allowed) {
          setError(result.error || 'Too many login attempts. Please wait.');
          setRetryAfter(result.retry_after_seconds || 900);
          setIsLoading(false);
          return;
        }
      }

      // Sign in the user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        // Record failed login attempt for rate limiting and audit logging
        await supabase.rpc('record_platform_login_failure', {
          _identifier: data.email.toLowerCase(),
        });
        
        // Log failed attempt to audit log (fire and forget)
        (supabase.rpc as any)('log_platform_login_attempt', {
          _identifier: data.email.toLowerCase(),
          _success: false,
          _failure_reason: 'invalid_credentials',
        });

        // Use generic error message to prevent user enumeration
        setError(GENERIC_ERRORS.AUTHENTICATION);
        return;
      }

      if (!authData.user) {
        await supabase.rpc('record_platform_login_failure', {
          _identifier: data.email.toLowerCase(),
        });
        setError(GENERIC_ERRORS.AUTHENTICATION);
        return;
      }

      // Use the new secure get_platform_role function
      const { data: platformRole, error: roleError } = await supabase.rpc('get_platform_role', {
        _user_id: authData.user.id,
      });

      if (roleError) {
        console.error('Role check error:', roleError);
        await supabase.auth.signOut();
        setError(GENERIC_ERRORS.AUTHORIZATION);
        return;
      }

      if (!platformRole) {
        await supabase.auth.signOut();
        // Record as failed attempt (unauthorized access attempt)
        await supabase.rpc('record_platform_login_failure', {
          _identifier: data.email.toLowerCase(),
        });
        
        // Log unauthorized access attempt (fire and forget)
        (supabase.rpc as any)('log_platform_login_attempt', {
          _identifier: data.email.toLowerCase(),
          _success: false,
          _failure_reason: 'no_platform_role',
        });
        
        // Use generic error to prevent role enumeration
        setError(GENERIC_ERRORS.AUTHORIZATION);
        return;
      }

      // Clear rate limit on successful login
      await supabase.rpc('clear_platform_login_rate_limit', {
        _identifier: data.email.toLowerCase(),
      });
      
      // Log successful login (fire and forget)
      (supabase.rpc as any)('log_platform_login_attempt', {
        _identifier: data.email.toLowerCase(),
        _success: true,
      });

      // Successful login - redirect to appropriate dashboard based on role
      const defaultRoute = getDefaultRouteForRole(platformRole as PlatformRoleType);
      navigate(defaultRoute);
    } catch (err) {
      console.error('Login error:', err);
      setError(GENERIC_ERRORS.SERVER);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex items-center justify-center">
            <img src={logo} alt="Cinitix" className="h-16 w-auto" />
          </div>
          <div>
            <CardTitle className="text-2xl">Platform Admin</CardTitle>
            <CardDescription>
              Secure access for platform administrators only
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {error}
                  {retryAfter && (
                    <span className="block mt-1 text-xs">
                      Please try again in {Math.ceil(retryAfter / 60)} minutes.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@platform.com"
                {...register('email')}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

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

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
