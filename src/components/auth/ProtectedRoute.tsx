import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type AppRole = Database['public']['Enums']['app_role'];

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading: authLoading, signOut } = useAuth();
  const location = useLocation();

  // Fetch user profile to get organization_id
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile-protected', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('organization_id, full_name, is_active')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: userRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ['user-roles', user?.id, profile?.organization_id],
    queryFn: async () => {
      if (!user?.id || !profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', profile.organization_id);
      
      if (error) throw error;
      return data.map(r => r.role);
    },
    enabled: !!user?.id && !!profile?.organization_id,
  });

  // Fetch organization to verify it's active
  const { data: organization, isLoading: orgLoading } = useQuery({
    queryKey: ['org-active-check', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, is_active')
        .eq('id', profile.organization_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  const isLoading = authLoading || (!!user && (profileLoading || rolesLoading || orgLoading));

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if profile exists and is active
  if (!profile || profile.is_active === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Account Deactivated</h1>
            <p className="text-muted-foreground mb-6">
              Your account has been deactivated. Please contact your administrator.
            </p>
            <Button onClick={() => signOut()}>Sign Out</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if organization is active
  if (!organization || organization.is_active === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Organization Inactive</h1>
            <p className="text-muted-foreground mb-6">
              This cinema account is currently inactive. Please contact support.
            </p>
            <Button onClick={() => signOut()}>Sign Out</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user has any roles
  if (!userRoles || userRoles.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <ShieldAlert className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">No Access Role</h1>
            <p className="text-muted-foreground mb-6">
              You don't have an assigned role for this organization. Please contact your administrator.
            </p>
            <Button onClick={() => signOut()}>Sign Out</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If allowedRoles specified, check if user has any of them
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowedRole = userRoles.some(role => allowedRoles.includes(role));
    if (!hasAllowedRole) {
      // Redirect to appropriate dashboard based on their actual role
      const userRole = userRoles[0];
      let redirectPath = '/dashboard';
      
      if (userRole === 'box_office') redirectPath = '/box-office';
      else if (userRole === 'gate_staff') redirectPath = '/gate';
      else if (userRole === 'accountant') redirectPath = '/sales';
      else if (userRole === 'supervisor') redirectPath = '/supervisor';
      
      return <Navigate to={redirectPath} replace />;
    }
  }

  return <>{children}</>;
}
