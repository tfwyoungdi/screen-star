-- Add inventory tracking to concession_items
ALTER TABLE public.concession_items
ADD COLUMN stock_quantity INTEGER DEFAULT NULL,
ADD COLUMN low_stock_threshold INTEGER DEFAULT 10,
ADD COLUMN track_inventory BOOLEAN DEFAULT false;

-- Add time-based restrictions to combo_deals
ALTER TABLE public.combo_deals
ADD COLUMN available_from TIME DEFAULT NULL,
ADD COLUMN available_until TIME DEFAULT NULL,
ADD COLUMN available_days INTEGER[] DEFAULT NULL;