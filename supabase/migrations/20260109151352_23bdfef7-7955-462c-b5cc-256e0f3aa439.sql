-- Enable pg_net extension for HTTP calls if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule showtime reminder to run every 30 minutes
SELECT cron.schedule(
  'send-showtime-reminders',
  '*/30 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://immqqxnblovkdvokfbef.supabase.co/functions/v1/send-showtime-reminder',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltbXFxeG5ibG92a2R2b2tmYmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NDYxOTcsImV4cCI6MjA4MzMyMjE5N30.5iHXz9vz5s0zBNbaBz8pl6xscKN23DdI9CNjkLnaYaY"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);