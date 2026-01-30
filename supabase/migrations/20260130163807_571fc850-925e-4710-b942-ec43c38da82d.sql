-- Add website_template column to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS website_template TEXT DEFAULT 'classic-cinema';

-- Add comment for documentation
COMMENT ON COLUMN public.organizations.website_template IS 'The selected website template ID (classic-cinema, modern-minimal, neon-nights)';