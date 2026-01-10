-- Create is_platform_admin security definer function
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'platform_admin'
  )
$$;

-- RLS for subscription_plans (platform admins can manage, anyone can view active)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active subscription plans"
ON public.subscription_plans
FOR SELECT
USING (is_active = true);

CREATE POLICY "Platform admins can manage subscription plans"
ON public.subscription_plans
FOR ALL
USING (is_platform_admin(auth.uid()));

-- RLS for cinema_subscriptions (platform admins can manage, cinema admins can view their own)
ALTER TABLE public.cinema_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cinema admins can view their subscription"
ON public.cinema_subscriptions
FOR SELECT
USING (is_cinema_admin(auth.uid(), organization_id));

CREATE POLICY "Platform admins can manage all subscriptions"
ON public.cinema_subscriptions
FOR ALL
USING (is_platform_admin(auth.uid()));

-- RLS for platform_transactions (platform admins can view all, cinema admins can view their own)
ALTER TABLE public.platform_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cinema admins can view their transactions"
ON public.platform_transactions
FOR SELECT
USING (is_cinema_admin(auth.uid(), organization_id));

CREATE POLICY "Platform admins can manage all transactions"
ON public.platform_transactions
FOR ALL
USING (is_platform_admin(auth.uid()));

-- RLS for platform_settings (only platform admins)
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view platform settings"
ON public.platform_settings
FOR SELECT
USING (true);

CREATE POLICY "Platform admins can manage platform settings"
ON public.platform_settings
FOR ALL
USING (is_platform_admin(auth.uid()));

-- RLS for platform_audit_logs (only platform admins)
ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view audit logs"
ON public.platform_audit_logs
FOR SELECT
USING (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can insert audit logs"
ON public.platform_audit_logs
FOR INSERT
WITH CHECK (is_platform_admin(auth.uid()));

-- RLS for support_tickets (cinema users can manage their own, platform admins can manage all)
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cinema staff can view their organization tickets"
ON public.support_tickets
FOR SELECT
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Cinema admins can create tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Cinema admins can update their tickets"
ON public.support_tickets
FOR UPDATE
USING (organization_id = get_user_organization(auth.uid()))
WITH CHECK (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Platform admins can manage all tickets"
ON public.support_tickets
FOR ALL
USING (is_platform_admin(auth.uid()));

-- RLS for system_health_logs (only platform admins)
ALTER TABLE public.system_health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view system health logs"
ON public.system_health_logs
FOR SELECT
USING (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can manage system health logs"
ON public.system_health_logs
FOR ALL
USING (is_platform_admin(auth.uid()));

-- RLS for domain_records (cinema admins can manage their own, platform admins can manage all)
ALTER TABLE public.domain_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cinema admins can manage their domain records"
ON public.domain_records
FOR ALL
USING (is_cinema_admin(auth.uid(), organization_id));

CREATE POLICY "Platform admins can manage all domain records"
ON public.domain_records
FOR ALL
USING (is_platform_admin(auth.uid()));