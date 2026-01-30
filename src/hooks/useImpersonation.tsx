import { createContext, useContext, ReactNode, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tables } from '@/integrations/supabase/types';

type Organization = Tables<'organizations'>;

interface ImpersonationContextType {
  isImpersonating: boolean;
  impersonatedOrganization: Organization | null;
  isLoading: boolean;
  startImpersonation: (organization: Organization) => Promise<void>;
  stopImpersonation: () => Promise<void>;
  getEffectiveOrganizationId: (realOrgId: string | null | undefined) => string | null;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch active impersonation session from database (server-side validation)
  const { data: activeSession, isLoading } = useQuery({
    queryKey: ['active-impersonation', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Call server-side function to validate impersonation
      const { data: orgId, error } = await supabase.rpc('get_active_impersonation', {
        _user_id: user.id,
      });

      if (error || !orgId) return null;

      // Fetch the organization details
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();

      if (orgError) return null;
      return org;
    },
    enabled: !!user?.id,
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: true,
  });

  const startMutation = useMutation({
    mutationFn: async (organization: Organization) => {
      // Use server-side function to start impersonation (validates admin status)
      const { data, error } = await supabase.rpc('start_impersonation', {
        _org_id: organization.id,
      });

      if (error) {
        throw new Error(error.message || 'Failed to start impersonation');
      }

      return { sessionId: data, organization };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-impersonation'] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      // Use server-side function to end impersonation
      const { error } = await supabase.rpc('stop_impersonation');

      if (error) {
        throw new Error(error.message || 'Failed to stop impersonation');
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-impersonation'] });
      // Clear any cached organization data
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
  });

  const startImpersonation = useCallback(async (organization: Organization) => {
    await startMutation.mutateAsync(organization);
  }, [startMutation]);

  const stopImpersonation = useCallback(async () => {
    await stopMutation.mutateAsync();
  }, [stopMutation]);

  const getEffectiveOrganizationId = useCallback((realOrgId: string | null | undefined): string | null => {
    if (activeSession) {
      return activeSession.id;
    }
    return realOrgId || null;
  }, [activeSession]);

  return (
    <ImpersonationContext.Provider
      value={{
        isImpersonating: !!activeSession,
        impersonatedOrganization: activeSession || null,
        isLoading,
        startImpersonation,
        stopImpersonation,
        getEffectiveOrganizationId,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
}
