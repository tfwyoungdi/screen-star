-- CRITICAL SECURITY FIX #1: Prevent self-promotion to platform_admin
-- Drop existing INSERT policy on user_roles that allows privilege escalation
DROP POLICY IF EXISTS "Users can create their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can insert their own roles" ON public.user_roles;

-- Create restrictive INSERT policy - only platform_admin can create platform_admin roles
CREATE POLICY "Only platform admins can assign platform_admin role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if assigning non-platform_admin role to self
  (user_id = auth.uid() AND role != 'platform_admin')
  OR
  -- Allow platform admins to assign any role
  public.is_platform_admin(auth.uid())
);

-- CRITICAL SECURITY FIX #2: Create impersonation sessions table for server-side validation
CREATE TABLE IF NOT EXISTS public.platform_impersonation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  impersonated_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '4 hours'),
  ended_at timestamptz,
  UNIQUE(admin_user_id, impersonated_organization_id, ended_at)
);

-- Enable RLS on impersonation sessions
ALTER TABLE public.platform_impersonation_sessions ENABLE ROW LEVEL SECURITY;

-- Only platform admins can manage their own impersonation sessions
CREATE POLICY "Platform admins can manage their sessions"
ON public.platform_impersonation_sessions
FOR ALL
TO authenticated
USING (
  admin_user_id = auth.uid() 
  AND public.is_platform_admin(auth.uid())
)
WITH CHECK (
  admin_user_id = auth.uid() 
  AND public.is_platform_admin(auth.uid())
);

-- Create function to validate impersonation session
CREATE OR REPLACE FUNCTION public.get_active_impersonation(_user_id uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT impersonated_organization_id
  FROM public.platform_impersonation_sessions
  WHERE admin_user_id = _user_id
    AND ended_at IS NULL
    AND expires_at > now()
    AND public.is_platform_admin(_user_id)
  ORDER BY started_at DESC
  LIMIT 1
$$;

-- Create function to start impersonation (validates admin status)
CREATE OR REPLACE FUNCTION public.start_impersonation(_org_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _session_id uuid;
BEGIN
  -- Verify caller is platform admin
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only platform admins can impersonate organizations';
  END IF;
  
  -- End any existing active sessions
  UPDATE public.platform_impersonation_sessions
  SET ended_at = now()
  WHERE admin_user_id = auth.uid() AND ended_at IS NULL;
  
  -- Create new session
  INSERT INTO public.platform_impersonation_sessions (admin_user_id, impersonated_organization_id)
  VALUES (auth.uid(), _org_id)
  RETURNING id INTO _session_id;
  
  RETURN _session_id;
END;
$$;

-- Create function to end impersonation
CREATE OR REPLACE FUNCTION public.stop_impersonation()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.platform_impersonation_sessions
  SET ended_at = now()
  WHERE admin_user_id = auth.uid() AND ended_at IS NULL;
  
  RETURN true;
END;
$$;

-- CRITICAL SECURITY FIX #3: Audit log for impersonation actions
ALTER TABLE public.platform_audit_logs 
ADD COLUMN IF NOT EXISTS impersonation_session_id uuid REFERENCES public.platform_impersonation_sessions(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_active 
ON public.platform_impersonation_sessions(admin_user_id, ended_at) 
WHERE ended_at IS NULL;