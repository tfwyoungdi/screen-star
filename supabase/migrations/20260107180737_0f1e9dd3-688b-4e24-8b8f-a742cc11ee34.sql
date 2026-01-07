-- Create concession_items table for snacks, drinks, etc.
CREATE TABLE public.concession_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  category text NOT NULL DEFAULT 'snacks',
  image_url text,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_concession_items_org ON public.concession_items(organization_id);

-- Enable RLS
ALTER TABLE public.concession_items ENABLE ROW LEVEL SECURITY;

-- Public can view available items
CREATE POLICY "Anyone can view available concession items"
ON public.concession_items
FOR SELECT
USING (is_available = true);

-- Staff can view all items in their org
CREATE POLICY "Staff can view concession items in their org"
ON public.concession_items
FOR SELECT
USING (organization_id = get_user_organization(auth.uid()));

-- Cinema admins can manage items
CREATE POLICY "Cinema admins can manage concession items"
ON public.concession_items
FOR ALL
USING (is_cinema_admin(auth.uid(), organization_id));

-- Create booking_concessions table to link items to bookings
CREATE TABLE public.booking_concessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  concession_item_id uuid NOT NULL REFERENCES public.concession_items(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_booking_concessions_booking ON public.booking_concessions(booking_id);

-- Enable RLS
ALTER TABLE public.booking_concessions ENABLE ROW LEVEL SECURITY;

-- Anyone can create booking concessions (during checkout)
CREATE POLICY "Anyone can create booking concessions"
ON public.booking_concessions
FOR INSERT
WITH CHECK (true);

-- Staff can view booking concessions in their org
CREATE POLICY "Staff can view booking concessions in their org"
ON public.booking_concessions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM bookings b 
  WHERE b.id = booking_concessions.booking_id 
  AND b.organization_id = get_user_organization(auth.uid())
));

-- Cinema admins can manage booking concessions
CREATE POLICY "Cinema admins can manage booking concessions"
ON public.booking_concessions
FOR ALL
USING (EXISTS (
  SELECT 1 FROM bookings b 
  WHERE b.id = booking_concessions.booking_id 
  AND is_cinema_admin(auth.uid(), b.organization_id)
));

-- Add trigger for updated_at on concession_items
CREATE TRIGGER update_concession_items_updated_at
BEFORE UPDATE ON public.concession_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();