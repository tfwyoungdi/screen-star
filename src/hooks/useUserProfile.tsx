import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useUserProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Only select needed columns instead of *
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          organization_id,
          full_name,
          email,
          avatar_url
        `)
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (rolesError) throw rolesError;

      return {
        ...profile,
        roles: roles.map(r => r.role),
      };
    },
    enabled: !!user?.id,
    staleTime: 60000, // Cache for 1 minute - profile rarely changes
  });
}

export function useOrganization() {
  const { data: profile } = useUserProfile();

  return useQuery({
    queryKey: ['organization', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return null;

      // Select commonly needed columns - add more as needed
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, currency, primary_color, secondary_color, contact_email, contact_phone, address, custom_domain, payment_gateway, payment_gateway_configured, payment_gateway_public_key, website_template, about_text, is_active')
        .eq('id', profile.organization_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id,
    staleTime: 120000, // Cache for 2 minutes - org settings rarely change
  });
}
