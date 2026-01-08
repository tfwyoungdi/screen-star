-- Add display_order column to concession_items for drag-and-drop reordering
ALTER TABLE public.concession_items 
ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- Initialize display_order based on existing order
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY category, name) as rn
  FROM public.concession_items
)
UPDATE public.concession_items ci
SET display_order = n.rn
FROM numbered n
WHERE ci.id = n.id;