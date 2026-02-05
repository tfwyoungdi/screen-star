-- Add payment_gateway_public_key back - it's a PUBLIC key so safe to expose
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
  payment_gateway_public_key,
  payment_gateway_configured
  -- STILL EXCLUDED (truly sensitive): daily_access_code (box office access code)
FROM public.organizations
WHERE is_active = true;

GRANT SELECT ON public.organizations_public TO anon, authenticated;