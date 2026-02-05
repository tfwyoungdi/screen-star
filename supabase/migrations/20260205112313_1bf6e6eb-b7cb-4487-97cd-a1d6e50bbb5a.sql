-- Fix remaining Security Definer Views by setting SECURITY INVOKER
-- (organizations_public and bookings_public already fixed in previous migration)

-- Fix subscription_plans_public view
DROP VIEW IF EXISTS public.subscription_plans_public;
CREATE VIEW public.subscription_plans_public
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  slug,
  description,
  price_monthly,
  price_yearly,
  features,
  is_active,
  max_screens,
  max_staff,
  sort_order
FROM public.subscription_plans
WHERE is_active = true;
GRANT SELECT ON public.subscription_plans_public TO anon, authenticated;

-- Fix platform_settings_public view  
DROP VIEW IF EXISTS public.platform_settings_public;
CREATE VIEW public.platform_settings_public
WITH (security_invoker = true)
AS
SELECT 
  id,
  platform_name,
  support_email,
  logo_url,
  primary_color,
  maintenance_mode,
  maintenance_message,
  enable_cinema_gateways,
  enable_custom_domains,
  enable_wallet_feature,
  enable_promotions
FROM public.platform_settings
LIMIT 1;
GRANT SELECT ON public.platform_settings_public TO anon, authenticated;

-- Fix concession_items_public view
DROP VIEW IF EXISTS public.concession_items_public;
CREATE VIEW public.concession_items_public
WITH (security_invoker = true)
AS
SELECT 
  id,
  organization_id,
  name,
  description,
  category,
  price,
  image_url,
  is_available,
  display_order
FROM public.concession_items
WHERE is_available = true;
GRANT SELECT ON public.concession_items_public TO anon, authenticated;

-- Fix organizations_safe view
DROP VIEW IF EXISTS public.organizations_safe;
CREATE VIEW public.organizations_safe
WITH (security_invoker = true)
AS
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
GRANT SELECT ON public.organizations_safe TO authenticated;