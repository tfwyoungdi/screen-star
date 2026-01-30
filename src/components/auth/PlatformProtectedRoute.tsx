import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface PlatformProtectedRouteProps {
  children: ReactNode;
}

export function PlatformProtectedRoute({ children }: PlatformProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();

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

  const isLoading = authLoading || roleLoading;

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

  return <>{children}</>;
}
