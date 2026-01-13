-- Add column to store custom SLA email template
ALTER TABLE public.platform_settings
ADD COLUMN IF NOT EXISTS sla_email_subject text DEFAULT '🚨 SLA Breach: {{priority}} Priority Ticket from {{cinema_name}}',
ADD COLUMN IF NOT EXISTS sla_email_html_body text;