
-- SECURITY: Restrict customer data to management roles only (not gate_staff/box_office)
DROP POLICY IF EXISTS "Staff can view customers in their organization" ON public.customers;

CREATE POLICY "Management can view customers in their organization"
ON public.customers
FOR SELECT
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = customers.organization_id
      AND ur.role IN ('cinema_admin', 'manager', 'accountant', 'supervisor')
  ))
  OR is_platform_admin(auth.uid())
);

-- SECURITY: Remove overly-broad job applications policy (Management policy already exists)
DROP POLICY IF EXISTS "Staff can view job applications in their org" ON public.job_applications;
