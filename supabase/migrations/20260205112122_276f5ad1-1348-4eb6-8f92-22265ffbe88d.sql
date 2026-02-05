-- Fix the organizations_public view to include UI-needed columns (non-sensitive)
DROP VIEW IF EXISTS public.organizations_public;

CREATE VIEW public.organizations_public AS
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
  social_twitter
  -- STILL EXCLUDED: daily_access_code, contact_email, contact_phone, address, payment_gateway_public_key, payment_gateway_configured
FROM public.organizations
WHERE is_active = true;

-- Grant select on the secure view
GRANT SELECT ON public.organizations_public TO anon, authenticated;