-- Fix the last 2 security definer views (organizations_public and bookings_public)
-- These were created before the security_invoker migration

DROP VIEW IF EXISTS public.organizations_public;
CREATE VIEW public.organizations_public 
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  slug,
  logo_url,
  primary_color,
  secondary_color,
  currency,
  website_template,
  is_active,
  created_at,
  about_text,
  mission_text,
  values_json,
  seo_title,
  seo_description,
  social_facebook,
  social_instagram,
  social_twitter,
  contact_email,
  contact_phone,
  address,
  payment_gateway,
  payment_gateway_public_key,
  payment_gateway_configured
FROM public.organizations
WHERE is_active = true;
GRANT SELECT ON public.organizations_public TO anon, authenticated;

DROP VIEW IF EXISTS public.bookings_public;
CREATE VIEW public.bookings_public 
WITH (security_invoker = true)
AS
SELECT 
  id,
  booking_reference,
  showtime_id,
  organization_id,
  status,
  total_amount,
  discount_amount,
  created_at,
  CASE 
    WHEN customer_name IS NOT NULL THEN 
      LEFT(customer_name, 1) || '***'
    ELSE NULL 
  END as customer_name_masked,
  CASE 
    WHEN customer_email IS NOT NULL THEN 
      LEFT(customer_email, 1) || '***@' || SPLIT_PART(customer_email, '@', 2)
    ELSE NULL 
  END as customer_email_masked
FROM public.bookings;
GRANT SELECT ON public.bookings_public TO authenticated;