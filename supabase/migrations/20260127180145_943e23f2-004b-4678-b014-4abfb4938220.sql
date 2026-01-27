-- Create a function to delete shifts older than 30 days
CREATE OR REPLACE FUNCTION public.delete_old_shifts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.shifts
  WHERE started_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.delete_old_shifts() TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.delete_old_shifts() IS 'Deletes shifts older than 30 days for data retention compliance';