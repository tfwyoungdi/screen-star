-- ============================================
-- SECURITY FIX 1: Hide sensitive columns from public access
-- ============================================

-- Create a secure view for public organization data (excludes sensitive fields)
CREATE OR REPLACE VIEW public.organizations_public AS 
SELECT 
  id, 
  name, 
  slug, 
  logo_url, 
  primary_color, 
  secondary_color,
  currency,
  about_text,
  mission_text,
  contact_email,
  contact_phone,
  address,
  social_facebook,
  social_instagram,
  social_twitter,
  seo_title,
  seo_description,
  is_active,
  created_at,
  -- Expose payment gateway type but NOT the keys
  payment_gateway,
  payment_gateway_configured,
  payment_gateway_public_key
FROM public.organizations
WHERE is_active = true;

-- Grant access to the public view
GRANT SELECT ON public.organizations_public TO anon;
GRANT SELECT ON public.organizations_public TO authenticated;

-- ============================================
-- SECURITY FIX 2: Create server-side booking validation function
-- ============================================

-- Function to validate and calculate booking totals server-side
CREATE OR REPLACE FUNCTION public.validate_booking_totals(
  p_booking_id uuid,
  p_expected_total numeric,
  p_expected_discount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tickets_total numeric := 0;
  v_concessions_total numeric := 0;
  v_combos_total numeric := 0;
  v_promo_discount numeric := 0;
  v_calculated_total numeric := 0;
  v_promo_code RECORD;
  v_booking RECORD;
  v_result jsonb;
BEGIN
  -- Get booking details
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Booking not found');
  END IF;
  
  -- Calculate tickets total from booked_seats
  SELECT COALESCE(SUM(price), 0) INTO v_tickets_total
  FROM booked_seats
  WHERE booking_id = p_booking_id;
  
  -- Calculate concessions total
  SELECT COALESCE(SUM(unit_price * quantity), 0) INTO v_concessions_total
  FROM booking_concessions
  WHERE booking_id = p_booking_id;
  
  -- Calculate combos total
  SELECT COALESCE(SUM(unit_price * quantity), 0) INTO v_combos_total
  FROM booking_combos
  WHERE booking_id = p_booking_id;
  
  -- Calculate promo discount if applicable
  IF v_booking.promo_code_id IS NOT NULL THEN
    SELECT * INTO v_promo_code FROM promo_codes WHERE id = v_booking.promo_code_id;
    
    IF FOUND THEN
      -- Validate promo is still active and not expired
      IF v_promo_code.is_active = false THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Promo code is no longer active');
      END IF;
      
      IF v_promo_code.valid_until IS NOT NULL AND v_promo_code.valid_until < now() THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Promo code has expired');
      END IF;
      
      -- Check usage limits
      IF v_promo_code.max_uses IS NOT NULL AND v_promo_code.current_uses >= v_promo_code.max_uses THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Promo code usage limit reached');
      END IF;
      
      -- Check minimum purchase
      IF v_promo_code.min_purchase_amount IS NOT NULL AND v_tickets_total < v_promo_code.min_purchase_amount THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Minimum purchase amount not met');
      END IF;
      
      -- Calculate discount
      IF v_promo_code.discount_type = 'percentage' THEN
        v_promo_discount := v_tickets_total * (v_promo_code.discount_value / 100);
      ELSE
        v_promo_discount := LEAST(v_promo_code.discount_value, v_tickets_total);
      END IF;
    END IF;
  END IF;
  
  -- Calculate total
  v_calculated_total := v_tickets_total + v_concessions_total + v_combos_total - v_promo_discount;
  
  -- Validate totals match (allow small floating point differences)
  IF ABS(v_calculated_total - p_expected_total) > 0.01 THEN
    -- Update to correct total
    UPDATE bookings 
    SET total_amount = v_calculated_total, 
        discount_amount = v_promo_discount
    WHERE id = p_booking_id;
    
    RETURN jsonb_build_object(
      'valid', false, 
      'error', 'Total mismatch - corrected',
      'expected', p_expected_total,
      'calculated', v_calculated_total,
      'corrected', true
    );
  END IF;
  
  RETURN jsonb_build_object(
    'valid', true,
    'tickets_total', v_tickets_total,
    'concessions_total', v_concessions_total,
    'combos_total', v_combos_total,
    'discount', v_promo_discount,
    'total', v_calculated_total
  );
END;
$$;

-- ============================================
-- SECURITY FIX 3: Atomic promo code usage update
-- ============================================

-- Function to atomically increment promo code usage with validation
CREATE OR REPLACE FUNCTION public.use_promo_code(
  p_promo_code_id uuid,
  p_customer_email text,
  p_organization_id uuid,
  p_ticket_total numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo RECORD;
  v_customer_usage int;
  v_discount numeric := 0;
BEGIN
  -- Lock the promo code row for update to prevent race conditions
  SELECT * INTO v_promo
  FROM promo_codes
  WHERE id = p_promo_code_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Promo code not found');
  END IF;
  
  -- Validate organization
  IF v_promo.organization_id != p_organization_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid promo code for this cinema');
  END IF;
  
  -- Validate active status
  IF v_promo.is_active = false THEN
    RETURN jsonb_build_object('success', false, 'error', 'Promo code is no longer active');
  END IF;
  
  -- Validate expiration
  IF v_promo.valid_until IS NOT NULL AND v_promo.valid_until < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Promo code has expired');
  END IF;
  
  -- Validate usage limit
  IF v_promo.max_uses IS NOT NULL AND v_promo.current_uses >= v_promo.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'Promo code usage limit reached');
  END IF;
  
  -- Validate per-customer limit
  IF v_promo.max_uses_per_customer IS NOT NULL AND p_customer_email IS NOT NULL THEN
    SELECT COUNT(*) INTO v_customer_usage
    FROM bookings
    WHERE organization_id = p_organization_id
      AND promo_code_id = p_promo_code_id
      AND customer_email = lower(p_customer_email)
      AND status != 'cancelled';
    
    IF v_customer_usage >= v_promo.max_uses_per_customer THEN
      RETURN jsonb_build_object('success', false, 'error', 'You have already used this promo code the maximum number of times');
    END IF;
  END IF;
  
  -- Validate minimum purchase
  IF v_promo.min_purchase_amount IS NOT NULL AND p_ticket_total < v_promo.min_purchase_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Minimum purchase of $' || v_promo.min_purchase_amount || ' required');
  END IF;
  
  -- Calculate discount
  IF v_promo.discount_type = 'percentage' THEN
    v_discount := p_ticket_total * (v_promo.discount_value / 100);
  ELSE
    v_discount := LEAST(v_promo.discount_value, p_ticket_total);
  END IF;
  
  -- Increment usage atomically
  UPDATE promo_codes
  SET current_uses = current_uses + 1
  WHERE id = p_promo_code_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'discount', v_discount,
    'discount_type', v_promo.discount_type,
    'discount_value', v_promo.discount_value
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.validate_booking_totals(uuid, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_booking_totals(uuid, numeric, numeric) TO anon;
GRANT EXECUTE ON FUNCTION public.use_promo_code(uuid, text, uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.use_promo_code(uuid, text, uuid, numeric) TO anon;

-- ============================================
-- SECURITY FIX 4: Add trigger to validate booking totals on insert/update
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_booking_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tickets_total numeric := 0;
  v_promo_discount numeric := 0;
  v_promo RECORD;
BEGIN
  -- This trigger runs AFTER the booking and seats are inserted
  -- It recalculates and updates if there's a mismatch
  
  -- Get tickets total from the booking's seats
  SELECT COALESCE(SUM(price), 0) INTO v_tickets_total
  FROM booked_seats
  WHERE booking_id = NEW.id;
  
  -- Calculate promo discount if applicable
  IF NEW.promo_code_id IS NOT NULL THEN
    SELECT * INTO v_promo FROM promo_codes WHERE id = NEW.promo_code_id;
    
    IF FOUND THEN
      IF v_promo.discount_type = 'percentage' THEN
        v_promo_discount := v_tickets_total * (v_promo.discount_value / 100);
      ELSE
        v_promo_discount := LEAST(v_promo.discount_value, v_tickets_total);
      END IF;
    END IF;
  END IF;
  
  -- Note: We log suspicious activity but don't block the booking
  -- The validate_booking_totals function can be called to correct issues
  IF ABS((v_tickets_total - v_promo_discount) - NEW.total_amount) > 1.00 THEN
    -- Log potential tampering (tickets only, before concessions)
    RAISE WARNING 'Booking % total mismatch: expected %, got %', 
      NEW.id, v_tickets_total - v_promo_discount, NEW.total_amount;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Note: We're not creating the trigger automatically to avoid disrupting existing flow
-- Admins can enable it manually if desired