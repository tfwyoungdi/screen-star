-- =============================================================================
-- TIGHTEN RLS POLICIES: Scope to 'authenticated' role only where appropriate
-- This prevents any theoretical edge cases where anonymous access could occur
-- =============================================================================

-- PROFILES TABLE
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Cinema admins can view staff profiles in their org" ON public.profiles;

CREATE POLICY "Authenticated users can view their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Staff can view profiles in their organization"
  ON public.profiles FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR is_platform_admin(auth.uid()));

-- SCAN_LOGS TABLE (if exists)
DROP POLICY IF EXISTS "Staff can view scan logs in their org" ON public.scan_logs;
DROP POLICY IF EXISTS "Staff can create scan logs in their org" ON public.scan_logs;

CREATE POLICY "Authenticated staff can view scan logs"
  ON public.scan_logs FOR SELECT TO authenticated
  USING ((organization_id = get_user_organization(auth.uid())) OR is_platform_admin(auth.uid()));

CREATE POLICY "Authenticated staff can create scan logs"
  ON public.scan_logs FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization(auth.uid()));

-- UPDATE existing policies to use 'authenticated' role
-- For tables that already have policies but grant to {public}

-- PROFILES: Update policy (if needed for updates)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Authenticated users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- USER_ROLES: Ensure only authenticated users can see roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Authenticated users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    OR is_cinema_admin(auth.uid(), organization_id) 
    OR is_platform_admin(auth.uid())
  );

-- SHIFTS: Ensure only authenticated staff access
DROP POLICY IF EXISTS "Staff can view their organization shifts" ON public.shifts;
-- Keep the existing better policy "Staff can view their own shifts"

-- DOMAIN_RECORDS: Already has cinema_admin/platform_admin policies which use auth.uid()

-- LOYALTY_TRANSACTIONS: Ensure authentication required
DROP POLICY IF EXISTS "Cinema staff can view transactions" ON public.loyalty_transactions;
CREATE POLICY "Authenticated staff can view loyalty transactions"
  ON public.loyalty_transactions FOR SELECT TO authenticated
  USING ((organization_id = get_user_organization(auth.uid())) OR is_platform_admin(auth.uid()));

-- PAGE_VIEWS: Require authentication for SELECT
DROP POLICY IF EXISTS "Staff can view page views in their org" ON public.page_views;
CREATE POLICY "Authenticated staff can view page views"
  ON public.page_views FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()));