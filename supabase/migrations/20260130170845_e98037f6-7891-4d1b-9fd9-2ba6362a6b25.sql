-- Drop and recreate the organizations_public view to include website_template
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
  payment_gateway_public_key,
  is_active,
  created_at,
  website_template
FROM public.organizations
WHERE is_active = true;

-- Drop and recreate the organizations_safe view to include website_template
DROP VIEW IF EXISTS public.organizations_safe;

CREATE VIEW public.organizations_safe AS
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
  updated_at,
  website_template
FROM public.organizations;