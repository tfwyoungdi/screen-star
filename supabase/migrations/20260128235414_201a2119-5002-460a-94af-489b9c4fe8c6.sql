-- Add policy to allow public to view seat layouts for booking purposes
-- This is necessary for the public booking flow to display available seats

CREATE POLICY "Anyone can view seat layouts for active screens"
ON public.seat_layouts
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.screens s
    JOIN public.organizations o ON o.id = s.organization_id
    WHERE s.id = seat_layouts.screen_id
      AND o.is_active = true
      AND o.suspended_at IS NULL
  )
);

-- Also ensure screens can be viewed publicly for booking
DROP POLICY IF EXISTS "Public can view screens for active organizations" ON public.screens;

CREATE POLICY "Public can view screens for active organizations"
ON public.screens
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = screens.organization_id
      AND o.is_active = true
      AND o.suspended_at IS NULL
  )
);