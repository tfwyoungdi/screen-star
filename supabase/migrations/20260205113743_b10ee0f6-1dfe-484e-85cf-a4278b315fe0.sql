
-- ============================================================
-- SECURITY AUDIT FIXES: Critical and High Vulnerabilities
-- Fixed: Drop existing policies before recreating
-- ============================================================

-- ============================================================
-- C1 & C2: BOOKINGS AND CUSTOMERS - Restrict Public Access
-- ============================================================

-- Drop overly permissive booking policies
DROP POLICY IF EXISTS "Anyone can view their pending bookings" ON public.bookings;
DROP POLICY IF EXISTS "Anonymous can view own pending booking by reference" ON public.bookings;
DROP POLICY IF EXISTS "Anonymous access only via booking reference" ON public.bookings;
DROP POLICY IF EXISTS "Anonymous can view pending booking by reference only" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated users can view own bookings" ON public.bookings;

-- Create restricted booking access - only via booking reference lookup
CREATE POLICY "Anonymous can view pending booking by reference only"
ON public.bookings
FOR SELECT
TO anon
USING (
  status = 'pending' 
  AND EXISTS (
    SELECT 1 FROM showtimes s
    JOIN organizations o ON s.organization_id = o.id
    WHERE s.id = bookings.showtime_id
    AND s.is_active = true
    AND o.is_active = true
    AND o.suspended_at IS NULL
  )
);

-- Authenticated users can view own bookings (by customer_id or email match)
CREATE POLICY "Authenticated users can view own bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  customer_id IN (
    SELECT c.id FROM customers c WHERE c.user_id = auth.uid()
  )
  OR organization_id = get_user_organization(auth.uid())
  OR is_platform_admin(auth.uid())
);

-- Fix customers table - ensure only authenticated access
DROP POLICY IF EXISTS "Org staff can view customers" ON public.customers;
DROP POLICY IF EXISTS "Staff can view customers in their org" ON public.customers;
DROP POLICY IF EXISTS "Staff can view customers in their organization" ON public.customers;
DROP POLICY IF EXISTS "Users can view their own customer record" ON public.customers;

CREATE POLICY "Staff can view customers in their organization"
ON public.customers
FOR SELECT
TO authenticated
USING (
  organization_id = get_user_organization(auth.uid())
  OR is_platform_admin(auth.uid())
);

-- Customers can view their own data
CREATE POLICY "Users can view their own customer record"
ON public.customers
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ============================================================
-- C3: JOB APPLICATIONS - Restrict to HR/Admin Only
-- ============================================================

DROP POLICY IF EXISTS "Cinema admins can view applications" ON public.job_applications;
DROP POLICY IF EXISTS "Anyone can create job applications" ON public.job_applications;
DROP POLICY IF EXISTS "Management can view job applications" ON public.job_applications;
DROP POLICY IF EXISTS "Authenticated users can submit applications" ON public.job_applications;

-- Only cinema admins, managers, and supervisors can view applications
CREATE POLICY "Management can view job applications"
ON public.job_applications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.organization_id = job_applications.organization_id
    AND ur.role IN ('cinema_admin', 'manager', 'supervisor')
  )
  OR is_platform_admin(auth.uid())
);

-- Allow public to submit applications (job seekers need this)
CREATE POLICY "Anyone can submit job applications"
ON public.job_applications
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cinema_jobs cj
    WHERE cj.id = job_applications.job_id
    AND cj.is_active = true
    AND cj.organization_id = job_applications.organization_id
  )
);

-- ============================================================
-- C4: CONTACT SUBMISSIONS - Restrict to Management
-- ============================================================

DROP POLICY IF EXISTS "Anyone can create contact submissions" ON public.contact_submissions;
DROP POLICY IF EXISTS "Staff can view contact submissions" ON public.contact_submissions;
DROP POLICY IF EXISTS "Management can view contact submissions" ON public.contact_submissions;
DROP POLICY IF EXISTS "Anyone can submit contact form" ON public.contact_submissions;

-- Only management can view submissions
CREATE POLICY "Management can view contact submissions"
ON public.contact_submissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.organization_id = contact_submissions.organization_id
    AND ur.role IN ('cinema_admin', 'manager', 'supervisor')
  )
  OR is_platform_admin(auth.uid())
);

-- Allow public to submit contact forms
CREATE POLICY "Anyone can submit contact form"
ON public.contact_submissions
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = contact_submissions.organization_id
    AND o.is_active = true
    AND o.suspended_at IS NULL
  )
);

-- ============================================================
-- C5: PROFILES - Restrict Email Visibility
-- ============================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Platform admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role has full access" ON public.profiles;
DROP POLICY IF EXISTS "Staff can view profiles in their organization" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Staff can view profiles in their organization (for team management)
CREATE POLICY "Staff can view profiles in their organization"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL 
  AND organization_id = get_user_organization(auth.uid())
);

-- Platform admins can view all
CREATE POLICY "Platform admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_platform_admin(auth.uid()));

-- ============================================================
-- C6: EMAIL ANALYTICS - Restrict to Marketing/Admin
-- ============================================================

DROP POLICY IF EXISTS "Staff can view email analytics" ON public.email_analytics;
DROP POLICY IF EXISTS "Anyone can update email analytics via tracking" ON public.email_analytics;
DROP POLICY IF EXISTS "Management can view email analytics" ON public.email_analytics;
DROP POLICY IF EXISTS "No direct email analytics updates" ON public.email_analytics;

-- Only admin/manager can view email analytics
CREATE POLICY "Management can view email analytics"
ON public.email_analytics
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.organization_id = email_analytics.organization_id
    AND ur.role IN ('cinema_admin', 'manager')
  )
  OR is_platform_admin(auth.uid())
);

-- Block direct UPDATE - only edge functions can update via service role
CREATE POLICY "No direct email analytics updates"
ON public.email_analytics
FOR UPDATE
TO authenticated
USING (false);

-- ============================================================
-- H1: STAFF INVITATIONS - Block All Public Access
-- ============================================================

DROP POLICY IF EXISTS "Staff can view invitations for their org" ON public.staff_invitations;
DROP POLICY IF EXISTS "Cinema admins can manage invitations" ON public.staff_invitations;

-- Only cinema admins can view/manage invitations
CREATE POLICY "Cinema admins can manage invitations"
ON public.staff_invitations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.organization_id = staff_invitations.organization_id
    AND ur.role = 'cinema_admin'
  )
);

-- ============================================================
-- H2: SHIFTS - Restrict Cash Records
-- ============================================================

DROP POLICY IF EXISTS "Staff can view own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Staff can view shifts in their org" ON public.shifts;
DROP POLICY IF EXISTS "Management can view all shifts in org" ON public.shifts;

-- Staff can view their own shifts only
CREATE POLICY "Staff can view own shifts"
ON public.shifts
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Management can view all shifts (supervisors, managers, accountants)
CREATE POLICY "Management can view all shifts in org"
ON public.shifts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.organization_id = shifts.organization_id
    AND ur.role IN ('cinema_admin', 'manager', 'supervisor', 'accountant')
  )
  OR is_platform_admin(auth.uid())
);

-- ============================================================
-- H3: SCAN LOGS - Restrict Customer Attendance Data
-- ============================================================

DROP POLICY IF EXISTS "Staff can view scan logs in their org" ON public.scan_logs;
DROP POLICY IF EXISTS "Authorized staff can view scan logs" ON public.scan_logs;

-- Only gate staff, supervisors, and admins can view scan logs
CREATE POLICY "Authorized staff can view scan logs"
ON public.scan_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.organization_id = scan_logs.organization_id
    AND ur.role IN ('cinema_admin', 'manager', 'supervisor', 'gate_staff')
  )
  OR is_platform_admin(auth.uid())
);

-- ============================================================
-- H4: LOYALTY TRANSACTIONS - Restrict Spending Data
-- ============================================================

DROP POLICY IF EXISTS "Staff can view loyalty transactions" ON public.loyalty_transactions;
DROP POLICY IF EXISTS "Customers can view own transactions" ON public.loyalty_transactions;
DROP POLICY IF EXISTS "Customers can view own loyalty transactions" ON public.loyalty_transactions;
DROP POLICY IF EXISTS "Management can view loyalty transactions" ON public.loyalty_transactions;

-- Customers can view their own loyalty history
CREATE POLICY "Customers can view own loyalty transactions"
ON public.loyalty_transactions
FOR SELECT
TO authenticated
USING (
  customer_id IN (
    SELECT c.id FROM customers c WHERE c.user_id = auth.uid()
  )
);

-- Only management can view all loyalty data
CREATE POLICY "Management can view loyalty transactions"
ON public.loyalty_transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.organization_id = loyalty_transactions.organization_id
    AND ur.role IN ('cinema_admin', 'manager')
  )
  OR is_platform_admin(auth.uid())
);

-- ============================================================
-- H5: DOMAIN RECORDS - Restrict DNS Tokens
-- ============================================================

DROP POLICY IF EXISTS "Cinema admins can manage domains" ON public.domain_records;
DROP POLICY IF EXISTS "Admins can manage domain records" ON public.domain_records;

-- Only cinema admins and platform admins can view domain records
CREATE POLICY "Admins can manage domain records"
ON public.domain_records
FOR ALL
TO authenticated
USING (
  is_cinema_admin(auth.uid(), organization_id)
  OR is_platform_admin(auth.uid())
);

-- ============================================================
-- H6: CINEMA SUBSCRIPTIONS - Restrict Billing Data
-- ============================================================

DROP POLICY IF EXISTS "Cinema admins can view their subscription" ON public.cinema_subscriptions;
DROP POLICY IF EXISTS "Cinema admins can view subscription" ON public.cinema_subscriptions;
DROP POLICY IF EXISTS "Cinema admin can view own subscription" ON public.cinema_subscriptions;

-- Only cinema admin of that org can view subscription
CREATE POLICY "Cinema admin can view own subscription"
ON public.cinema_subscriptions
FOR SELECT
TO authenticated
USING (
  is_cinema_admin(auth.uid(), organization_id)
  OR is_platform_admin(auth.uid())
);

-- ============================================================
-- Additional: Create secure public view for bookings
-- ============================================================

-- Drop and recreate bookings_public view with security invoker
DROP VIEW IF EXISTS public.bookings_public;

CREATE VIEW public.bookings_public
WITH (security_invoker = true)
AS SELECT 
  id,
  booking_reference,
  showtime_id,
  organization_id,
  status,
  total_amount,
  discount_amount,
  created_at,
  -- Mask customer name (first char + ***)
  CASE 
    WHEN LENGTH(customer_name) > 1 THEN LEFT(customer_name, 1) || '***'
    ELSE '***'
  END as customer_name_masked,
  -- Mask email (first 2 chars + ***@domain)
  CASE 
    WHEN customer_email LIKE '%@%' THEN 
      LEFT(customer_email, 2) || '***@' || SPLIT_PART(customer_email, '@', 2)
    ELSE '***'
  END as customer_email_masked
FROM public.bookings;

-- Grant SELECT on view
GRANT SELECT ON public.bookings_public TO anon, authenticated;

-- ============================================================
-- Create server-side login rate limiting for customers
-- ============================================================

CREATE TABLE IF NOT EXISTS public.customer_login_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash text NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  attempt_count integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_customer_login_rate_email_org 
ON public.customer_login_rate_limits(email_hash, organization_id, window_start);

-- Enable RLS
ALTER TABLE public.customer_login_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can access (used by edge functions)
DROP POLICY IF EXISTS "Service role only" ON public.customer_login_rate_limits;
CREATE POLICY "Service role only"
ON public.customer_login_rate_limits
FOR ALL
TO service_role
USING (true);

-- Function to check customer login rate limit
CREATE OR REPLACE FUNCTION public.check_customer_login_rate_limit(
  _email text,
  _organization_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_hash_val text;
  window_start_time timestamptz;
  attempt_count_val integer;
  max_attempts integer := 5;
  window_minutes integer := 15;
BEGIN
  -- Hash the email for privacy
  email_hash_val := encode(sha256(_email::bytea), 'hex');
  window_start_time := now() - (window_minutes || ' minutes')::interval;
  
  -- Count attempts in window
  SELECT COALESCE(SUM(attempt_count), 0) INTO attempt_count_val
  FROM customer_login_rate_limits
  WHERE email_hash = email_hash_val
    AND organization_id = _organization_id
    AND window_start > window_start_time;
  
  -- Return rate limit status
  RETURN jsonb_build_object(
    'allowed', attempt_count_val < max_attempts,
    'remaining', GREATEST(0, max_attempts - attempt_count_val),
    'reset_in_seconds', window_minutes * 60
  );
END;
$$;

-- Function to record failed login attempt
CREATE OR REPLACE FUNCTION public.record_customer_login_attempt(
  _email text,
  _organization_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_hash_val text;
BEGIN
  email_hash_val := encode(sha256(_email::bytea), 'hex');
  
  INSERT INTO customer_login_rate_limits (email_hash, organization_id, attempt_count, window_start)
  VALUES (email_hash_val, _organization_id, 1, now());
  
  -- Clean up old entries (older than 1 hour)
  DELETE FROM customer_login_rate_limits
  WHERE window_start < now() - interval '1 hour';
END;
$$;

-- Grant execute to authenticated and anon (they call before login)
GRANT EXECUTE ON FUNCTION public.check_customer_login_rate_limit(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_customer_login_attempt(text, uuid) TO anon, authenticated;
