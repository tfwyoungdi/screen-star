-- Fix start_impersonation function: remove incorrect text cast for target_id
CREATE OR REPLACE FUNCTION public.start_impersonation(_org_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _session_id uuid;
  _org_name text;
BEGIN
  -- Verify caller is platform admin
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only platform admins can impersonate organizations';
  END IF;
  
  -- Get organization name for audit log
  SELECT name INTO _org_name FROM public.organizations WHERE id = _org_id;
  
  IF _org_name IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;
  
  -- End any existing active sessions
  UPDATE public.platform_impersonation_sessions
  SET ended_at = now()
  WHERE admin_user_id = auth.uid() AND ended_at IS NULL;
  
  -- Create new session
  INSERT INTO public.platform_impersonation_sessions (admin_user_id, impersonated_organization_id)
  VALUES (auth.uid(), _org_id)
  RETURNING id INTO _session_id;
  
  -- AUTO-LOG: Record impersonation start in audit log
  INSERT INTO public.platform_audit_logs (
    admin_user_id,
    action,
    target_type,
    target_id,
    details,
    ip_address
  ) VALUES (
    auth.uid(),
    'impersonation_started',
    'organization',
    _org_id,  -- No text cast needed, column is UUID
    jsonb_build_object(
      'session_id', _session_id,
      'organization_name', _org_name
    ),
    NULL
  );
  
  RETURN _session_id;
END;
$$;