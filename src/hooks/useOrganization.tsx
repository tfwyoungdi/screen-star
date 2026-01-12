import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';
import { useImpersonation } from './useImpersonation';

export function useOrganization() {
  const { data: profile } = useUserProfile();
  const { getEffectiveOrganizationId, isImpersonating, impersonatedOrganization } = useImpersonation();

  const effectiveOrgId = getEffectiveOrganizationId(profile?.organization_id);

  const { data: organization, isLoading } = useQuery({
    queryKey: ['organization', effectiveOrgId],
    queryFn: async () => {
      if (!effectiveOrgId) return null;

      // If impersonating, return the impersonated organization directly
      if (isImpersonating && impersonatedOrganization) {
        return impersonatedOrganization;
      }

      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', effectiveOrgId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!effectiveOrgId,
  });

  return {
    organization,
    isLoading,
    effectiveOrgId,
    isImpersonating,
  };
}
