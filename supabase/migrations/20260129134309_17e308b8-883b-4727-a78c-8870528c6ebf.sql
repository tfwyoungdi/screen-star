-- Fix RLS policy for bookings INSERT that was failing due to nested RLS checks
-- The current policy does a SELECT on showtimes, which has its own RLS policies
-- This can cause permission denied when the caller doesn't have SELECT access to showtimes

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Anyone can create bookings with valid showtime" ON public.bookings;

-- Create a SECURITY DEFINER function to validate booking insertion
-- This function bypasses RLS to check showtime validity
CREATE OR REPLACE FUNCTION public.validate_booking_insert(
  _showtime_id uuid,
  _organization_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.showtimes s
    WHERE s.id = _showtime_id
      AND s.organization_id = _organization_id
      AND s.is_active = true
  )
$$;

-- Create new INSERT policy using the SECURITY DEFINER function
CREATE POLICY "Anyone can create bookings with valid showtime"
ON public.bookings
FOR INSERT
WITH CHECK (
  public.validate_booking_insert(showtime_id, organization_id)
);