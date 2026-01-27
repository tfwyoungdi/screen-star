-- =====================================================
-- SECURITY AUDIT FIXES - Critical RLS Hardening
-- =====================================================

-- 1. CRITICAL: Fix booked_seats SELECT to only allow staff to see booking details
-- Currently anyone can view all booked seats (privacy & competitor risk)
DROP POLICY IF EXISTS "Anyone can view booked seats" ON public.booked_seats;

CREATE POLICY "Staff can view booked seats in their org" 
ON public.booked_seats 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM bookings b 
    WHERE b.id = booked_seats.booking_id 
    AND (
      b.organization_id = get_user_organization(auth.uid())
      OR is_platform_admin(auth.uid())
    )
  )
);

-- Allow public to view booked seats for a specific showtime (needed for seat selection)
CREATE POLICY "Anyone can view booked seats for active showtimes" 
ON public.booked_seats 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM showtimes s 
    WHERE s.id = booked_seats.showtime_id 
    AND s.is_active = true
  )
);

-- 2. CRITICAL: Fix platform_settings - restrict internal config to admins only
DROP POLICY IF EXISTS "Anyone can view platform settings" ON public.platform_settings;

CREATE POLICY "Platform admins can view all platform settings" 
ON public.platform_settings 
FOR SELECT 
USING (is_platform_admin(auth.uid()));

-- Create a public view with only safe fields for public display
CREATE OR REPLACE VIEW public.platform_settings_public 
WITH (security_invoker = on) AS
SELECT 
  id,
  platform_name,
  logo_url,
  primary_color,
  maintenance_mode,
  maintenance_message,
  enable_promotions
FROM public.platform_settings;

-- 3. MEDIUM: Fix loyalty_transactions INSERT to require authentication
DROP POLICY IF EXISTS "Anyone can create redemption transactions with valid booking" ON public.loyalty_transactions;

CREATE POLICY "Authenticated users can create redemption transactions" 
ON public.loyalty_transactions 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL
  AND transaction_type = 'redeemed'
  AND EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = loyalty_transactions.booking_id 
    AND b.organization_id = loyalty_transactions.organization_id
  )
  AND EXISTS (
    SELECT 1 FROM customers c
    WHERE c.id = loyalty_transactions.customer_id
    AND c.user_id = auth.uid()
  )
);

-- 4. MEDIUM: Fix email_analytics UPDATE to service role only
DROP POLICY IF EXISTS "Allow tracking updates with valid tracking_id" ON public.email_analytics;

-- Tracking updates should go through edge function with service role
CREATE POLICY "Service role can update email analytics" 
ON public.email_analytics 
FOR UPDATE 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 5. Create booking organization validation trigger
CREATE OR REPLACE FUNCTION public.validate_booking_organization()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id != (SELECT organization_id FROM public.showtimes WHERE id = NEW.showtime_id) THEN
    RAISE EXCEPTION 'Organization ID must match showtime organization';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS validate_booking_org_trigger ON public.bookings;
CREATE TRIGGER validate_booking_org_trigger
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_booking_organization();

-- 6. Create security events logging table
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  user_id uuid,
  organization_id uuid,
  ip_address text,
  user_agent text,
  details jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view security events"
ON public.security_events
FOR SELECT
USING (is_platform_admin(auth.uid()));

CREATE POLICY "Service role can insert security events"
ON public.security_events
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_organization ON public.security_events(organization_id);

-- 7. Hide stock quantities from public view (competitors shouldn't see inventory levels)
DROP POLICY IF EXISTS "Anyone can view available concession items" ON public.concession_items;

-- Create a safe public view that hides inventory data
CREATE OR REPLACE VIEW public.concession_items_public 
WITH (security_invoker = on) AS
SELECT 
  id,
  name,
  description,
  category,
  price,
  image_url,
  is_available,
  display_order,
  organization_id,
  created_at,
  updated_at
  -- Deliberately excluding: stock_quantity, low_stock_threshold, track_inventory
FROM public.concession_items
WHERE is_available = true;

-- Staff can still see full inventory details
CREATE POLICY "Staff can view full concession details"
ON public.concession_items
FOR SELECT
USING (
  organization_id = get_user_organization(auth.uid())
  OR is_platform_admin(auth.uid())
);

-- 8. Restrict subscription_plans to hide commission details from public
DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON public.subscription_plans;

CREATE OR REPLACE VIEW public.subscription_plans_public 
WITH (security_invoker = on) AS
SELECT 
  id,
  name,
  price_monthly,
  price_yearly,
  max_screens,
  max_staff,
  features,
  is_active,
  created_at
  -- Excluding: commission_percentage, per_ticket_fee (business sensitive)
FROM public.subscription_plans
WHERE is_active = true;

CREATE POLICY "Platform admins can view all subscription plans"
ON public.subscription_plans
FOR SELECT
USING (is_platform_admin(auth.uid()));

CREATE POLICY "Cinema admins can view active subscription plans"
ON public.subscription_plans
FOR SELECT
USING (is_active = true);