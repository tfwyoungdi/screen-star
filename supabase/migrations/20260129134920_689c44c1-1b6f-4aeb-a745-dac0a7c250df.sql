-- Fix booking RLS for anonymous users
-- The issue is that the INSERT with RETURNING requires SELECT access
-- which anon users don't have since SELECT policies target authenticated users

-- Drop the old policy that was created incorrectly as ALL (a) instead of INSERT (i)
DROP POLICY IF EXISTS "Anyone can create bookings with valid showtime" ON public.bookings;

-- Create INSERT-only policy for anonymous bookings (no SELECT needed for returning)
CREATE POLICY "Anyone can create bookings with valid showtime"
ON public.bookings
FOR INSERT
TO public
WITH CHECK (
  public.validate_booking_insert(showtime_id, organization_id)
);

-- Add SELECT policy so anon users can read their own booking after insert (needed for RETURNING)
-- This uses a permissive policy that allows selecting bookings for active showtimes
CREATE POLICY "Anyone can view their pending bookings"
ON public.bookings
FOR SELECT
TO public
USING (
  -- Only allow reading pending bookings (not paid/cancelled)
  status = 'pending'
  AND
  -- Validate the showtime is active and belongs to an active org
  EXISTS (
    SELECT 1 FROM public.showtimes s
    JOIN public.organizations o ON s.organization_id = o.id
    WHERE s.id = bookings.showtime_id
    AND s.is_active = true
    AND o.is_active = true
  )
);