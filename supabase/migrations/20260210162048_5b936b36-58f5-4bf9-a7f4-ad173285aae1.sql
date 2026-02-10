
-- Add contact method fields to platform_settings
ALTER TABLE public.platform_settings
ADD COLUMN IF NOT EXISTS contact_phone TEXT DEFAULT '+1 (800) 555-0199',
ADD COLUMN IF NOT EXISTS contact_email_description TEXT DEFAULT 'Get help with technical issues',
ADD COLUMN IF NOT EXISTS contact_phone_description TEXT DEFAULT 'Mon-Fri from 8am to 6pm';

-- Update the public view to expose these fields
CREATE OR REPLACE VIEW public.platform_settings_public AS
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
