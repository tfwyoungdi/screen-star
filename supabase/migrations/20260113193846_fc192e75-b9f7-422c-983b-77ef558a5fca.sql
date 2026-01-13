-- Update the trigger function to award loyalty points based on loyalty_settings
CREATE OR REPLACE FUNCTION public.upsert_customer_on_booking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _customer_id uuid;
  _loyalty_enabled boolean;
  _points_per_dollar numeric;
  _points_earned integer;
BEGIN
  -- Try to find existing customer
  SELECT id INTO _customer_id
  FROM public.customers
  WHERE organization_id = NEW.organization_id
    AND email = NEW.customer_email;
  
  IF _customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO public.customers (organization_id, email, full_name, phone, first_booking_at, last_booking_at, total_bookings, total_spent)
    VALUES (
      NEW.organization_id,
      NEW.customer_email,
      NEW.customer_name,
      NEW.customer_phone,
      now(),
      now(),
      1,
      NEW.total_amount
    )
    RETURNING id INTO _customer_id;
  ELSE
    -- Update existing customer (without loyalty points - we'll handle that separately)
    UPDATE public.customers
    SET 
      full_name = COALESCE(NEW.customer_name, full_name),
      phone = COALESCE(NEW.customer_phone, phone),
      last_booking_at = now(),
      total_bookings = total_bookings + 1,
      total_spent = total_spent + NEW.total_amount,
      updated_at = now()
    WHERE id = _customer_id;
  END IF;
  
  -- Link booking to customer
  NEW.customer_id := _customer_id;
  
  RETURN NEW;
END;
$function$;

-- Create a new function to award loyalty points when booking is paid
CREATE OR REPLACE FUNCTION public.award_loyalty_points_on_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _customer_id uuid;
  _loyalty_enabled boolean;
  _points_per_dollar numeric;
  _points_earned integer;
BEGIN
  -- Only trigger when status changes to 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    
    -- Get customer_id from the booking
    _customer_id := NEW.customer_id;
    
    IF _customer_id IS NULL THEN
      -- Try to find customer by email
      SELECT id INTO _customer_id
      FROM public.customers
      WHERE organization_id = NEW.organization_id
        AND email = NEW.customer_email;
    END IF;
    
    -- Skip if no customer found
    IF _customer_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Check if loyalty is enabled for this organization and get points rate
    SELECT ls.is_enabled, ls.points_per_dollar
    INTO _loyalty_enabled, _points_per_dollar
    FROM public.loyalty_settings ls
    WHERE ls.organization_id = NEW.organization_id;
    
    -- If loyalty is enabled, award points
    IF _loyalty_enabled = true AND _points_per_dollar > 0 THEN
      _points_earned := FLOOR(NEW.total_amount * _points_per_dollar)::integer;
      
      IF _points_earned > 0 THEN
        -- Update customer's loyalty points
        UPDATE public.customers
        SET 
          loyalty_points = COALESCE(loyalty_points, 0) + _points_earned,
          updated_at = now()
        WHERE id = _customer_id;
        
        -- Create loyalty transaction record
        INSERT INTO public.loyalty_transactions (
          organization_id,
          customer_id,
          booking_id,
          transaction_type,
          points,
          description
        ) VALUES (
          NEW.organization_id,
          _customer_id,
          NEW.id,
          'earned',
          _points_earned,
          'Points earned from booking #' || NEW.booking_reference
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for awarding loyalty points (runs AFTER the booking update)
DROP TRIGGER IF EXISTS award_loyalty_points_trigger ON public.bookings;
CREATE TRIGGER award_loyalty_points_trigger
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.award_loyalty_points_on_payment();