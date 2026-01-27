-- Add start and end time columns for daily access code
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS daily_access_code_start_time time without time zone,
ADD COLUMN IF NOT EXISTS daily_access_code_end_time time without time zone;

-- Add comment for documentation
COMMENT ON COLUMN public.organizations.daily_access_code_start_time IS 'Start time when the daily access code becomes valid';
COMMENT ON COLUMN public.organizations.daily_access_code_end_time IS 'End time when the daily access code expires';