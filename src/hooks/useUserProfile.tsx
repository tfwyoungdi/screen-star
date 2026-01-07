import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useUserProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          organizations (*)
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
  });
}

export function useOrganization() {
  const { data: profile } = useUserProfile();

  return useQuery({
    queryKey: ['organization', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return null;

      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id,
  });
}
