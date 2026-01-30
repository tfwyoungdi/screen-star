import { ReactNode, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ShieldAlert, Smartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PlatformProtectedRouteProps {
  children: ReactNode;
}

export function PlatformProtectedRoute({ children }: PlatformProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const [mfaBypass, setMfaBypass] = useState(false);

  const { data: isPlatformAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ['is-platform-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase.rpc('is_platform_admin', {
        _user_id: user.id,
      });
      if (error) {
        console.error('Platform admin check error:', error);
        return false;
      }
      return data as boolean;
    },
    enabled: !!user?.id,
  });

  // Check if MFA is enabled for this admin
  const { data: hasMfa, isLoading: mfaLoading } = useQuery({
    queryKey: ['platform-admin-mfa', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase.rpc('platform_admin_has_mfa', {
        _user_id: user.id,
      });
      if (error) {
        console.error('MFA check error:', error);
        return false;
      }
      return data as boolean;
    },
    enabled: !!user?.id && isPlatformAdmin === true,
  });

  const isLoading = authLoading || roleLoading || (isPlatformAdmin && mfaLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/platform-admin/login" replace />;
  }

  if (!isPlatformAdmin) {
    return <Navigate to="/platform-admin/login" replace />;
  }

  // MFA Enforcement - Block access if MFA is not enabled (with temporary bypass for setup)
  if (!hasMfa && !mfaBypass) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-2xl">MFA Required</CardTitle>
              <CardDescription>
                Multi-factor authentication must be enabled to access the Platform Admin dashboard.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Smartphone className="h-4 w-4" />
              <AlertDescription>
                For security, all platform administrators must have MFA enabled. Please configure MFA in your Supabase dashboard.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <Button 
                className="w-full" 
                onClick={() => window.open('https://supabase.com/dashboard/project/immqqxnblovkdvokfbef/auth/users', '_blank')}
              >
                Configure MFA in Supabase
              </Button>
              
              {/* Temporary bypass for initial setup - remove in production */}
              {process.env.NODE_ENV === 'development' && (
                <Button 
                  variant="outline" 
                  className="w-full text-muted-foreground"
                  onClick={() => setMfaBypass(true)}
                >
                  Bypass (Development Only)
                </Button>
              )}
            </div>
            
            <p className="text-xs text-center text-muted-foreground">
              After enabling MFA, sign out and sign back in to verify.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
