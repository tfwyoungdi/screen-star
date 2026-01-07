-- Create customers table
CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  phone text,
  loyalty_points integer NOT NULL DEFAULT 0,
  total_spent numeric NOT NULL DEFAULT 0,
  total_bookings integer NOT NULL DEFAULT 0,
  first_booking_at timestamp with time zone,
  last_booking_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email)
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Cinema admins can manage customers"
ON public.customers
FOR ALL
USING (is_cinema_admin(auth.uid(), organization_id));

CREATE POLICY "Staff can view customers in their org"
ON public.customers
FOR SELECT
USING (organization_id = get_user_organization(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for lookups
CREATE INDEX idx_customers_org_email ON public.customers(organization_id, email);
CREATE INDEX idx_customers_loyalty ON public.customers(organization_id, loyalty_points DESC);

-- Add customer_id to bookings table
ALTER TABLE public.bookings ADD COLUMN customer_id uuid REFERENCES public.customers(id);

-- Function to upsert customer on booking
CREATE OR REPLACE FUNCTION public.upsert_customer_on_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _customer_id uuid;
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
    -- Update existing customer
    UPDATE public.customers
    SET 
      full_name = COALESCE(NEW.customer_name, full_name),
      phone = COALESCE(NEW.customer_phone, phone),
      last_booking_at = now(),
      total_bookings = total_bookings + 1,
      total_spent = total_spent + NEW.total_amount,
      -- Award 1 point per dollar spent
      loyalty_points = loyalty_points + FLOOR(NEW.total_amount)::integer,
      updated_at = now()
    WHERE id = _customer_id;
  END IF;
  
  -- Link booking to customer
  NEW.customer_id := _customer_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger on bookings
CREATE TRIGGER booking_upsert_customer
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.upsert_customer_on_booking();