-- Fix the view to explicitly use SECURITY INVOKER
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
  about_text,
  mission_text,
  contact_email,
  contact_phone,
  address,
  social_facebook,
  social_instagram,
  social_twitter,
  seo_title,
  seo_description,
  is_active,
  created_at,
  payment_gateway,
  payment_gateway_configured,
  payment_gateway_public_key
FROM public.organizations
WHERE is_active = true;

-- Grant access
GRANT SELECT ON public.organizations_public TO anon;
GRANT SELECT ON public.organizations_public TO authenticated;