-- =====================================================
-- FIX SECURITY LINTER WARNINGS
-- =====================================================

-- 1. Fix Security Definer View - convert to security_invoker
DROP VIEW IF EXISTS public.organizations_safe;

CREATE VIEW public.organizations_safe 
WITH (security_invoker = on) AS
SELECT 
  id, name, slug, logo_url, currency, primary_color, secondary_color,
  contact_email, contact_phone, address, about_text, mission_text,
  social_facebook, social_twitter, social_instagram,
  seo_title, seo_description, payment_gateway, 
  payment_gateway_configured, payment_gateway_public_key,
  is_active, created_at, updated_at
FROM public.organizations;

-- 2. Fix overly permissive INSERT policy on security_audit_log
DROP POLICY IF EXISTS "Service can insert security audit logs" ON public.security_audit_log;

-- Only allow authenticated users or service role to insert audit logs
CREATE POLICY "Authenticated users can insert audit logs"
ON public.security_audit_log
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = 'service_role');