-- Add enhanced website setup columns to organizations
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS about_text text,
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS contact_phone text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS social_facebook text,
ADD COLUMN IF NOT EXISTS social_instagram text,
ADD COLUMN IF NOT EXISTS social_twitter text,
ADD COLUMN IF NOT EXISTS seo_title text,
ADD COLUMN IF NOT EXISTS seo_description text,
ADD COLUMN IF NOT EXISTS payment_gateway text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS payment_gateway_public_key text,
ADD COLUMN IF NOT EXISTS payment_gateway_configured boolean DEFAULT false;

-- Create promo_codes table
CREATE TABLE public.promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  min_purchase_amount NUMERIC DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, code)
);

-- Add promo_code_id to bookings
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES public.promo_codes(id),
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;

-- Enable RLS on promo_codes
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- RLS policies for promo_codes
CREATE POLICY "Cinema admins can manage promo codes"
ON public.promo_codes
FOR ALL
USING (is_cinema_admin(auth.uid(), organization_id));

CREATE POLICY "Staff can view promo codes in their org"
ON public.promo_codes
FOR SELECT
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Anyone can view active promo codes"
ON public.promo_codes
FOR SELECT
USING (is_active = true AND (valid_until IS NULL OR valid_until > now()));

-- Trigger to update promo_codes updated_at
CREATE TRIGGER update_promo_codes_updated_at
BEFORE UPDATE ON public.promo_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();