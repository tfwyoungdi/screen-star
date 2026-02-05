import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type PlatformRole = 
  | 'platform_admin' 
  | 'platform_marketing' 
  | 'platform_accounts' 
  | 'platform_dev';

export function usePlatformRole() {
  const { user } = useAuth();

  const { data: platformRole, isLoading, error } = useQuery({
    queryKey: ['platform-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Use the secure server-side function to get platform role
      const { data, error } = await supabase.rpc('get_platform_role', {
        _user_id: user.id,
      });

      if (error) throw error;
      return data as PlatformRole | null;
    },
    enabled: !!user?.id,
    staleTime: 300000, // Cache for 5 minutes - platform role rarely changes
  });

  const isPlatformAdmin = platformRole === 'platform_admin';
  const isPlatformMarketing = platformRole === 'platform_marketing';
  const isPlatformAccounts = platformRole === 'platform_accounts';
  const isPlatformDev = platformRole === 'platform_dev';
  const hasPlatformAccess = !!platformRole;

  return {
    platformRole,
    isPlatformAdmin,
    isPlatformMarketing,
    isPlatformAccounts,
    isPlatformDev,
    hasPlatformAccess,
    isLoading,
    error,
  };
}
