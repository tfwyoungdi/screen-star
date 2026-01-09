-- Create email analytics tracking table
CREATE TABLE public.email_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  opened_at TIMESTAMP WITH TIME ZONE,
  opened_count INTEGER DEFAULT 0,
  clicked_at TIMESTAMP WITH TIME ZONE,
  clicked_count INTEGER DEFAULT 0,
  tracking_id TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX idx_email_analytics_org_id ON public.email_analytics(organization_id);
CREATE INDEX idx_email_analytics_tracking_id ON public.email_analytics(tracking_id);
CREATE INDEX idx_email_analytics_email_type ON public.email_analytics(email_type);
CREATE INDEX idx_email_analytics_sent_at ON public.email_analytics(sent_at);

-- Enable Row Level Security
ALTER TABLE public.email_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their organization's email analytics" 
ON public.email_analytics 
FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Service role can manage email analytics" 
ON public.email_analytics 
FOR ALL 
USING (true)
WITH CHECK (true);