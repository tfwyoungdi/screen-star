-- Add fields to organizations for About page content
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS mission_text TEXT,
ADD COLUMN IF NOT EXISTS values_json JSONB DEFAULT '[]'::jsonb;

-- Create table for cinema job listings
CREATE TABLE public.cinema_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'On-site',
  type TEXT NOT NULL DEFAULT 'Full-time',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on cinema_jobs
ALTER TABLE public.cinema_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for cinema_jobs
CREATE POLICY "Anyone can view active jobs" 
ON public.cinema_jobs 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Cinema admins can manage jobs" 
ON public.cinema_jobs 
FOR ALL 
USING (is_cinema_admin(auth.uid(), organization_id));

CREATE POLICY "Staff can view jobs in their org" 
ON public.cinema_jobs 
FOR SELECT 
USING (organization_id = get_user_organization(auth.uid()));

-- Create table for contact form submissions
CREATE TABLE public.contact_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on contact_submissions
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for contact_submissions
CREATE POLICY "Anyone can submit contact forms" 
ON public.contact_submissions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Cinema admins can manage contact submissions" 
ON public.contact_submissions 
FOR ALL 
USING (is_cinema_admin(auth.uid(), organization_id));

CREATE POLICY "Staff can view contact submissions in their org" 
ON public.contact_submissions 
FOR SELECT 
USING (organization_id = get_user_organization(auth.uid()));

-- Create updated_at trigger for cinema_jobs
CREATE TRIGGER update_cinema_jobs_updated_at
BEFORE UPDATE ON public.cinema_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();