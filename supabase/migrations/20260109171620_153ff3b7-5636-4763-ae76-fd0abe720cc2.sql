-- Create email_templates table for customizable templates
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL, -- 'application_confirmation', 'contact_notification'
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, template_type)
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Cinema admins can manage their templates
CREATE POLICY "Cinema admins can manage email templates"
  ON public.email_templates
  FOR ALL
  USING (is_cinema_admin(auth.uid(), organization_id));

-- Staff can view templates in their org
CREATE POLICY "Staff can view email templates in their org"
  ON public.email_templates
  FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();