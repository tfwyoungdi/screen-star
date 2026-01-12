import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Tables } from '@/integrations/supabase/types';

type Organization = Tables<'organizations'>;

interface ImpersonationContextType {
  isImpersonating: boolean;
  impersonatedOrganization: Organization | null;
  startImpersonation: (organization: Organization) => void;
  stopImpersonation: () => void;
  getEffectiveOrganizationId: (realOrgId: string | null | undefined) => string | null;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonatedOrganization, setImpersonatedOrganization] = useState<Organization | null>(() => {
    // Restore from session storage on mount
    const stored = sessionStorage.getItem('impersonated_organization');
    return stored ? JSON.parse(stored) : null;
  });

  const startImpersonation = useCallback((organization: Organization) => {
    setImpersonatedOrganization(organization);
    sessionStorage.setItem('impersonated_organization', JSON.stringify(organization));
  }, []);

  const stopImpersonation = useCallback(() => {
    setImpersonatedOrganization(null);
    sessionStorage.removeItem('impersonated_organization');
  }, []);

  const getEffectiveOrganizationId = useCallback((realOrgId: string | null | undefined): string | null => {
    if (impersonatedOrganization) {
      return impersonatedOrganization.id;
    }
    return realOrgId || null;
  }, [impersonatedOrganization]);

  return (
    <ImpersonationContext.Provider
      value={{
        isImpersonating: !!impersonatedOrganization,
        impersonatedOrganization,
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
