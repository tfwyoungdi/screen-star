-- Create table for customer email campaigns
CREATE TABLE public.customer_email_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_customer_email_campaigns_org_id ON public.customer_email_campaigns(organization_id);
CREATE INDEX idx_customer_email_campaigns_status ON public.customer_email_campaigns(status);
CREATE INDEX idx_customer_email_campaigns_sent_at ON public.customer_email_campaigns(sent_at);

-- Enable RLS
ALTER TABLE public.customer_email_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their organization's campaigns" 
ON public.customer_email_campaigns 
FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create campaigns for their organization" 
ON public.customer_email_campaigns 
FOR INSERT 
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update their organization's campaigns" 
ON public.customer_email_campaigns 
FOR UPDATE 
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_customer_email_campaigns_updated_at
  BEFORE UPDATE ON public.customer_email_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();