-- Create table for platform customer email templates
CREATE TABLE public.platform_customer_email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for platform customer email campaigns
CREATE TABLE public.platform_customer_email_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  filter_criteria JSONB DEFAULT '{}',
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_customer_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_customer_email_campaigns ENABLE ROW LEVEL SECURITY;

-- Create policies for platform admins only
CREATE POLICY "Platform admins can manage customer email templates"
ON public.platform_customer_email_templates
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'platform_admin'
  )
);

CREATE POLICY "Platform admins can manage customer email campaigns"
ON public.platform_customer_email_campaigns
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'platform_admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_platform_customer_email_templates_updated_at
BEFORE UPDATE ON public.platform_customer_email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_customer_email_campaigns_updated_at
BEFORE UPDATE ON public.platform_customer_email_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();