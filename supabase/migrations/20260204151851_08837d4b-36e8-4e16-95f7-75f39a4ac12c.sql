-- Add payment gateway configuration columns to platform_settings
ALTER TABLE public.platform_settings
ADD COLUMN IF NOT EXISTS subscription_payment_gateway TEXT DEFAULT 'flutterwave',
ADD COLUMN IF NOT EXISTS stripe_configured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS flutterwave_configured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS paystack_configured BOOLEAN DEFAULT false;