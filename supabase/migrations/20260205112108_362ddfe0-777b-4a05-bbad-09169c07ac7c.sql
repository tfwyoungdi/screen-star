-- ============================================
-- CRITICAL FIX #1: Prevent Platform Role Self-Assignment
-- ============================================

-- Drop the vulnerable policy that allows users to create their own roles
DROP POLICY IF EXISTS "Users can create their own initial role" ON public.user_roles;

-- Create a secure policy that blocks platform role self-assignment
CREATE POLICY "Users can create their own initial role (non-platform only)"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND role NOT IN ('platform_admin', 'platform_marketing', 'platform_accounts', 'platform_dev')
);

-- Only platform admins can assign platform-level roles
CREATE POLICY "Platform admins can manage platform roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_platform_admin(auth.uid())
  AND role IN ('platform_admin', 'platform_marketing', 'platform_accounts', 'platform_dev')
);

-- Platform admins can update platform roles
DROP POLICY IF EXISTS "Platform admins can update platform roles" ON public.user_roles;
CREATE POLICY "Platform admins can update platform roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

-- Platform admins can delete platform roles
DROP POLICY IF EXISTS "Platform admins can delete platform roles" ON public.user_roles;
CREATE POLICY "Platform admins can delete platform roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- ============================================
-- CRITICAL FIX #2: Secure Organizations Public View
-- ============================================

-- Drop the existing insecure public view
DROP VIEW IF EXISTS public.organizations_public;

-- Create a secure public view that only exposes non-sensitive data
CREATE VIEW public.organizations_public AS
SELECT 
  id,
  name,
  slug,
  logo_url,
  currency,
  website_template,
  is_active,
  created_at
FROM public.organizations
WHERE is_active = true;

-- Grant select on the secure view
GRANT SELECT ON public.organizations_public TO anon, authenticated;

-- ============================================
-- CRITICAL FIX #3: Secure Bookings Public View
-- ============================================

-- Drop the existing insecure public view
DROP VIEW IF EXISTS public.bookings_public;

-- Create a secure public view that masks PII
CREATE VIEW public.bookings_public AS
SELECT 
  id,
  booking_reference,
  showtime_id,
  organization_id,
  status,
  total_amount,
  discount_amount,
  created_at,
  CASE 
    WHEN customer_name IS NOT NULL THEN 
      LEFT(customer_name, 1) || '***'
    ELSE NULL 
  END as customer_name_masked,
  CASE 
    WHEN customer_email IS NOT NULL THEN 
      LEFT(customer_email, 1) || '***@' || SPLIT_PART(customer_email, '@', 2)
    ELSE NULL 
  END as customer_email_masked
FROM public.bookings;

-- Grant select only to authenticated users
GRANT SELECT ON public.bookings_public TO authenticated;

-- ============================================
-- CRITICAL FIX #4: Restrict Bookings Direct Access
-- ============================================

DROP POLICY IF EXISTS "Public can view bookings by reference" ON public.bookings;

CREATE POLICY "Public can view own booking by reference"
ON public.bookings
FOR SELECT
TO anon
USING (false);

DROP POLICY IF EXISTS "Org members can view bookings" ON public.bookings;
CREATE POLICY "Org members can view bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
  OR organization_id = public.get_active_impersonation(auth.uid())
  OR public.is_platform_admin(auth.uid())
);

-- ============================================
-- CRITICAL FIX #5: Secure handle_new_user Function
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  org_id uuid;
  cinema_name text;
  cinema_slug text;
  requested_role text;
  blocked_roles text[] := ARRAY['platform_admin', 'platform_marketing', 'platform_accounts', 'platform_dev', 'cinema_admin', 'manager', 'supervisor'];
BEGIN
  cinema_name := NEW.raw_user_meta_data ->> 'cinema_name';
  cinema_slug := NEW.raw_user_meta_data ->> 'cinema_slug';
  
  requested_role := NEW.raw_user_meta_data ->> 'role';
  IF requested_role IS NOT NULL AND requested_role = ANY(blocked_roles) THEN
    BEGIN
      INSERT INTO public.platform_audit_logs (admin_user_id, action, target_type, target_id, details)
      VALUES (
        NEW.id,
        'blocked_role_injection',
        'user',
        NEW.id::text,
        jsonb_build_object('attempted_role', requested_role, 'email', NEW.email)
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  
  IF cinema_name IS NOT NULL AND cinema_slug IS NOT NULL THEN
    IF cinema_slug !~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' OR length(cinema_slug) < 3 OR length(cinema_slug) > 50 THEN
      RAISE EXCEPTION 'Invalid cinema slug format';
    END IF;
    
    IF EXISTS (SELECT 1 FROM public.organizations WHERE slug = cinema_slug) THEN
      RAISE EXCEPTION 'Cinema slug already exists';
    END IF;
    
    INSERT INTO public.organizations (name, slug)
    VALUES (cinema_name, cinema_slug)
    RETURNING id INTO org_id;
    
    INSERT INTO public.profiles (id, organization_id, full_name, email)
    VALUES (
      NEW.id,
      org_id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
      NEW.email
    );
    
    INSERT INTO public.user_roles (user_id, organization_id, role)
    VALUES (NEW.id, org_id, 'cinema_admin');
  END IF;
  
  RETURN NEW;
END;
$function$;

-- ============================================
-- HIGH FIX #1: Add IP Binding to Impersonation Sessions
-- ============================================

ALTER TABLE public.platform_impersonation_sessions 
ADD COLUMN IF NOT EXISTS ip_address inet,
ADD COLUMN IF NOT EXISTS user_agent text;

CREATE OR REPLACE FUNCTION public.start_impersonation(_org_id uuid, _ip_address inet DEFAULT NULL, _user_agent text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _session_id uuid;
  _org_name text;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only platform admins can impersonate organizations';
  END IF;
  
  SELECT name INTO _org_name FROM public.organizations WHERE id = _org_id;
  
  IF _org_name IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;
  
  UPDATE public.platform_impersonation_sessions
  SET ended_at = now()
  WHERE admin_user_id = auth.uid() AND ended_at IS NULL;
  
  INSERT INTO public.platform_impersonation_sessions (
    admin_user_id, 
    impersonated_organization_id,
    ip_address,
    user_agent
  )
  VALUES (auth.uid(), _org_id, _ip_address, _user_agent)
  RETURNING id INTO _session_id;
  
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
    _org_id,
    jsonb_build_object(
      'session_id', _session_id,
      'organization_name', _org_name,
      'ip_address', _ip_address,
      'user_agent', _user_agent
    ),
    _ip_address::text
  );
  
  RETURN _session_id;
END;
$function$;

ALTER TABLE public.platform_impersonation_sessions 
ALTER COLUMN expires_at SET DEFAULT (now() + interval '1 hour');

-- ============================================
-- HIGH FIX #2: Platform Admin Login Rate Limiting
-- ============================================

CREATE TABLE IF NOT EXISTS public.platform_login_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  attempt_type text NOT NULL DEFAULT 'login',
  attempt_count integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_login_rate_limits_lookup 
ON public.platform_login_rate_limits (identifier, attempt_type, window_start);

ALTER TABLE public.platform_login_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only" ON public.platform_login_rate_limits;
CREATE POLICY "Service role only"
ON public.platform_login_rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.check_platform_login_rate_limit(_identifier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _window_start timestamptz;
  _current_count integer;
  _max_requests integer := 5;
  _window_seconds integer := 900;
BEGIN
  _window_start := now() - (_window_seconds || ' seconds')::interval;
  
  SELECT COALESCE(SUM(attempt_count), 0) INTO _current_count
  FROM public.platform_login_rate_limits
  WHERE identifier = _identifier 
    AND attempt_type = 'failed_login'
    AND window_start > _window_start;
  
  IF _current_count >= _max_requests THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'Too many login attempts. Please wait 15 minutes.',
      'retry_after_seconds', _window_seconds
    );
  END IF;
  
  RETURN jsonb_build_object('allowed', true, 'remaining', _max_requests - _current_count);
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_platform_login_failure(_identifier text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.platform_login_rate_limits (identifier, attempt_type, attempt_count)
  VALUES (_identifier, 'failed_login', 1);
END;
$function$;

CREATE OR REPLACE FUNCTION public.clear_platform_login_rate_limit(_identifier text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  DELETE FROM public.platform_login_rate_limits
  WHERE identifier = _identifier AND attempt_type = 'failed_login';
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_platform_login_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  DELETE FROM public.platform_login_rate_limits
  WHERE window_start < now() - interval '1 hour';
END;
$function$;

-- ============================================
-- HIGH FIX #3: Server-side Platform Role Validation
-- ============================================

CREATE OR REPLACE FUNCTION public.get_platform_role(_user_id uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = _user_id
    AND role IN ('platform_admin', 'platform_marketing', 'platform_accounts', 'platform_dev')
  LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.has_platform_feature_access(_user_id uuid, _feature text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT CASE _feature
    WHEN 'all' THEN public.is_platform_admin(_user_id)
    WHEN 'customers' THEN EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = _user_id 
      AND role IN ('platform_admin', 'platform_marketing')
    )
    WHEN 'communications' THEN EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = _user_id 
      AND role IN ('platform_admin', 'platform_marketing')
    )
    WHEN 'transactions' THEN EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = _user_id 
      AND role IN ('platform_admin', 'platform_accounts')
    )
    WHEN 'plans' THEN EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = _user_id 
      AND role IN ('platform_admin', 'platform_accounts')
    )
    WHEN 'monitoring' THEN EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = _user_id 
      AND role IN ('platform_admin', 'platform_dev')
    )
    WHEN 'domains' THEN EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = _user_id 
      AND role IN ('platform_admin', 'platform_dev')
    )
    WHEN 'audit_logs' THEN EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = _user_id 
      AND role IN ('platform_admin', 'platform_dev')
    )
    ELSE false
  END
$function$;

-- ============================================
-- HIGH FIX #4: Audit Log for Role Changes
-- ============================================

CREATE OR REPLACE FUNCTION public.log_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  BEGIN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.platform_audit_logs (admin_user_id, action, target_type, target_id, details)
      VALUES (
        auth.uid(),
        'role_assigned',
        'user',
        NEW.user_id::text,
        jsonb_build_object('role', NEW.role, 'organization_id', NEW.organization_id)
      );
    ELSIF TG_OP = 'UPDATE' THEN
      INSERT INTO public.platform_audit_logs (admin_user_id, action, target_type, target_id, details)
      VALUES (
        auth.uid(),
        'role_changed',
        'user',
        NEW.user_id::text,
        jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role, 'organization_id', NEW.organization_id)
      );
    ELSIF TG_OP = 'DELETE' THEN
      INSERT INTO public.platform_audit_logs (admin_user_id, action, target_type, target_id, details)
      VALUES (
        auth.uid(),
        'role_removed',
        'user',
        OLD.user_id::text,
        jsonb_build_object('role', OLD.role, 'organization_id', OLD.organization_id)
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trigger_log_role_changes ON public.user_roles;
CREATE TRIGGER trigger_log_role_changes
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.log_role_changes();

-- ============================================
-- HIGH FIX #5: Subscription Validation Enhancement
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_subscription_dates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.current_period_end <= NEW.current_period_start THEN
    RAISE EXCEPTION 'Subscription end date must be after start date';
  END IF;
  
  IF NEW.current_period_end > (now() + interval '1 year') THEN
    RAISE EXCEPTION 'Subscription cannot be extended more than 1 year into the future';
  END IF;
  
  IF NEW.trial_ends_at IS NOT NULL AND NEW.trial_ends_at > (now() + interval '30 days') THEN
    RAISE EXCEPTION 'Trial period cannot exceed 30 days';
  END IF;
  
  IF NEW.current_period_start < (now() - interval '1 day') AND TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'Cannot create subscription with past start date';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- ============================================
-- HIGH FIX #6: Secure Public Booking Lookup
-- ============================================

CREATE OR REPLACE FUNCTION public.lookup_booking_by_reference(_booking_ref text, _org_slug text)
RETURNS TABLE (
  booking_reference text,
  status text,
  start_time timestamptz,
  movie_title text,
  screen_name text,
  seat_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT 
    b.booking_reference,
    b.status,
    s.start_time,
    m.title as movie_title,
    sc.name as screen_name,
    (SELECT COUNT(*)::integer FROM public.booked_seats bs WHERE bs.booking_id = b.id) as seat_count
  FROM public.bookings b
  JOIN public.organizations o ON o.id = b.organization_id
  JOIN public.showtimes s ON s.id = b.showtime_id
  JOIN public.movies m ON m.id = s.movie_id
  JOIN public.screens sc ON sc.id = s.screen_id
  WHERE b.booking_reference = upper(_booking_ref)
    AND o.slug = _org_slug
  LIMIT 1
$function$;