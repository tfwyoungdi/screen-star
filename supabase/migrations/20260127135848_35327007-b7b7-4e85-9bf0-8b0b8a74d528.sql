-- Create scan_logs table to record all ticket scan attempts
CREATE TABLE public.scan_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scanned_by uuid REFERENCES auth.users(id),
  booking_id uuid REFERENCES public.bookings(id),
  booking_reference text NOT NULL,
  customer_name text,
  movie_title text,
  showtime_start text,
  screen_name text,
  seats_info text,
  is_valid boolean NOT NULL,
  result_message text NOT NULL,
  scan_method text NOT NULL DEFAULT 'qr', -- 'qr' or 'manual'
  shift_id uuid REFERENCES public.shifts(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Staff can insert scan logs for their org"
  ON public.scan_logs FOR INSERT
  WITH CHECK (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Staff can view scan logs in their org"
  ON public.scan_logs FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Cinema admins can manage scan logs"
  ON public.scan_logs FOR ALL
  USING (is_cinema_admin(auth.uid(), organization_id));

-- Create index for faster queries
CREATE INDEX idx_scan_logs_org_created ON public.scan_logs(organization_id, created_at DESC);
CREATE INDEX idx_scan_logs_booking_ref ON public.scan_logs(booking_reference);
CREATE INDEX idx_scan_logs_shift ON public.scan_logs(shift_id);