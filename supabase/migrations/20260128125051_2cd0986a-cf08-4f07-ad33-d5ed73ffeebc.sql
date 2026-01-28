-- =============================================================================
-- SECURITY HARDENING MIGRATION
-- 1. Isolate payment secrets into a separate locked-down table
-- 2. Tighten RLS policies to require authentication  
-- 3. Add server-side rate limiting table for promo validation
-- =============================================================================

-- 1. CREATE LOCKED-DOWN SECRETS TABLE
CREATE TABLE IF NOT EXISTS public.organization_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  payment_gateway_secret_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS - VERY restrictive
ALTER TABLE public.organization_secrets ENABLE ROW LEVEL SECURITY;

-- Only service role can access secrets (edge functions only)
CREATE POLICY "Only service role can manage secrets"
  ON public.organization_secrets
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Migrate existing secrets to the new table
INSERT INTO public.organization_secrets (organization_id, payment_gateway_secret_key)
SELECT id, payment_gateway_secret_key
FROM public.organizations
WHERE payment_gateway_secret_key IS NOT NULL
ON CONFLICT (organization_id) DO UPDATE SET
  payment_gateway_secret_key = EXCLUDED.payment_gateway_secret_key,
  updated_at = now();

-- 2. CREATE RATE LIMITING TABLE FOR SERVER-SIDE ENFORCEMENT
CREATE TABLE IF NOT EXISTS public.rate_limit_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL, -- e.g., "promo:org_id:ip" or "contact:org_id:ip"
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limit_key ON public.rate_limit_entries(key);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON public.rate_limit_entries(window_start);

-- RLS: Only service role can manage rate limits
ALTER TABLE public.rate_limit_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only service role can manage rate limits"
  ON public.rate_limit_entries
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 3. RATE LIMIT CHECKING FUNCTION
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _key text,
  _max_requests integer,
  _window_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _window_start timestamptz;
  _current_count integer;
  _result jsonb;
BEGIN
  _window_start := now() - (_window_seconds || ' seconds')::interval;
  
  -- Get or create entry with atomic upsert
  INSERT INTO rate_limit_entries (key, window_start, request_count)
  VALUES (_key, now(), 1)
  ON CONFLICT (id) DO NOTHING;
  
  -- Count requests in window
  SELECT COALESCE(SUM(request_count), 0) INTO _current_count
  FROM rate_limit_entries
  WHERE key = _key AND window_start > _window_start;
  
  IF _current_count >= _max_requests THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'current_count', _current_count,
      'max_requests', _max_requests,
      'retry_after_seconds', _window_seconds
    );
  END IF;
  
  -- Increment or insert
  INSERT INTO rate_limit_entries (key, window_start, request_count)
  VALUES (_key, now(), 1)
  ON CONFLICT DO NOTHING;
  
  -- Also update existing if within window
  UPDATE rate_limit_entries
  SET request_count = request_count + 1
  WHERE key = _key 
    AND window_start > _window_start
    AND id = (SELECT id FROM rate_limit_entries WHERE key = _key AND window_start > _window_start ORDER BY window_start DESC LIMIT 1);
  
  RETURN jsonb_build_object(
    'allowed', true,
    'current_count', _current_count + 1,
    'max_requests', _max_requests
  );
END;
$$;

-- 4. CLEANUP OLD RATE LIMIT ENTRIES (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limit_entries
  WHERE window_start < now() - interval '1 hour';
END;
$$;

-- 5. ADD UPDATED_AT TRIGGER FOR SECRETS
CREATE TRIGGER update_organization_secrets_updated_at
  BEFORE UPDATE ON public.organization_secrets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. UPDATE organizations_safe VIEW TO EXCLUDE SECRET KEY
-- First drop the existing view if it exists
DROP VIEW IF EXISTS public.organizations_safe CASCADE;

-- Recreate without secret keys
CREATE VIEW public.organizations_safe 
WITH (security_invoker = on)
AS
SELECT 
  id,
  name,
  slug,
  logo_url,
  primary_color,
  secondary_color,
  contact_email,
  contact_phone,
  address,
  currency,
  payment_gateway,
  payment_gateway_public_key,
  payment_gateway_configured,
  about_text,
  mission_text,
  seo_title,
  seo_description,
  social_facebook,
  social_instagram,
  social_twitter,
  is_active,
  created_at,
  updated_at
FROM public.organizations;

-- Note: payment_gateway_secret_key, daily_access_code, suspended_* fields are EXCLUDED