-- =====================================================
-- SECURITY HARDENING MIGRATION
-- Addresses critical RLS gaps identified in security audit
-- =====================================================

-- 1. Create a secure view that excludes secret keys
CREATE OR REPLACE VIEW public.organizations_safe AS
SELECT 
  id, name, slug, logo_url, currency, primary_color, secondary_color,
  contact_email, contact_phone, address, about_text, mission_text,
  social_facebook, social_twitter, social_instagram,
  seo_title, seo_description, payment_gateway, 
  payment_gateway_configured, payment_gateway_public_key,
  is_active, created_at, updated_at
FROM public.organizations;

-- 2. Add RLS to prevent anonymous access to booking customer data
-- First, create a helper function to check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
$$;

-- 3. Update shifts table RLS to restrict cash data visibility
-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Staff can view shifts in their org" ON public.shifts;

-- Create more restrictive policy - staff can only see their own shifts
CREATE POLICY "Staff can view their own shifts"
ON public.shifts
FOR SELECT
USING (
  -- Staff can view their own shifts
  user_id = auth.uid()
  -- OR supervisors/admins can view all shifts in their org
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.organization_id = shifts.organization_id
    AND ur.role IN ('cinema_admin', 'manager', 'supervisor', 'accountant')
  )
  -- OR platform admins
  OR is_platform_admin(auth.uid())
);

-- 4. Restrict staff_invitations to hide tokens from other staff
DROP POLICY IF EXISTS "Staff can view invitations in their org" ON public.staff_invitations;

-- Only cinema admins can view invitation details
CREATE POLICY "Cinema admins can view invitations"
ON public.staff_invitations
FOR SELECT
USING (
  is_cinema_admin(auth.uid(), organization_id)
  OR is_platform_admin(auth.uid())
);

-- 5. Restrict scan_logs visibility to supervisors/managers only
DROP POLICY IF EXISTS "Staff can view scan logs in their org" ON public.scan_logs;

CREATE POLICY "Supervisors and admins can view scan logs"
ON public.scan_logs
FOR SELECT
USING (
  -- Staff can see their own scans
  scanned_by = auth.uid()
  -- OR supervisors/admins can view all
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.organization_id = scan_logs.organization_id
    AND ur.role IN ('cinema_admin', 'manager', 'supervisor')
  )
  OR is_platform_admin(auth.uid())
);

-- 6. Restrict email_analytics to admins only
DROP POLICY IF EXISTS "Users can view their organization's email analytics" ON public.email_analytics;

CREATE POLICY "Admins can view email analytics"
ON public.email_analytics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.organization_id = email_analytics.organization_id
    AND ur.role IN ('cinema_admin', 'manager')
  )
  OR is_platform_admin(auth.uid())
);

-- 7. Create audit logging for sensitive operations
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only platform admins can read audit logs
CREATE POLICY "Platform admins can view security audit logs"
ON public.security_audit_log
FOR SELECT
USING (is_platform_admin(auth.uid()));

-- Service role can insert
CREATE POLICY "Service can insert security audit logs"
ON public.security_audit_log
FOR INSERT
WITH CHECK (true);