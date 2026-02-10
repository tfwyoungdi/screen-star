
-- CRITICAL FIX: Drop the old permissive anon policy on bookings that was overriding the blocking policy
-- With permissive policies, ANY policy returning true grants access, so USING(false) was ineffective
DROP POLICY IF EXISTS "Anonymous can view pending booking by reference only" ON public.bookings;
DROP POLICY IF EXISTS "Public can view own booking by reference" ON public.bookings;

-- FIX: Block anonymous access to booked_seats (currently exposes 151 records with pricing data)
DROP POLICY IF EXISTS "Anyone can view booked seats for active showtimes" ON public.booked_seats;

CREATE POLICY "No anonymous access to booked_seats"
ON public.booked_seats
FOR SELECT
TO anon
USING (false);
