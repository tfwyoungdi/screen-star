-- Create page_views table to track public website visits
CREATE TABLE public.page_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  page_path text NOT NULL,
  visitor_id text,
  user_agent text,
  referrer text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_page_views_org_created ON public.page_views(organization_id, created_at DESC);
CREATE INDEX idx_page_views_page_path ON public.page_views(page_path);

-- Enable RLS
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert page views (for tracking)
CREATE POLICY "Anyone can create page views"
ON public.page_views
FOR INSERT
WITH CHECK (true);

-- Staff can view page views in their organization
CREATE POLICY "Staff can view page views in their org"
ON public.page_views
FOR SELECT
USING (organization_id = get_user_organization(auth.uid()));

-- Cinema admins can manage page views
CREATE POLICY "Cinema admins can manage page views"
ON public.page_views
FOR ALL
USING (is_cinema_admin(auth.uid(), organization_id));