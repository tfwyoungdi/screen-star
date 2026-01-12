-- Add SLA settings to platform_settings
ALTER TABLE public.platform_settings
ADD COLUMN IF NOT EXISTS sla_response_time_low INTEGER DEFAULT 72,
ADD COLUMN IF NOT EXISTS sla_response_time_medium INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS sla_response_time_high INTEGER DEFAULT 8,
ADD COLUMN IF NOT EXISTS sla_response_time_urgent INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS sla_escalation_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sla_escalation_email TEXT;

-- Add first_response_at to support_tickets for SLA tracking
ALTER TABLE public.support_tickets
ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN DEFAULT false;