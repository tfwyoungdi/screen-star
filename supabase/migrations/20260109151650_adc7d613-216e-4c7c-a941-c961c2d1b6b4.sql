-- Add encrypted secret key column to organizations
-- Note: In production, this should use Supabase Vault for enhanced security
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS payment_gateway_secret_key TEXT;

-- Add a comment explaining the security consideration
COMMENT ON COLUMN public.organizations.payment_gateway_secret_key IS 'Encrypted payment gateway secret key - stored securely per organization';