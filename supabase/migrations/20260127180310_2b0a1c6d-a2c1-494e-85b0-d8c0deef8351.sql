-- Schedule daily cleanup of old shifts at 3 AM UTC
SELECT cron.schedule(
  'delete-old-shifts-daily',
  '0 3 * * *',
  $$SELECT public.delete_old_shifts();$$
);