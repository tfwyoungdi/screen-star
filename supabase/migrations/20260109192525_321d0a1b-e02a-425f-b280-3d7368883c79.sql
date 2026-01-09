-- Create shifts table for tracking cashier shifts
CREATE TABLE public.shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  opening_cash NUMERIC(10,2) NOT NULL DEFAULT 0,
  closing_cash NUMERIC(10,2),
  expected_cash NUMERIC(10,2),
  cash_difference NUMERIC(10,2),
  total_cash_sales NUMERIC(10,2) DEFAULT 0,
  total_card_sales NUMERIC(10,2) DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Staff can view their organization shifts"
ON public.shifts
FOR SELECT
USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Staff can create shifts for their organization"
ON public.shifts
FOR INSERT
WITH CHECK (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Staff can update their own shifts"
ON public.shifts
FOR UPDATE
USING (user_id = auth.uid() AND organization_id = public.get_user_organization(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_shifts_org_user ON public.shifts(organization_id, user_id);
CREATE INDEX idx_shifts_status ON public.shifts(status);
CREATE INDEX idx_shifts_started_at ON public.shifts(started_at DESC);