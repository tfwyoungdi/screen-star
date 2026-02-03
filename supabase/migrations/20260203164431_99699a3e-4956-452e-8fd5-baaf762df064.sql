-- Priority 2 Fix: Restrict contact_submissions access to managers+ only
-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Staff can view contact submissions" ON public.contact_submissions;

-- Create more restrictive policy - only managers, admins, supervisors can view
CREATE POLICY "Managers can view contact submissions" ON public.contact_submissions
FOR SELECT TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('manager', 'cinema_admin', 'supervisor')
  )
  OR public.is_platform_admin(auth.uid())
  OR (
    public.get_active_impersonation(auth.uid()) IS NOT NULL
    AND organization_id = public.get_active_impersonation(auth.uid())
  )
);

-- Priority 2 Fix: Add rate limiting for promo code validation
CREATE TABLE IF NOT EXISTS public.promo_validation_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- IP or session ID
  organization_id uuid NOT NULL,
  attempt_count integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.promo_validation_rate_limits ENABLE ROW LEVEL SECURITY;

-- No direct access - only via function
CREATE POLICY "No direct access to promo rate limits" ON public.promo_validation_rate_limits
FOR ALL TO authenticated USING (false);

-- Function to check and increment promo validation rate limit
CREATE OR REPLACE FUNCTION public.check_promo_validation_rate_limit(_identifier text, _org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _window_start timestamptz;
  _current_count integer;
  _max_requests integer := 10; -- 10 promo attempts per 5 minutes
  _window_seconds integer := 300;
BEGIN
  _window_start := now() - (_window_seconds || ' seconds')::interval;
  
  -- Count recent attempts
  SELECT COALESCE(SUM(attempt_count), 0) INTO _current_count
  FROM public.promo_validation_rate_limits
  WHERE identifier = _identifier 
    AND organization_id = _org_id 
    AND window_start > _window_start;
  
  IF _current_count >= _max_requests THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'Too many promo code attempts. Please wait 5 minutes.',
      'retry_after_seconds', _window_seconds
    );
  END IF;
  
  -- Insert rate limit entry
  INSERT INTO public.promo_validation_rate_limits (identifier, organization_id, attempt_count)
  VALUES (_identifier, _org_id, 1);
  
  RETURN jsonb_build_object('allowed', true, 'remaining', _max_requests - _current_count - 1);
END;
$$;

-- Cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_promo_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.promo_validation_rate_limits
  WHERE window_start < now() - interval '1 hour';
END;
$$;

-- Priority 2 Fix: Add retention policy for email analytics (90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_email_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.email_analytics
  WHERE created_at < now() - interval '90 days';
END;
$$;