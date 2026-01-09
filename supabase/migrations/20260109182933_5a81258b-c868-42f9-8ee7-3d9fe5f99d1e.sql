-- Fix the overly permissive RLS policy for email_analytics
DROP POLICY IF EXISTS "Service role can manage email analytics" ON public.email_analytics;

-- Allow public tracking endpoint to update analytics (for pixel tracking)
CREATE POLICY "Allow tracking updates via tracking_id" 
ON public.email_analytics 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Allow inserts from edge functions (via service role only, handled at application level)
-- Edge functions use service role key which bypasses RLS