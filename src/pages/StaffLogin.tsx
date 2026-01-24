import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Lock, Mail, Eye, EyeOff, Loader2, ShieldCheck, 
  AlertTriangle, Building2 
} from 'lucide-react';
import { toast } from 'sonner';

export default function StaffLogin() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Fetch organization by slug to verify it exists
  const { data: organization, isLoading: orgLoading, error: orgError } = useQuery({
    queryKey: ['staff-login-org', slug],
    queryFn: async () => {
      if (!slug) throw new Error('No cinema specified');
      
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, logo_url, primary_color')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (error) throw new Error('Cinema not found');
      return data;
    },
    enabled: !!slug,
    retry: false,
  });

  // Check if user is already logged in and belongs to this organization
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Check if user belongs to this organization
          const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', session.user.id)
            .single();

          if (profile?.organization_id === organization?.id) {
            // Get user's role and redirect accordingly
            const { data: roles } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .eq('organization_id', organization.id);

            if (roles && roles.length > 0) {
              redirectToRoleDashboard(roles[0].role);
              return;
            }
          }
        }
      } catch (err) {
        console.error('Auth check error:', err);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    if (organization) {
      checkExistingAuth();
    } else if (!orgLoading) {
      setIsCheckingAuth(false);
    }
  }, [organization, orgLoading]);

  const redirectToRoleDashboard = (role: string) => {
    switch (role) {
      case 'cinema_admin':
        navigate('/dashboard');
        break;
      case 'box_office':
        navigate('/box-office');
        break;
      case 'gate_staff':
        navigate('/gate');
        break;
      case 'manager':
        navigate('/dashboard');
        break;
      case 'accountant':
        navigate('/sales');
        break;
      case 'supervisor':
        navigate('/supervisor');
        break;
      default:
        navigate('/dashboard');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter your email and password');
      return;
    }

    if (!organization) {
      setError('Invalid cinema portal');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Sign in the user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Login failed');
      }

      // Verify user belongs to this organization and is active
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id, full_name, is_active')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error('Account not found. Please contact your administrator.');
      }

      if (profile.organization_id !== organization.id) {
        await supabase.auth.signOut();
        throw new Error('You are not authorized to access this cinema portal. Please use the correct staff login link.');
      }

      // Check if account is active
      if (profile.is_active === false) {
        await supabase.auth.signOut();
        throw new Error('Your account has been deactivated. Please contact your administrator.');
      }

      // Get user's role for this organization
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .eq('organization_id', organization.id);

      if (rolesError || !roles || roles.length === 0) {
        await supabase.auth.signOut();
        throw new Error('No role assigned. Please contact your administrator.');
      }

      toast.success(`Welcome back, ${profile.full_name}!`);
      redirectToRoleDashboard(roles[0].role);
      
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking organization
  if (orgLoading || isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying portal...</p>
        </div>
      </div>
    );
  }

  // Show error if organization not found
  if (orgError || !organization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Portal Not Found</h1>
            <p className="text-muted-foreground mb-6">
              This staff portal does not exist or has been deactivated.
              Please contact your administrator for the correct access link.
            </p>
            <Button variant="outline" onClick={() => navigate('/')}>
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/50 to-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Secure Staff Portal</span>
        </div>

        <Card className="border-2">
          <CardHeader className="text-center space-y-4">
            {organization.logo_url ? (
              <img 
                src={organization.logo_url} 
                alt={organization.name}
                className="h-16 w-auto mx-auto object-contain"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            )}
            <div>
              <CardTitle className="text-2xl">{organization.name}</CardTitle>
              <CardDescription className="flex items-center justify-center gap-2 mt-2">
                <Lock className="h-4 w-4" />
                Staff Access Only
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12"
                    autoComplete="email"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12"
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Forgot your password?{' '}
                <Button 
                  variant="link" 
                  className="p-0 h-auto"
                  onClick={() => navigate('/forgot-password')}
                >
                  Reset it here
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p className="flex items-center justify-center gap-1">
            <Lock className="h-3 w-3" />
            This is a secure, private staff portal
          </p>
          <p>Unauthorized access attempts are logged and monitored</p>
        </div>
      </div>
    </div>
  );
}
