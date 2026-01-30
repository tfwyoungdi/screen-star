-- =============================================
-- CRITICAL SECURITY FIXES FOR PLATFORM ADMIN
-- =============================================

-- ===========================================
-- FIX #1: Secure bookings RLS - Prevent PII exposure
-- ===========================================

-- Drop the overly permissive anonymous policy if it exists
DROP POLICY IF EXISTS "Anonymous users can view their pending bookings" ON public.bookings;
DROP POLICY IF EXISTS "Public can view pending bookings" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can view pending bookings" ON public.bookings;

-- Create a restricted policy that only allows viewing via booking reference lookup
-- (Anonymous users should only access their own booking via the secure view)
CREATE POLICY "Anonymous access only via booking reference"
  ON public.bookings
  FOR SELECT
  TO anon
  USING (false); -- Block all direct anonymous access - use bookings_public view instead

-- ===========================================
-- FIX #2: Prevent privilege escalation in user_roles
-- ===========================================

-- Drop existing INSERT policies that might allow self-assignment
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow users to create roles" ON public.user_roles;

-- Only cinema_admin or platform_admin can assign roles
CREATE POLICY "Only admins can assign roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Platform admins can assign any role
    public.is_platform_admin(auth.uid())
    OR
    -- Cinema admins can only assign non-admin roles within their organization
    (
      public.is_cinema_admin(auth.uid(), organization_id)
      AND role NOT IN ('platform_admin', 'cinema_admin')
    )
  );

-- Prevent users from updating their own roles
DROP POLICY IF EXISTS "Users can update their own roles" ON public.user_roles;

CREATE POLICY "Only admins can update roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR public.is_cinema_admin(auth.uid(), organization_id)
  )
  WITH CHECK (
    -- Platform admins can update to any role
    public.is_platform_admin(auth.uid())
    OR
    -- Cinema admins cannot promote to platform_admin
    (
      public.is_cinema_admin(auth.uid(), organization_id)
      AND role NOT IN ('platform_admin')
    )
  );

-- Secure DELETE policy
DROP POLICY IF EXISTS "Users can delete roles" ON public.user_roles;

CREATE POLICY "Only admins can delete roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR (
      public.is_cinema_admin(auth.uid(), organization_id)
      AND role NOT IN ('platform_admin', 'cinema_admin')
    )
  );

-- ===========================================
-- FIX #3: Secure handle_new_user trigger
-- ===========================================

-- Replace the handle_new_user function to prevent role injection via metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  org_id uuid;
  cinema_name text;
  cinema_slug text;
  requested_role text;
BEGIN
  -- Get cinema info from user metadata
  cinema_name := NEW.raw_user_meta_data ->> 'cinema_name';
  cinema_slug := NEW.raw_user_meta_data ->> 'cinema_slug';
  
  -- SECURITY: Check if user is trying to inject a role via metadata
  requested_role := NEW.raw_user_meta_data ->> 'role';
  IF requested_role IS NOT NULL AND requested_role IN ('platform_admin', 'cinema_admin', 'manager', 'supervisor') THEN
    -- Log suspicious activity and ignore the role
    RAISE WARNING 'Blocked attempt to self-assign privileged role: % by user %', requested_role, NEW.email;
  END IF;
  
  -- Only proceed if this is a cinema admin signup (has cinema_name)
  IF cinema_name IS NOT NULL AND cinema_slug IS NOT NULL THEN
    -- Validate slug format to prevent injection
    IF cinema_slug !~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' OR length(cinema_slug) < 3 OR length(cinema_slug) > 50 THEN
      RAISE EXCEPTION 'Invalid cinema slug format';
    END IF;
    
    -- Check if slug already exists
    IF EXISTS (SELECT 1 FROM public.organizations WHERE slug = cinema_slug) THEN
      RAISE EXCEPTION 'Cinema slug already exists';
    END IF;
    
    -- Create the organization
    INSERT INTO public.organizations (name, slug)
    VALUES (cinema_name, cinema_slug)
    RETURNING id INTO org_id;
    
    -- Create the profile
    INSERT INTO public.profiles (id, organization_id, full_name, email)
    VALUES (
      NEW.id,
      org_id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
      NEW.email
    );
    
    -- Assign cinema_admin role (ONLY cinema_admin, never platform_admin)
    INSERT INTO public.user_roles (user_id, organization_id, role)
    VALUES (NEW.id, org_id, 'cinema_admin');
  END IF;
  
  RETURN NEW;
END;
$function$;

-- ===========================================
-- FIX #4: Auto-log impersonation in audit table
-- ===========================================

-- Replace start_impersonation to include automatic audit logging
CREATE OR REPLACE FUNCTION public.start_impersonation(_org_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    _org_id::text,
    jsonb_build_object(
      'session_id', _session_id,
      'organization_name', _org_name
    ),
    NULL
  );
  
  RETURN _session_id;
END;
$function$;

-- Replace stop_impersonation to include automatic audit logging
CREATE OR REPLACE FUNCTION public.stop_impersonation()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _session RECORD;
  _org_name text;
BEGIN
  -- Get the active session details before ending it
  SELECT pis.*, o.name as org_name
  INTO _session
  FROM public.platform_impersonation_sessions pis
  JOIN public.organizations o ON o.id = pis.impersonated_organization_id
  WHERE pis.admin_user_id = auth.uid() AND pis.ended_at IS NULL
  LIMIT 1;
  
  -- End the session
  UPDATE public.platform_impersonation_sessions
  SET ended_at = now()
  WHERE admin_user_id = auth.uid() AND ended_at IS NULL;
  
  -- AUTO-LOG: Record impersonation end in audit log
  IF _session.id IS NOT NULL THEN
    INSERT INTO public.platform_audit_logs (
      admin_user_id,
      action,
      target_type,
      target_id,
      details,
      ip_address
    ) VALUES (
      auth.uid(),
      'impersonation_ended',
      'organization',
      _session.impersonated_organization_id::text,
      jsonb_build_object(
        'session_id', _session.id,
        'organization_name', _session.org_name,
        'duration_minutes', EXTRACT(EPOCH FROM (now() - _session.started_at)) / 60
      ),
      NULL
    );
  END IF;
  
  RETURN true;
END;
$function$;

-- ===========================================
-- FIX #5: Secure SELECT on user_roles
-- ===========================================

-- Ensure users can only see roles in their organization (or platform admins see all)
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view roles in their organization" ON public.user_roles;

CREATE POLICY "View roles - scoped access"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    -- Platform admins can see all roles
    public.is_platform_admin(auth.uid())
    OR
    -- Users can see their own roles
    user_id = auth.uid()
    OR
    -- Cinema admins can see roles in their organization
    public.is_cinema_admin(auth.uid(), organization_id)
  );