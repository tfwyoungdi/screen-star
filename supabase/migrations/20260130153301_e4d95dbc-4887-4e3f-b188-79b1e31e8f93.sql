-- Fix #7: Remove credential exposure from organizations table
-- First ensure secrets are copied to organization_secrets if not already there
INSERT INTO public.organization_secrets (organization_id, payment_gateway_secret_key)
SELECT id, payment_gateway_secret_key 
FROM public.organizations 
WHERE payment_gateway_secret_key IS NOT NULL
ON CONFLICT (organization_id) 
DO UPDATE SET payment_gateway_secret_key = EXCLUDED.payment_gateway_secret_key
WHERE public.organization_secrets.payment_gateway_secret_key IS NULL;

-- Now remove the secret key column from organizations (data already migrated to organization_secrets)
ALTER TABLE public.organizations DROP COLUMN IF EXISTS payment_gateway_secret_key;

-- Ensure organization_secrets has strict RLS - only service role can access
DROP POLICY IF EXISTS "Service role only" ON public.organization_secrets;
CREATE POLICY "No direct access to secrets"
ON public.organization_secrets
FOR ALL
USING (false);

-- Fix #8: Add rate limiting table for platform admin operations
CREATE TABLE IF NOT EXISTS public.platform_admin_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action_type text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_admin_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only platform admins can see their own rate limits
CREATE POLICY "Admins can view own rate limits"
ON public.platform_admin_rate_limits
FOR SELECT
USING (admin_user_id = auth.uid() AND public.is_platform_admin(auth.uid()));

-- Create rate limiting function for platform admin actions
CREATE OR REPLACE FUNCTION public.check_platform_admin_rate_limit(
  _action_type text,
  _max_requests integer DEFAULT 10,
  _window_seconds integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
  _window_start timestamptz;
  _current_count integer;
BEGIN
  _user_id := auth.uid();
  
  -- Verify caller is platform admin
  IF NOT public.is_platform_admin(_user_id) THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'Not authorized');
  END IF;
  
  _window_start := now() - (_window_seconds || ' seconds')::interval;
  
  -- Count requests in window
  SELECT COALESCE(SUM(request_count), 0) INTO _current_count
  FROM public.platform_admin_rate_limits
  WHERE admin_user_id = _user_id 
    AND action_type = _action_type 
    AND window_start > _window_start;
  
  IF _current_count >= _max_requests THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'Rate limit exceeded',
      'retry_after_seconds', _window_seconds
    );
  END IF;
  
  -- Insert new rate limit entry
  INSERT INTO public.platform_admin_rate_limits (admin_user_id, action_type)
  VALUES (_user_id, _action_type);
  
  RETURN jsonb_build_object('allowed', true, 'remaining', _max_requests - _current_count - 1);
END;
$$;

-- Fix #9: Add input validation constraints
-- Validate organization slug format
ALTER TABLE public.organizations 
ADD CONSTRAINT valid_slug_format 
CHECK (slug ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' AND length(slug) BETWEEN 3 AND 50);

-- Validate email formats
ALTER TABLE public.customers
ADD CONSTRAINT valid_customer_email 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Validate phone format (allow common formats)
ALTER TABLE public.customers
ADD CONSTRAINT valid_customer_phone 
CHECK (phone IS NULL OR phone ~ '^[+]?[0-9\s\-\(\)]{7,20}$');

-- Add length constraints to prevent abuse
ALTER TABLE public.contact_submissions
ADD CONSTRAINT valid_contact_message_length
CHECK (length(message) <= 5000);

ALTER TABLE public.contact_submissions
ADD CONSTRAINT valid_contact_subject_length
CHECK (length(subject) <= 200);

-- Cleanup function for old rate limit entries
CREATE OR REPLACE FUNCTION public.cleanup_platform_admin_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.platform_admin_rate_limits
  WHERE window_start < now() - interval '1 hour';
END;
$$;