-- Fix staff portal "Portal Not Found" caused by organizations_public view respecting organizations RLS.
-- The view currently has reloptions [security_invoker=true], so anon users see 0 rows.
-- Switch to definer privileges so unauthenticated users can resolve cinema slugs safely.

ALTER VIEW public.organizations_public
SET (security_invoker = false);

COMMENT ON VIEW public.organizations_public IS
'Public organization view used for unauthenticated cinema discovery (e.g., staff login by slug) and public website rendering. Runs with definer privileges to bypass RLS on organizations; excludes secret credential columns.';