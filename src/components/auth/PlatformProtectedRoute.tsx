import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import { Loader2 } from 'lucide-react';
import { getDefaultRouteForRole, type PlatformRoleType } from '@/lib/platformRoleConfig';

interface PlatformProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: PlatformRoleType[];
}

export function PlatformProtectedRoute({ children, allowedRoles }: PlatformProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { platformRole, hasPlatformAccess, isLoading: roleLoading } = usePlatformRole();
  const location = useLocation();

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

  if (!hasPlatformAccess) {
    return <Navigate to="/platform-admin/login" replace />;
  }

  // If specific roles are required, check if user has one of them
  if (allowedRoles && allowedRoles.length > 0 && platformRole) {
    if (!allowedRoles.includes(platformRole)) {
      // Redirect to their default dashboard
      const defaultRoute = getDefaultRouteForRole(platformRole);
      if (location.pathname !== defaultRoute) {
        return <Navigate to={defaultRoute} replace />;
      }
    }
  }

  return <>{children}</>;
}
