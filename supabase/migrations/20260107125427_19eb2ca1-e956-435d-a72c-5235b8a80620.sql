-- Drop the overly permissive policy and replace with a more specific one
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.staff_invitations;

-- Create a function to validate invitation token (security definer for public access)
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(invitation_token TEXT)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  organization_name TEXT,
  email TEXT,
  role public.app_role,
  expires_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    si.id,
    si.organization_id,
    o.name as organization_name,
    si.email,
    si.role,
    si.expires_at,
    si.accepted_at
  FROM public.staff_invitations si
  JOIN public.organizations o ON o.id = si.organization_id
  WHERE si.token = invitation_token
    AND si.expires_at > now()
    AND si.accepted_at IS NULL;
$$;