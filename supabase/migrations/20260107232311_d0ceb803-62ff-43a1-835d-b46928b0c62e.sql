-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to call the edge function when a low stock notification is created
CREATE OR REPLACE FUNCTION public.send_low_stock_notification_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
  payload JSONB;
BEGIN
  -- Get the Supabase URL from environment (stored in vault or config)
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- If settings not available, try to get from the organization's edge function URL
  IF supabase_url IS NULL THEN
    supabase_url := 'https://immqqxnblovkdvokfbef.supabase.co';
  END IF;
  
  -- Build the payload
  payload := jsonb_build_object(
    'notificationId', NEW.id,
    'organizationId', NEW.organization_id,
    'items', NEW.items,
    'email', NEW.notified_email
  );
  
  -- Make async HTTP request to the edge function
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-low-stock-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(service_role_key, current_setting('app.settings.anon_key', true))
    ),
    body := payload
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically send notification when a new record is inserted
DROP TRIGGER IF EXISTS trigger_send_low_stock_notification ON public.low_stock_notifications;
CREATE TRIGGER trigger_send_low_stock_notification
AFTER INSERT ON public.low_stock_notifications
FOR EACH ROW
EXECUTE FUNCTION public.send_low_stock_notification_webhook();