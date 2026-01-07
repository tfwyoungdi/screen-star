-- Function to deduct inventory when booking is paid
CREATE OR REPLACE FUNCTION public.deduct_inventory_on_booking_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  concession_record RECORD;
  combo_record RECORD;
  item_record RECORD;
  low_stock_items JSONB := '[]'::jsonb;
  org_email TEXT;
BEGIN
  -- Only trigger when status changes to 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    
    -- Deduct inventory for individual concession items
    FOR concession_record IN 
      SELECT bc.concession_item_id, bc.quantity
      FROM public.booking_concessions bc
      WHERE bc.booking_id = NEW.id
    LOOP
      UPDATE public.concession_items
      SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - concession_record.quantity),
          updated_at = now()
      WHERE id = concession_record.concession_item_id
        AND track_inventory = true;
    END LOOP;
    
    -- Deduct inventory for combo deal items
    FOR combo_record IN 
      SELECT bcm.combo_deal_id, bcm.quantity as combo_qty
      FROM public.booking_combos bcm
      WHERE bcm.booking_id = NEW.id
    LOOP
      FOR item_record IN
        SELECT cdi.concession_item_id, cdi.quantity
        FROM public.combo_deal_items cdi
        WHERE cdi.combo_deal_id = combo_record.combo_deal_id
      LOOP
        UPDATE public.concession_items
        SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - (item_record.quantity * combo_record.combo_qty)),
            updated_at = now()
        WHERE id = item_record.concession_item_id
          AND track_inventory = true;
      END LOOP;
    END LOOP;
    
    -- Check for low stock items in this organization
    SELECT jsonb_agg(jsonb_build_object(
      'id', ci.id,
      'name', ci.name,
      'stock_quantity', ci.stock_quantity,
      'low_stock_threshold', ci.low_stock_threshold
    ))
    INTO low_stock_items
    FROM public.concession_items ci
    WHERE ci.organization_id = NEW.organization_id
      AND ci.track_inventory = true
      AND ci.stock_quantity IS NOT NULL
      AND ci.low_stock_threshold IS NOT NULL
      AND ci.stock_quantity <= ci.low_stock_threshold;
    
    -- Get organization email for notification
    IF low_stock_items IS NOT NULL AND jsonb_array_length(low_stock_items) > 0 THEN
      SELECT contact_email INTO org_email
      FROM public.organizations
      WHERE id = NEW.organization_id;
      
      -- Insert notification record for edge function to process
      INSERT INTO public.low_stock_notifications (organization_id, items, notified_email)
      VALUES (NEW.organization_id, low_stock_items, org_email);
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create low stock notifications table
CREATE TABLE IF NOT EXISTS public.low_stock_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  items JSONB NOT NULL,
  notified_email TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.low_stock_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policy for cinema admins
CREATE POLICY "Cinema admins can view their notifications"
ON public.low_stock_notifications
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Create trigger on bookings
DROP TRIGGER IF EXISTS trigger_deduct_inventory_on_paid ON public.bookings;
CREATE TRIGGER trigger_deduct_inventory_on_paid
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_inventory_on_booking_paid();