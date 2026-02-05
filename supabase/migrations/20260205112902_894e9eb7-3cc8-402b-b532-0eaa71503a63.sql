-- =====================================================
-- LOW FIX 2: Restrict Pricing Info in Public Views
-- Remove sensitive pricing details from subscription_plans_public
-- =====================================================

DROP VIEW IF EXISTS public.subscription_plans_public;
CREATE VIEW public.subscription_plans_public
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  description,
  is_active,
  -- Only expose general tier info, not exact limits
  CASE 
    WHEN max_staff IS NULL THEN 'Unlimited'
    WHEN max_staff > 10 THEN 'Large team'
    ELSE 'Small team'
  END as team_size_tier,
  CASE 
    WHEN max_screens IS NULL THEN 'Unlimited'
    WHEN max_screens > 5 THEN 'Multiple locations'
    ELSE 'Single location'
  END as scale_tier,
  allow_custom_domain,
  allow_own_gateway,
  -- Remove: price_monthly, price_yearly, commission_percentage, per_ticket_fee, features
  sort_order
FROM public.subscription_plans
WHERE is_active = true;

-- Grant public access to the view
GRANT SELECT ON public.subscription_plans_public TO anon, authenticated;

-- =====================================================
-- LOW FIX 3: Restrict Platform Settings Public View
-- Remove maintenance window details
-- =====================================================

DROP VIEW IF EXISTS public.platform_settings_public;
CREATE VIEW public.platform_settings_public
WITH (security_invoker = true)
AS
SELECT 
  platform_name,
  logo_url,
  primary_color,
  -- Only expose if maintenance is active, not scheduled windows
  maintenance_mode,
  -- Don't expose: maintenance_message details, sla_response_times, escalation emails
  CASE WHEN maintenance_mode THEN 
    'The platform is currently undergoing maintenance. Please try again later.'
  ELSE NULL END as maintenance_message
FROM public.platform_settings
LIMIT 1;

-- Grant public access to the view
GRANT SELECT ON public.platform_settings_public TO anon, authenticated;

-- =====================================================
-- LOW FIX 1: Reduce Impersonation Session Timeout
-- Create cleanup function for expired sessions
-- =====================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_impersonation_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-end sessions that have exceeded their expiry
  UPDATE public.platform_impersonation_sessions
  SET ended_at = expires_at
  WHERE ended_at IS NULL AND expires_at < now();
END;
$$;

-- =====================================================
-- LOW FIX 4: Generic Error Message Helper
-- Function to return generic errors to prevent info disclosure
-- =====================================================

CREATE OR REPLACE FUNCTION public.safe_error_message(_internal_error text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  -- Log detailed error internally but return generic message
  RAISE LOG 'Internal error: %', _internal_error;
  
  -- Return generic message
  RETURN 'An error occurred. Please try again or contact support.';
END;
$$;

-- =====================================================
-- MEDIUM FIX 3: Add content sanitization helper
-- For use when rendering user-provided HTML content
-- =====================================================

CREATE OR REPLACE FUNCTION public.sanitize_html_content(_html text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  result text;
BEGIN
  result := _html;
  
  -- Remove script tags and content
  result := regexp_replace(result, '<script[^>]*>.*?</script>', '', 'gi');
  
  -- Remove event handlers (onclick, onerror, onload, etc.)
  result := regexp_replace(result, '\s+on\w+\s*=\s*[''"][^''"]*[''"]', '', 'gi');
  result := regexp_replace(result, '\s+on\w+\s*=\s*\w+', '', 'gi');
  
  -- Remove javascript: URLs
  result := regexp_replace(result, 'javascript\s*:', '', 'gi');
  
  -- Remove data: URLs (can be used for XSS)
  result := regexp_replace(result, 'data\s*:', 'data-disabled:', 'gi');
  
  -- Remove style expressions (IE-specific XSS)
  result := regexp_replace(result, 'expression\s*\(', '', 'gi');
  
  -- Remove iframe, object, embed tags
  result := regexp_replace(result, '<(iframe|object|embed|form)[^>]*>.*?</(iframe|object|embed|form)>', '', 'gi');
  result := regexp_replace(result, '<(iframe|object|embed|form)[^>]*/>', '', 'gi');
  
  RETURN result;
END;
$$;