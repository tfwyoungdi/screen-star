-- Add currency column to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';

-- Add comment for documentation
COMMENT ON COLUMN public.organizations.currency IS 'The default currency for this cinema (ISO 4217 code)';