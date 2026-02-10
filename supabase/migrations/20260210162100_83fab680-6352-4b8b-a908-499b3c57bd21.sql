
-- Fix: Recreate view as security invoker (not security definer)
DROP VIEW IF EXISTS public.platform_settings_public;
CREATE VIEW public.platform_settings_public
WITH (security_invoker = true)
AS
SELECT 
  platform_name,
  logo_url,
  primary_color,
  maintenance_mode,
  maintenance_message,
  support_email,
  contact_phone,
  contact_email_description,
  contact_phone_description
FROM public.platform_settings;
