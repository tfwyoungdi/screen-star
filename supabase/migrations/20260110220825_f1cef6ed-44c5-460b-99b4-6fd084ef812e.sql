-- Make organization_id nullable for platform_admin roles
ALTER TABLE public.user_roles ALTER COLUMN organization_id DROP NOT NULL;