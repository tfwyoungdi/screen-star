-- =====================================================
-- CRITICAL SECURITY FIX: Restrict access to sensitive data
-- =====================================================

-- 1. DROP existing permissive policies on organizations that expose secrets
DROP POLICY IF EXISTS "Anyone can view active organizations by slug" ON public.organizations;

-- 2. Create restrictive policy that only shows safe columns via the view
-- The organizations table should ONLY be accessible to authenticated staff
CREATE POLICY "Staff can view their organization"
ON public.organizations
FOR SELECT
TO authenticated
USING (id = get_user_organization(auth.uid()) OR is_platform_admin(auth.uid()));

-- 3. Ensure anon role cannot query organizations directly
-- Grant access only to the safe view
REVOKE SELECT ON public.organizations FROM anon;
GRANT SELECT ON public.organizations_public TO anon;

-- 4. Update organizations_public view to ensure it's the only public access point
DROP VIEW IF EXISTS public.organizations_public;
CREATE VIEW public.organizations_public 
WITH (security_invoker = true) AS 
SELECT 
  id,
  name,
  slug,
  logo_url,
  primary_color,
  secondary_color,
  currency,
  contact_email,
  contact_phone,
  address,
  about_text,
  mission_text,
  social_facebook,
  social_instagram,
  social_twitter,
  seo_title,
  seo_description,
  payment_gateway,
  payment_gateway_configured,
  payment_gateway_public_key, -- Only PUBLIC key, never secret
  is_active,
  created_at
  -- EXCLUDED: payment_gateway_secret_key, daily_access_code, daily_access_code_*
FROM public.organizations
WHERE is_active = true;

-- 5. Grant anon access to the safe view
GRANT SELECT ON public.organizations_public TO anon;
GRANT SELECT ON public.organizations_public TO authenticated;

-- 6. Fix bookings table - restrict anonymous SELECT
DROP POLICY IF EXISTS "Staff can view bookings in their org" ON public.bookings;
CREATE POLICY "Staff can view bookings in their org"
ON public.bookings
FOR SELECT
TO authenticated
USING (organization_id = get_user_organization(auth.uid()) OR is_platform_admin(auth.uid()));

-- 7. Fix customers table - ensure no anonymous access
-- The existing policies look correct but let's add explicit denial
DROP POLICY IF EXISTS "Staff can view customers in their org" ON public.customers;
CREATE POLICY "Staff can view customers in their org"
ON public.customers
FOR SELECT
TO authenticated
USING (organization_id = get_user_organization(auth.uid()) OR is_platform_admin(auth.uid()));

-- 8. Fix job_applications - restrict SELECT to authenticated staff only
DROP POLICY IF EXISTS "Staff can view job applications in their org" ON public.job_applications;
CREATE POLICY "Staff can view job applications in their org"
ON public.job_applications
FOR SELECT
TO authenticated
USING (organization_id = get_user_organization(auth.uid()) OR is_platform_admin(auth.uid()));

-- 9. Fix contact_submissions - restrict SELECT to authenticated staff only  
DROP POLICY IF EXISTS "Staff can view contact submissions in their org" ON public.contact_submissions;
CREATE POLICY "Staff can view contact submissions in their org"
ON public.contact_submissions
FOR SELECT
TO authenticated
USING (organization_id = get_user_organization(auth.uid()) OR is_platform_admin(auth.uid()));

-- 10. Create secure function to get daily access code (only for supervisors/admins)
CREATE OR REPLACE FUNCTION public.get_daily_access_code(_org_id uuid)
RETURNS TABLE(
  daily_access_code text,
  daily_access_code_set_at timestamptz,
  daily_access_code_start_time time,
  daily_access_code_end_time time
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    o.daily_access_code,
    o.daily_access_code_set_at,
    o.daily_access_code_start_time,
    o.daily_access_code_end_time
  FROM public.organizations o
  WHERE o.id = _org_id
    AND (is_supervisor(auth.uid(), _org_id) 
         OR is_cinema_admin(auth.uid(), _org_id)
         OR is_platform_admin(auth.uid()));
$$;

-- 11. Create secure function to validate daily access code (for staff clock-in)
CREATE OR REPLACE FUNCTION public.validate_daily_access_code(_org_id uuid, _code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = _org_id
      AND o.daily_access_code = _code
      AND o.daily_access_code_set_at::date = CURRENT_DATE
      AND (o.daily_access_code_start_time IS NULL OR CURRENT_TIME >= o.daily_access_code_start_time)
      AND (o.daily_access_code_end_time IS NULL OR CURRENT_TIME <= o.daily_access_code_end_time)
  );
$$;