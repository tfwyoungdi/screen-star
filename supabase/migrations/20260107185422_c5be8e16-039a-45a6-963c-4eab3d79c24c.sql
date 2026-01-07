-- Create inventory history table to track all stock changes
CREATE TABLE public.inventory_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concession_item_id UUID REFERENCES public.concession_items(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  previous_quantity INTEGER,
  new_quantity INTEGER NOT NULL,
  change_amount INTEGER NOT NULL,
  change_type TEXT NOT NULL, -- 'restock', 'sale', 'adjustment', 'initial'
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.inventory_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Cinema admins can manage inventory history"
ON public.inventory_history
FOR ALL
USING (is_cinema_admin(auth.uid(), organization_id));

CREATE POLICY "Staff can view inventory history in their org"
ON public.inventory_history
FOR SELECT
USING (organization_id = get_user_organization(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_inventory_history_item ON public.inventory_history(concession_item_id);
CREATE INDEX idx_inventory_history_created_at ON public.inventory_history(created_at DESC);

-- Function to log inventory changes
CREATE OR REPLACE FUNCTION public.log_inventory_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if track_inventory is true and stock_quantity changed
  IF NEW.track_inventory = true AND 
     (OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity) THEN
    INSERT INTO public.inventory_history (
      concession_item_id,
      organization_id,
      previous_quantity,
      new_quantity,
      change_amount,
      change_type,
      notes
    ) VALUES (
      NEW.id,
      NEW.organization_id,
      OLD.stock_quantity,
      NEW.stock_quantity,
      COALESCE(NEW.stock_quantity, 0) - COALESCE(OLD.stock_quantity, 0),
      CASE 
        WHEN OLD.stock_quantity IS NULL THEN 'initial'
        WHEN NEW.stock_quantity > COALESCE(OLD.stock_quantity, 0) THEN 'restock'
        WHEN NEW.stock_quantity < COALESCE(OLD.stock_quantity, 0) THEN 'sale'
        ELSE 'adjustment'
      END,
      NULL
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on concession_items
CREATE TRIGGER trigger_log_inventory_change
  AFTER UPDATE ON public.concession_items
  FOR EACH ROW
  EXECUTE FUNCTION public.log_inventory_change();