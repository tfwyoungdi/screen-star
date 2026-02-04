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

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['platform_admin', 'platform_marketing', 'platform_accounts', 'platform_dev'])
        .maybeSingle();

      if (error) throw error;
      return data?.role as PlatformRole | null;
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
