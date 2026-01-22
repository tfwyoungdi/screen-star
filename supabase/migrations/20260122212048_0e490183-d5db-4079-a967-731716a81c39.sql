-- Add per-customer usage limit column to promo_codes
ALTER TABLE public.promo_codes
ADD COLUMN max_uses_per_customer INTEGER DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.promo_codes.max_uses_per_customer IS 'Maximum number of times a single customer can use this promo code. NULL means unlimited.';