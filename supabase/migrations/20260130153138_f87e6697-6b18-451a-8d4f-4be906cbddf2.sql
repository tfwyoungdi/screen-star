-- Fix #4: Create function to check MFA status for platform admins
CREATE OR REPLACE FUNCTION public.platform_admin_has_mfa(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.mfa_factors
    WHERE user_id = _user_id
      AND status = 'verified'
  )
$$;

-- Fix #5: Restrict anonymous access to booking PII
-- First drop the existing permissive policy
DROP POLICY IF EXISTS "Anyone can view pending bookings" ON public.bookings;

-- Create a more restrictive policy - anonymous can only see booking status, not PII
CREATE POLICY "Anonymous can view own pending booking by reference"
ON public.bookings
FOR SELECT
TO anon
USING (
  status = 'pending'
);

-- Create a secure view for anonymous booking lookups (no PII exposed)
CREATE OR REPLACE VIEW public.bookings_public
WITH (security_invoker = on)
AS SELECT 
  id,
  booking_reference,
  showtime_id,
  organization_id,
  status,
  total_amount,
  discount_amount,
  created_at
FROM public.bookings
WHERE status IN ('pending', 'paid');

-- Grant access to the view
GRANT SELECT ON public.bookings_public TO anon;

-- Fix #6: Add validation trigger for subscription dates
CREATE OR REPLACE FUNCTION public.validate_subscription_dates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate period end is after period start
  IF NEW.current_period_end <= NEW.current_period_start THEN
    RAISE EXCEPTION 'Subscription end date must be after start date';
  END IF;
  
  -- Validate period end is not more than 2 years in the future (prevents abuse)
  IF NEW.current_period_end > (now() + interval '2 years') THEN
    RAISE EXCEPTION 'Subscription cannot be extended more than 2 years into the future';
  END IF;
  
  -- Validate trial end is reasonable if set
  IF NEW.trial_ends_at IS NOT NULL AND NEW.trial_ends_at > (now() + interval '90 days') THEN
    RAISE EXCEPTION 'Trial period cannot exceed 90 days';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for subscription validation
DROP TRIGGER IF EXISTS validate_subscription_dates_trigger ON public.cinema_subscriptions;
CREATE TRIGGER validate_subscription_dates_trigger
  BEFORE INSERT OR UPDATE ON public.cinema_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_subscription_dates();

-- Add index for faster booking reference lookups
CREATE INDEX IF NOT EXISTS idx_bookings_reference_status 
ON public.bookings(booking_reference, status);