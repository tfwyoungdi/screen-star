
-- SECURITY FIX 1: Block anonymous access to bookings (PII exposure)
-- The old policy "Anonymous can view pending booking by reference only" was already dropped by the failed migration.
-- Verify and create the blocking policy.
DO $$
BEGIN
  -- Drop leftover policies from failed migration if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bookings' AND policyname='Anonymous can view own pending booking by reference and email') THEN
    DROP POLICY "Anonymous can view own pending booking by reference and email" ON public.bookings;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bookings' AND policyname='No anonymous access to bookings') THEN
    DROP POLICY "No anonymous access to bookings" ON public.bookings;
  END IF;
END $$;

CREATE POLICY "No anonymous access to bookings"
ON public.bookings
FOR SELECT
TO anon
USING (false);

-- SECURITY FIX 2: Block anonymous access to customers
CREATE POLICY "No anonymous access to customers"
ON public.customers
FOR SELECT
TO anon
USING (false);

-- SECURITY FIX 3: Block anonymous access to profiles
CREATE POLICY "No anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);
