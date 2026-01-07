-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Allow organization creation during signup" ON public.organizations;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.profiles;
DROP POLICY IF EXISTS "Allow role creation during signup" ON public.user_roles;

-- Create more restrictive policies for organization creation
-- Organizations can only be created by authenticated users
CREATE POLICY "Authenticated users can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Profiles can only be created for the authenticated user's own ID
CREATE POLICY "Users can create their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- User roles can only be created by the user for themselves during signup
-- or by cinema admins for their organization (handled by separate policy)
CREATE POLICY "Users can create their own initial role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());