-- Add shift_id column to bookings table to link sales to shifts
ALTER TABLE public.bookings 
ADD COLUMN shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL;

-- Create index for efficient querying
CREATE INDEX idx_bookings_shift_id ON public.bookings(shift_id);

-- Comment for documentation
COMMENT ON COLUMN public.bookings.shift_id IS 'Links box office sales to the active shift for performance tracking';