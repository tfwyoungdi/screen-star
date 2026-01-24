-- Create a function to check if user is supervisor for an organization
CREATE OR REPLACE FUNCTION public.is_supervisor(user_id uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = $1
    AND user_roles.organization_id = $2
    AND user_roles.role = 'supervisor'
  );
$$;

-- Add RLS policy to allow supervisors to update daily access code fields
CREATE POLICY "Supervisors can update daily access code"
ON public.organizations
FOR UPDATE
USING (
  is_supervisor(auth.uid(), id) OR is_cinema_admin(auth.uid(), id)
)
WITH CHECK (
  is_supervisor(auth.uid(), id) OR is_cinema_admin(auth.uid(), id)
);