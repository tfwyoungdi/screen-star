-- Add function to log platform login attempts to audit log
CREATE OR REPLACE FUNCTION public.log_platform_login_attempt(_identifier text, _success boolean, _failure_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.platform_audit_logs (
    admin_user_id,
    action,
    target_type,
    target_id,
    details
  ) VALUES (
    CASE WHEN _success THEN auth.uid() ELSE NULL END,
    CASE WHEN _success THEN 'platform_login_success' ELSE 'platform_login_failed' END,
    'authentication',
    NULL,
    jsonb_build_object(
      'identifier_hash', encode(sha256(_identifier::bytea), 'hex'),
      'success', _success,
      'failure_reason', _failure_reason,
      'timestamp', now()
    )
  );
END;
$$;

-- Create a trigger to auto-log platform settings changes
CREATE OR REPLACE FUNCTION public.log_platform_settings_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_fields jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.maintenance_mode IS DISTINCT FROM NEW.maintenance_mode THEN
      changed_fields := changed_fields || jsonb_build_object('maintenance_mode', jsonb_build_object('old', OLD.maintenance_mode, 'new', NEW.maintenance_mode));
    END IF;
    IF OLD.platform_name IS DISTINCT FROM NEW.platform_name THEN
      changed_fields := changed_fields || jsonb_build_object('platform_name', jsonb_build_object('old', OLD.platform_name, 'new', NEW.platform_name));
    END IF;
    IF OLD.sla_escalation_enabled IS DISTINCT FROM NEW.sla_escalation_enabled THEN
      changed_fields := changed_fields || jsonb_build_object('sla_escalation_enabled', jsonb_build_object('old', OLD.sla_escalation_enabled, 'new', NEW.sla_escalation_enabled));
    END IF;
    IF OLD.enable_custom_domains IS DISTINCT FROM NEW.enable_custom_domains THEN
      changed_fields := changed_fields || jsonb_build_object('enable_custom_domains', jsonb_build_object('old', OLD.enable_custom_domains, 'new', NEW.enable_custom_domains));
    END IF;
    
    IF changed_fields != '{}'::jsonb THEN
      INSERT INTO public.platform_audit_logs (
        admin_user_id,
        action,
        target_type,
        target_id,
        details
      ) VALUES (
        auth.uid(),
        'platform_settings_changed',
        'platform_settings',
        NEW.id::text,
        jsonb_build_object('changes', changed_fields)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_platform_settings_changes_trigger ON public.platform_settings;
CREATE TRIGGER log_platform_settings_changes_trigger
  AFTER UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.log_platform_settings_changes();