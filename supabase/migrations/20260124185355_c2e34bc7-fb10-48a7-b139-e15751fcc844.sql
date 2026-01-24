-- Add daily access code to organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS daily_access_code TEXT,
ADD COLUMN IF NOT EXISTS daily_access_code_set_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_organizations_daily_code 
ON public.organizations(id, daily_access_code) 
WHERE daily_access_code IS NOT NULL;