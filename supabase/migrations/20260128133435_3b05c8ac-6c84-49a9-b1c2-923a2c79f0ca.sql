-- SECURITY + FIX (retry): Avoid a security-definer view while still allowing unauthenticated cinema discovery.

-- 1) Ensure organizations_public is an invoker view
ALTER VIEW public.organizations_public
SET (security_invoker = true);

-- 2) RLS: allow anonymous discovery of active, non-suspended cinemas (row-level)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organizations'
      AND policyname = 'Public can view active organizations (discovery)'
  ) THEN
    EXECUTE 'CREATE POLICY "Public can view active organizations (discovery)" ON public.organizations FOR SELECT TO anon USING (is_active = true AND suspended_at IS NULL)';
  END IF;
END $$;

-- 3) Column-level privileges: restrict what anon can read
REVOKE SELECT ON public.organizations FROM anon;

GRANT SELECT (
  id,
  name,
  slug,
  logo_url,
  primary_color,
  secondary_color,
  currency,
  contact_email,
  contact_phone,
  address,
  about_text,
  mission_text,
  social_facebook,
  social_instagram,
  social_twitter,
  seo_title,
  seo_description,
  payment_gateway,
  payment_gateway_configured,
  payment_gateway_public_key,
  is_active,
  created_at,
  updated_at
) ON public.organizations TO anon;
