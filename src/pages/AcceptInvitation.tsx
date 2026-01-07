import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, Check, Building2 } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

const acceptInviteSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type AcceptInviteData = z.infer<typeof acceptInviteSchema>;

const roleLabels: Record<string, string> = {
  box_office: 'Box Office',
  gate_staff: 'Gate Staff',
  manager: 'Manager',
  accountant: 'Accountant',
};

interface InvitationDetails {
  id: string;
  organization_id: string;
  organization_name: string;
  email: string;
  role: string;
  expires_at: string;
}

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AcceptInviteData>({
    resolver: zodResolver(acceptInviteSchema),
  });

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) {
        setError('Invalid invitation link');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('get_invitation_by_token', {
          invitation_token: token,
        });

        if (error) throw error;

        if (!data || data.length === 0) {
          setError('This invitation has expired or is no longer valid');
          setLoading(false);
          return;
        }

        setInvitation(data[0] as InvitationDetails);
      } catch (err) {
        console.error('Error fetching invitation:', err);
        setError('Failed to load invitation details');
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  const onSubmit = async (data: AcceptInviteData) => {
    if (!invitation || !token) return;

    setError(null);

    try {
      // 1. Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: data.fullName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      // 2. Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        organization_id: invitation.organization_id,
        full_name: data.fullName,
        email: invitation.email,
      });

      if (profileError) throw profileError;

      // 3. Assign role
      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: authData.user.id,
        organization_id: invitation.organization_id,
        role: invitation.role as 'box_office' | 'gate_staff' | 'manager' | 'accountant',
      });

      if (roleError) throw roleError;

      // 4. Mark invitation as accepted
      const { error: updateError } = await supabase
        .from('staff_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      setSuccess(true);
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError((err as Error).message || 'Failed to create your account');
    }
  };

  if (loading) {
    return (
      <AuthLayout title="Loading..." subtitle="Please wait">
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AuthLayout>
    );
  }

  if (error && !invitation) {
    return (
      <AuthLayout title="Invalid Invitation" subtitle="Something went wrong">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/login')} className="w-full mt-4">
          Go to Login
        </Button>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout title="Welcome to the Team!" subtitle="Your account has been created">
        <div className="space-y-6">
          <Alert className="border-primary/50 bg-primary/10">
            <Check className="h-4 w-4 text-primary" />
            <AlertDescription className="text-foreground">
              Please check your email to verify your account, then you can log in.
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
      title="Join Your Cinema Team"
      subtitle="Complete your account setup"
    >
      {invitation && (
        <div className="mb-6 p-4 bg-card rounded-lg border border-border">
          <div className="flex items-center gap-3 mb-3">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="font-semibold">{invitation.organization_name}</span>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>You've been invited as: <Badge variant="secondary">{roleLabels[invitation.role]}</Badge></p>
            <p>Email: {invitation.email}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
              {...register('confirmPassword')}
              className={errors.confirmPassword ? 'border-destructive pr-10' : 'pr-10'}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Account...
            </>
          ) : (
            'Create Account & Join'
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
