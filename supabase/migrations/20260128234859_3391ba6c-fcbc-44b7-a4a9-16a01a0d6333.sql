-- Create a helper function to check if user is a manager
CREATE OR REPLACE FUNCTION public.is_manager(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role = 'manager'
  )
$$;

-- Drop existing policy and recreate to include managers
DROP POLICY IF EXISTS "Cinema admins can manage movies" ON public.movies;

CREATE POLICY "Cinema admins and managers can manage movies"
ON public.movies
FOR ALL
USING (
  is_cinema_admin(auth.uid(), organization_id) OR 
  is_manager(auth.uid(), organization_id)
)
WITH CHECK (
  is_cinema_admin(auth.uid(), organization_id) OR 
  is_manager(auth.uid(), organization_id)
);