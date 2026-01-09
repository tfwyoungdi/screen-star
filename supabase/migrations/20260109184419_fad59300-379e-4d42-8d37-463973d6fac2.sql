-- Add unique constraint to booking_reference to ensure no duplicate QR codes
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_booking_reference_unique UNIQUE (booking_reference);

-- Update the generate_booking_reference function to ensure uniqueness with retry logic
CREATE OR REPLACE FUNCTION public.generate_booking_reference()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
  attempts integer := 0;
  max_attempts integer := 10;
BEGIN
  LOOP
    result := '';
    -- Generate 8 character reference (uppercase letters and numbers, excluding ambiguous chars)
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    -- Check if this reference already exists
    IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE booking_reference = result) THEN
      RETURN result;
    END IF;
    
    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      -- If we've tried many times, add more random chars to increase uniqueness
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
      RETURN result;
    END IF;
  END LOOP;
END;
$$;