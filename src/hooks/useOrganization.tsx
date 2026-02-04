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

      // Select all commonly needed columns - this is the main org hook used across the app
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, currency, primary_color, secondary_color, contact_email, contact_phone, address, custom_domain, payment_gateway, payment_gateway_configured, payment_gateway_public_key, website_template, about_text, mission_text, values_json, social_facebook, social_instagram, social_twitter, seo_title, seo_description, daily_access_code, daily_access_code_set_at, daily_access_code_start_time, daily_access_code_end_time, is_active, subscription_plan, suspended_at, suspended_reason, created_at, updated_at')
        .eq('id', effectiveOrgId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!effectiveOrgId,
    staleTime: 120000, // Cache for 2 minutes - org settings rarely change
  });

  return {
    organization,
    isLoading,
    effectiveOrgId,
    isImpersonating,
  };
}
