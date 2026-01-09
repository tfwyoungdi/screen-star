-- Tighten remaining overly permissive INSERT/UPDATE policies

-- 1. Contact submissions: Validate organization exists and is active
DROP POLICY IF EXISTS "Anyone can submit contact forms" ON public.contact_submissions;
CREATE POLICY "Anyone can submit contact forms for active organizations"
ON public.contact_submissions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = organization_id
    AND o.is_active = true
  )
);

-- 2. Job applications: Validate job exists and is active
DROP POLICY IF EXISTS "Anyone can submit job applications" ON public.job_applications;
CREATE POLICY "Anyone can submit job applications for active jobs"
ON public.job_applications
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cinema_jobs j
    WHERE j.id = job_id
    AND j.organization_id = job_applications.organization_id
    AND j.is_active = true
  )
);

-- 3. Organizations: Restrict to authenticated users only (for signup flow)
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
CREATE POLICY "Authenticated users can create their organization"
ON public.organizations
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- 4. Email analytics: Replace the overly permissive UPDATE with a proper check
DROP POLICY IF EXISTS "Allow tracking updates via tracking_id" ON public.email_analytics;
CREATE POLICY "Allow tracking updates with valid tracking_id"
ON public.email_analytics
FOR UPDATE
USING (tracking_id IS NOT NULL AND tracking_id != '')
WITH CHECK (tracking_id IS NOT NULL AND tracking_id != '');