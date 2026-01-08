-- Update the last 2 rows of each screen to be VIP seats
UPDATE seat_layouts sl
SET seat_type = 'vip'
FROM screens s
WHERE sl.screen_id = s.id
  AND sl.seat_type = 'standard'
  AND sl.row_label IN (
    -- Get the last 2 row labels based on the screen's row count
    chr(65 + s.rows - 1),  -- Last row (e.g., 'J' for 10 rows)
    chr(65 + s.rows - 2)   -- Second to last row (e.g., 'I' for 10 rows)
  );