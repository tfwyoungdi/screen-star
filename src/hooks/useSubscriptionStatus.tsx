import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  subscription: {
    id: string;
    status: string;
    plan_id: string;
    current_period_end: string;
    trial_ends_at: string | null;
  } | null;
  plan: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export function useSubscriptionStatus(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: ['subscription-status', organizationId],
    queryFn: async (): Promise<SubscriptionStatus> => {
      if (!organizationId) {
        return { hasActiveSubscription: false, subscription: null, plan: null };
      }

      const { data: subscription, error } = await supabase
        .from('cinema_subscriptions')
        .select(`
          id,
          status,
          plan_id,
          current_period_end,
          trial_ends_at,
          subscription_plans (
            id,
            name,
            slug
          )
        `)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        return { hasActiveSubscription: false, subscription: null, plan: null };
      }

      if (!subscription) {
        return { hasActiveSubscription: false, subscription: null, plan: null };
      }

      // Check if subscription is active
      const now = new Date();
      const periodEnd = new Date(subscription.current_period_end);
      const isActive = 
        (subscription.status === 'active' || subscription.status === 'trialing') &&
        periodEnd > now;

      return {
        hasActiveSubscription: isActive,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          plan_id: subscription.plan_id,
          current_period_end: subscription.current_period_end,
          trial_ends_at: subscription.trial_ends_at,
        },
        plan: subscription.subscription_plans as { id: string; name: string; slug: string } | null,
      };
    },
    enabled: !!organizationId,
    staleTime: 300000, // Cache for 5 minutes - subscription status rarely changes mid-session
  });
}
