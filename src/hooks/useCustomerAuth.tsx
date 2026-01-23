import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface CustomerData {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  loyalty_points: number;
  total_spent: number;
  total_bookings: number;
  first_booking_at: string | null;
  last_booking_at: string | null;
  organization_id: string;
}

interface CustomerAuthContextType {
  user: User | null;
  session: Session | null;
  customer: CustomerData | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    organizationId: string
  ) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string, organizationId: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshCustomer: (organizationId: string) => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Clear customer data on logout
        if (!session) {
          setCustomer(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshCustomer = async (organizationId: string) => {
    if (!user) {
      setCustomer(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('get_customer_by_user_id', {
          _user_id: user.id,
          _organization_id: organizationId,
        });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setCustomer(data[0] as CustomerData);
      } else {
        setCustomer(null);
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
      setCustomer(null);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    organizationId: string
  ): Promise<{ error: Error | null }> => {
    try {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName,
            organization_id: organizationId,
            is_customer: true, // Flag to distinguish from staff/admin signups
          },
        },
      });

      if (authError) throw authError;
      return { error: null };
    } catch (error) {
      console.error('Customer signup error:', error);
      return { error: error as Error };
    }
  };

  const signIn = async (
    email: string,
    password: string,
    organizationId: string
  ): Promise<{ error: Error | null }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Verify the user is a customer of this cinema
      if (data.user) {
        const { data: customerData, error: customerError } = await supabase
          .rpc('get_customer_by_user_id', {
            _user_id: data.user.id,
            _organization_id: organizationId,
          });

        if (customerError) throw customerError;
        
        if (!customerData || customerData.length === 0) {
          // User exists but not a customer of this cinema
          await supabase.auth.signOut();
          throw new Error('No account found for this cinema. Please sign up first.');
        }

        setCustomer(customerData[0] as CustomerData);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setCustomer(null);
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        user,
        session,
        customer,
        loading,
        signUp,
        signIn,
        signOut,
        refreshCustomer,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (context === undefined) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
}
