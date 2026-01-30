import { useImpersonation } from '@/hooks/useImpersonation';
import { Button } from '@/components/ui/button';
import { X, Eye } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePlatformAuditLog } from '@/hooks/usePlatformAuditLog';

export function ImpersonationBanner() {
  const { isImpersonating, impersonatedOrganization, stopImpersonation } = useImpersonation();
  const { logAction } = usePlatformAuditLog();
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show banner on platform admin routes
  const isPlatformAdminRoute = location.pathname.startsWith('/platform-admin');

  if (!isImpersonating || !impersonatedOrganization || isPlatformAdminRoute) {
    return null;
  }

  const handleStopImpersonation = async () => {
    // Log the end of impersonation
    logAction({
      action: 'cinema_impersonation_ended',
      target_type: 'organization',
      target_id: impersonatedOrganization.id,
      details: {
        cinema_name: impersonatedOrganization.name,
        cinema_slug: impersonatedOrganization.slug,
      },
    });
    
    await stopImpersonation();
    navigate('/platform-admin/cinemas');
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Eye className="h-5 w-5" />
          <span className="font-medium">
            Support Mode: Viewing as{' '}
            <span className="font-bold">{impersonatedOrganization.name}</span>
          </span>
          <span className="text-amber-800 text-sm">
            ({impersonatedOrganization.slug})
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStopImpersonation}
          className="text-amber-950 hover:bg-amber-400 hover:text-amber-950"
        >
          <X className="h-4 w-4 mr-2" />
          Exit Support Mode
        </Button>
      </div>
    </div>
  );
}

// Hook to add padding when impersonation banner is visible
export function useImpersonationOffset() {
  const { isImpersonating } = useImpersonation();
  const location = useLocation();
  const isPlatformAdminRoute = location.pathname.startsWith('/platform-admin');
  
  return isImpersonating && !isPlatformAdminRoute ? 'pt-10' : '';
}
