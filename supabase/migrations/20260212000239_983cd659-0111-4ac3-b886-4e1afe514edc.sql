-- Grant SELECT on organizations table to anon and authenticated roles
GRANT SELECT ON public.organizations TO anon;
GRANT SELECT ON public.organizations TO authenticated;

-- Also grant on the view
GRANT SELECT ON public.organizations_public TO anon;
GRANT SELECT ON public.organizations_public TO authenticated;