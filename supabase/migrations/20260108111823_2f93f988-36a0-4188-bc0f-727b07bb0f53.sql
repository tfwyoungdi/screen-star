-- Create a test booking for ANACONDA sold out simulation
INSERT INTO bookings (
  organization_id,
  showtime_id,
  booking_reference,
  customer_email,
  customer_name,
  total_amount,
  status
) VALUES (
  '8850fe1a-e5d6-4c74-9f8e-4bc08e77182e',
  'bd9309fe-551f-49aa-b14b-409a699403bf', -- First ANACONDA showtime today
  'TEST-SOLDOUT-001',
  'test@example.com',
  'Test Customer',
  1200.00,
  'confirmed'
);

-- Insert 118 booked seats to simulate 98% capacity (sold out)
INSERT INTO booked_seats (booking_id, showtime_id, row_label, seat_number, price, seat_type)
SELECT 
  (SELECT id FROM bookings WHERE booking_reference = 'TEST-SOLDOUT-001'),
  'bd9309fe-551f-49aa-b14b-409a699403bf',
  chr(65 + (n / 12)), -- Row A-J
  (n % 12) + 1,       -- Seat 1-12
  10.00,
  'standard'
FROM generate_series(0, 117) AS n;