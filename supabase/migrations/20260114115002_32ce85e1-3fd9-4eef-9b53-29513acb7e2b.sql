-- Create platform email analytics table
CREATE TABLE public.platform_email_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_organization_id UUID REFERENCES public.organizations(id),
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  tracking_id TEXT UNIQUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for analytics queries
CREATE INDEX idx_platform_email_analytics_type ON public.platform_email_analytics(email_type);
CREATE INDEX idx_platform_email_analytics_sent_at ON public.platform_email_analytics(sent_at);
CREATE INDEX idx_platform_email_analytics_org ON public.platform_email_analytics(recipient_organization_id);
CREATE INDEX idx_platform_email_analytics_tracking ON public.platform_email_analytics(tracking_id);

-- Enable RLS
ALTER TABLE public.platform_email_analytics ENABLE ROW LEVEL SECURITY;

-- Platform admins can view all analytics
CREATE POLICY "Platform admins can view all email analytics"
ON public.platform_email_analytics
FOR SELECT
USING (public.is_platform_admin());

-- Platform admins can insert analytics
CREATE POLICY "Platform admins can insert email analytics"
ON public.platform_email_analytics
FOR INSERT
WITH CHECK (public.is_platform_admin());

-- Service role can manage all (for edge functions)
CREATE POLICY "Service role can manage email analytics"
ON public.platform_email_analytics
FOR ALL
USING (auth.role() = 'service_role');

-- Create bulk announcement campaigns table
CREATE TABLE public.platform_announcement_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  filter_criteria JSONB DEFAULT '{}'::jsonb,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_announcement_campaigns ENABLE ROW LEVEL SECURITY;

-- Platform admins can manage campaigns
CREATE POLICY "Platform admins can manage announcement campaigns"
ON public.platform_announcement_campaigns
FOR ALL
USING (public.is_platform_admin());

-- Add email_templates column to platform_settings if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'platform_settings' 
    AND column_name = 'email_templates'
  ) THEN
    ALTER TABLE public.platform_settings ADD COLUMN email_templates JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create subscription notifications log
CREATE TABLE public.subscription_notification_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  notification_type TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_subscription_notification_org ON public.subscription_notification_log(organization_id);
CREATE INDEX idx_subscription_notification_type ON public.subscription_notification_log(notification_type, sent_at);

-- Enable RLS
ALTER TABLE public.subscription_notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage notification log"
ON public.subscription_notification_log
FOR ALL
USING (auth.role() = 'service_role');