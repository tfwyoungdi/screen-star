-- Create combo deals table
CREATE TABLE public.combo_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  original_price NUMERIC NOT NULL,
  combo_price NUMERIC NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create combo deal items junction table
CREATE TABLE public.combo_deal_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  combo_deal_id UUID NOT NULL REFERENCES public.combo_deals(id) ON DELETE CASCADE,
  concession_item_id UUID NOT NULL REFERENCES public.concession_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1
);

-- Create booking combos table to track purchased combos
CREATE TABLE public.booking_combos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  combo_deal_id UUID NOT NULL REFERENCES public.combo_deals(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.combo_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_deal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_combos ENABLE ROW LEVEL SECURITY;

-- RLS policies for combo_deals
CREATE POLICY "Anyone can view active combo deals" ON public.combo_deals
  FOR SELECT USING (is_active = true);

CREATE POLICY "Staff can view combo deals in their org" ON public.combo_deals
  FOR SELECT USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Cinema admins can manage combo deals" ON public.combo_deals
  FOR ALL USING (is_cinema_admin(auth.uid(), organization_id));

-- RLS policies for combo_deal_items
CREATE POLICY "Anyone can view combo deal items" ON public.combo_deal_items
  FOR SELECT USING (true);

CREATE POLICY "Cinema admins can manage combo deal items" ON public.combo_deal_items
  FOR ALL USING (EXISTS (
    SELECT 1 FROM combo_deals cd 
    WHERE cd.id = combo_deal_items.combo_deal_id 
    AND is_cinema_admin(auth.uid(), cd.organization_id)
  ));

-- RLS policies for booking_combos
CREATE POLICY "Anyone can create booking combos" ON public.booking_combos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can view booking combos in their org" ON public.booking_combos
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM bookings b 
    WHERE b.id = booking_combos.booking_id 
    AND b.organization_id = get_user_organization(auth.uid())
  ));

CREATE POLICY "Cinema admins can manage booking combos" ON public.booking_combos
  FOR ALL USING (EXISTS (
    SELECT 1 FROM bookings b 
    WHERE b.id = booking_combos.booking_id 
    AND is_cinema_admin(auth.uid(), b.organization_id)
  ));

-- Add trigger for updated_at
CREATE TRIGGER update_combo_deals_updated_at
  BEFORE UPDATE ON public.combo_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();