-- Add RLS policy to allow public access to organizations by slug (for public booking site)
CREATE POLICY "Anyone can view active organizations by slug" 
ON public.organizations 
FOR SELECT 
USING (is_active = true);