-- Tighten RLS INSERT policies by adding organization validation where appropriate

-- Drop existing overly permissive INSERT policies
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can create booked seats" ON public.booked_seats;
DROP POLICY IF EXISTS "Anyone can create booking concessions" ON public.booking_concessions;
DROP POLICY IF EXISTS "Anyone can create booking combos" ON public.booking_combos;
DROP POLICY IF EXISTS "Anyone can create page views" ON public.page_views;

-- Recreate with organization validation for bookings
-- Bookings: Allow insert only if showtime belongs to the organization
CREATE POLICY "Anyone can create bookings with valid showtime"
ON public.bookings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.showtimes s
    WHERE s.id = showtime_id
    AND s.organization_id = bookings.organization_id
    AND s.is_active = true
  )
);

-- Booked seats: Allow insert only if booking exists
CREATE POLICY "Anyone can create booked seats with valid booking"
ON public.booked_seats
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id
  )
);

-- Booking concessions: Allow insert only if booking exists
CREATE POLICY "Anyone can create booking concessions with valid booking"
ON public.booking_concessions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id
  )
);

-- Booking combos: Allow insert only if booking exists
CREATE POLICY "Anyone can create booking combos with valid booking"
ON public.booking_combos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id
  )
);

-- Page views: Allow insert only if organization exists and is active
CREATE POLICY "Anyone can create page views for active organizations"
ON public.page_views
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = organization_id
    AND o.is_active = true
  )
);

-- Add INSERT policy for email_analytics (was missing)
CREATE POLICY "Service can insert email analytics"
ON public.email_analytics
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = organization_id
    AND o.is_active = true
  )
);