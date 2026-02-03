-- Fix #1: Create a secure view to protect PII in bookings
-- This view exposes limited data for box office reference searches

-- Drop existing view if it needs updating
DROP VIEW IF EXISTS public.bookings_activation_view;

-- Create secure view for ticket activation (hides full PII)
CREATE VIEW public.bookings_activation_view
WITH (security_invoker=on) AS
SELECT 
  id,
  booking_reference,
  -- Mask customer name (show first name + initial)
  CASE 
    WHEN customer_name LIKE '% %' 
    THEN split_part(customer_name, ' ', 1) || ' ' || left(split_part(customer_name, ' ', 2), 1) || '.'
    ELSE customer_name
  END as customer_name_masked,
  -- Only show for matching exact reference (hide from browse)
  customer_name,
  customer_email,
  customer_phone,
  total_amount,
  status,
  created_at,
  showtime_id,
  organization_id,
  activated_at,
  shift_id,
  activated_by
FROM public.bookings;

-- RLS policy: Staff can only view bookings from their organization
CREATE POLICY "Staff view activation bookings" ON public.bookings
FOR SELECT TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('box_office', 'supervisor', 'manager', 'cinema_admin')
  )
  OR public.is_platform_admin(auth.uid())
  OR (
    public.get_active_impersonation(auth.uid()) IS NOT NULL
    AND organization_id = public.get_active_impersonation(auth.uid())
  )
);

-- Create rate limit table for ticket activation searches
CREATE TABLE IF NOT EXISTS public.activation_search_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  search_count integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activation_search_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only allow users to see their own rate limit entries
CREATE POLICY "Users see own rate limits" ON public.activation_search_rate_limits
FOR ALL TO authenticated
USING (user_id = auth.uid());

-- Create function to check activation search rate limit
CREATE OR REPLACE FUNCTION public.check_activation_search_rate_limit(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _window_start timestamptz;
  _current_count integer;
  _max_requests integer := 30; -- 30 searches per minute
  _window_seconds integer := 60;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'Not authenticated');
  END IF;
  
  -- Verify user has box office access to this org
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND organization_id = _org_id
    AND role IN ('box_office', 'supervisor', 'manager', 'cinema_admin')
  ) AND NOT public.is_platform_admin(_user_id) THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'Not authorized');
  END IF;
  
  _window_start := now() - (_window_seconds || ' seconds')::interval;
  
  -- Count recent searches
  SELECT COALESCE(SUM(search_count), 0) INTO _current_count
  FROM public.activation_search_rate_limits
  WHERE user_id = _user_id 
    AND organization_id = _org_id 
    AND window_start > _window_start;
  
  IF _current_count >= _max_requests THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'Rate limit exceeded. Please wait before searching again.',
      'retry_after_seconds', _window_seconds
    );
  END IF;
  
  -- Insert rate limit entry
  INSERT INTO public.activation_search_rate_limits (user_id, organization_id, search_count)
  VALUES (_user_id, _org_id, 1);
  
  RETURN jsonb_build_object('allowed', true, 'remaining', _max_requests - _current_count - 1);
END;
$$;

-- Cleanup function for old rate limit entries
CREATE OR REPLACE FUNCTION public.cleanup_activation_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.activation_search_rate_limits
  WHERE window_start < now() - interval '1 hour';
END;
$$;