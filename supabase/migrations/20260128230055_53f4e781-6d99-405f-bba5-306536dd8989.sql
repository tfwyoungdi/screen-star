-- Add columns to track who activated online tickets and when
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS activated_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS activated_at timestamp with time zone;

-- Create index for efficient querying of activation stats
CREATE INDEX IF NOT EXISTS idx_bookings_activated_by ON public.bookings(activated_by) WHERE activated_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_activated_at ON public.bookings(activated_at) WHERE activated_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.bookings.activated_by IS 'Staff user ID who activated an online ticket at the box office';
COMMENT ON COLUMN public.bookings.activated_at IS 'Timestamp when an online ticket was activated';