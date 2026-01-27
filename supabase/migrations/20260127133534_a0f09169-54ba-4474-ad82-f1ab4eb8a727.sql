-- Add column to track which access code was used for clock-in
ALTER TABLE public.shifts
ADD COLUMN IF NOT EXISTS access_code_used text;

-- Add comment for documentation
COMMENT ON COLUMN public.shifts.access_code_used IS 'The daily access code that was used when the staff member clocked in';