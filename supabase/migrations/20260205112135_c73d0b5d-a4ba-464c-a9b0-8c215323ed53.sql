-- Fix the organizations_public view to include all UI-needed columns
-- Note: contact_email and contact_phone are needed for public contact pages
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
  social_twitter,
  contact_email,
  contact_phone,
  address,
  payment_gateway,
  payment_gateway_configured
  -- STILL EXCLUDED (sensitive): daily_access_code, payment_gateway_public_key
FROM public.organizations
WHERE is_active = true;

-- Grant select on the view
GRANT SELECT ON public.organizations_public TO anon, authenticated;