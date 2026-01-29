-- Fix public (anon) permission errors caused by RLS policies referencing organizations.suspended_at
-- We grant SELECT on only the needed column, not full table access.
GRANT SELECT (suspended_at) ON TABLE public.organizations TO anon;