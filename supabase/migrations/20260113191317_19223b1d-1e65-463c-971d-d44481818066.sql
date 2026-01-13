-- Loyalty program configuration per organization
CREATE TABLE public.loyalty_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  points_per_dollar NUMERIC(10,2) DEFAULT 1,
  points_per_booking INTEGER DEFAULT 0,
  welcome_bonus_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

-- Rewards catalog
CREATE TABLE public.loyalty_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('discount_percentage', 'discount_fixed', 'free_ticket', 'free_concession')),
  points_required INTEGER NOT NULL,
  discount_value NUMERIC(10,2), -- For discount types
  concession_item_id UUID REFERENCES public.concession_items(id) ON DELETE SET NULL, -- For free concession
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Track point transactions
CREATE TABLE public.loyalty_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'redeemed', 'expired', 'adjustment', 'welcome_bonus')),
  description TEXT,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  reward_id UUID REFERENCES public.loyalty_rewards(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loyalty_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for loyalty_settings
CREATE POLICY "Cinema staff can view their loyalty settings"
  ON public.loyalty_settings FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()) OR is_platform_admin());

CREATE POLICY "Cinema admins can manage loyalty settings"
  ON public.loyalty_settings FOR ALL
  USING (is_cinema_admin(auth.uid(), organization_id) OR is_platform_admin());

-- RLS Policies for loyalty_rewards
CREATE POLICY "Anyone can view active rewards for public booking"
  ON public.loyalty_rewards FOR SELECT
  USING (is_active = true);

CREATE POLICY "Cinema admins can manage rewards"
  ON public.loyalty_rewards FOR ALL
  USING (is_cinema_admin(auth.uid(), organization_id) OR is_platform_admin());

-- RLS Policies for loyalty_transactions
CREATE POLICY "Cinema staff can view transactions"
  ON public.loyalty_transactions FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()) OR is_platform_admin());

CREATE POLICY "Cinema staff can create transactions"
  ON public.loyalty_transactions FOR INSERT
  WITH CHECK (organization_id = get_user_organization(auth.uid()) OR is_platform_admin());

-- Update triggers
CREATE TRIGGER update_loyalty_settings_updated_at
  BEFORE UPDATE ON public.loyalty_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loyalty_rewards_updated_at
  BEFORE UPDATE ON public.loyalty_rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();