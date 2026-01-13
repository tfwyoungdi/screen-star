-- Allow public lookup of loyalty settings for booking flow
CREATE POLICY "Anyone can view enabled loyalty settings"
  ON public.loyalty_settings FOR SELECT
  USING (is_enabled = true);

-- Allow public insert for loyalty transactions during booking (for redemptions)
CREATE POLICY "Anyone can create redemption transactions with valid booking"
  ON public.loyalty_transactions FOR INSERT
  WITH CHECK (
    transaction_type = 'redeemed' AND
    EXISTS (
      SELECT 1 FROM bookings b 
      WHERE b.id = loyalty_transactions.booking_id 
      AND b.organization_id = loyalty_transactions.organization_id
    )
  );