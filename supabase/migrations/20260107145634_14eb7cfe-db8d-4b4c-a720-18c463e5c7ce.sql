-- Manually create the organization, profile, and role for the existing user whose trigger failed

-- Create organization for Skycinemas
INSERT INTO public.organizations (id, name, slug)
VALUES (
  gen_random_uuid(),
  'Skycinemas',
  'skycinemas'
);

-- Create profile for the user
INSERT INTO public.profiles (id, organization_id, full_name, email)
SELECT 
  'e927ba21-ee98-4e0d-90a9-6775bb6fbfc7'::uuid,
  o.id,
  'Youngdi',
  'tfwyoungdi@gmail.com'
FROM public.organizations o
WHERE o.slug = 'skycinemas';

-- Assign cinema_admin role
INSERT INTO public.user_roles (user_id, organization_id, role)
SELECT 
  'e927ba21-ee98-4e0d-90a9-6775bb6fbfc7'::uuid,
  o.id,
  'cinema_admin'
FROM public.organizations o
WHERE o.slug = 'skycinemas';