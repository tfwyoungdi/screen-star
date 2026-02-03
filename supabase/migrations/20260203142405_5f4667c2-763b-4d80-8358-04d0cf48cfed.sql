
-- Remove cinema_admin role from the main platform admin
DELETE FROM public.user_roles 
WHERE user_id = '412799c5-8d90-4a0a-aefc-46b3433fd6d1'
  AND role = 'cinema_admin';

-- Clean up duplicate platform_admin entries (keep only one)
DELETE FROM public.user_roles 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, role ORDER BY created_at) as rn
    FROM public.user_roles
    WHERE user_id = '412799c5-8d90-4a0a-aefc-46b3433fd6d1'
      AND role = 'platform_admin'
  ) t
  WHERE rn > 1
);
