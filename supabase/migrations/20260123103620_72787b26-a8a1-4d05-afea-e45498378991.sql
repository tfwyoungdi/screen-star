-- Add user_id column to customers table to link with Supabase Auth
ALTER TABLE public.customers 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create unique constraint on user_id per organization
CREATE UNIQUE INDEX idx_customers_user_id ON public.customers(user_id) WHERE user_id IS NOT NULL;

-- Create index for faster lookups
CREATE INDEX idx_customers_org_user ON public.customers(organization_id, user_id);

-- Function to get customer by user_id
CREATE OR REPLACE FUNCTION public.get_customer_by_user_id(_user_id UUID, _organization_id UUID)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  loyalty_points INTEGER,
  total_spent NUMERIC,
  total_bookings INTEGER,
  first_booking_at TIMESTAMPTZ,
  last_booking_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.organization_id,
    c.email,
    c.full_name,
    c.phone,
    c.loyalty_points,
    c.total_spent,
    c.total_bookings,
    c.first_booking_at,
    c.last_booking_at
  FROM public.customers c
  WHERE c.user_id = _user_id AND c.organization_id = _organization_id;
$$;

-- Function to link existing customer to auth user on signup
CREATE OR REPLACE FUNCTION public.link_customer_to_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id UUID;
  _full_name TEXT;
BEGIN
  -- Get organization_id and full_name from user metadata
  _org_id := (NEW.raw_user_meta_data->>'organization_id')::UUID;
  _full_name := NEW.raw_user_meta_data->>'full_name';
  
  -- Only proceed if this is a customer signup (has organization_id in metadata)
  IF _org_id IS NOT NULL THEN
    -- Check if customer already exists with this email and org
    UPDATE public.customers
    SET user_id = NEW.id,
        full_name = COALESCE(_full_name, full_name),
        updated_at = now()
    WHERE organization_id = _org_id AND email = NEW.email;
    
    -- If no existing customer found, create a new one
    IF NOT FOUND THEN
      INSERT INTO public.customers (organization_id, email, full_name, user_id)
      VALUES (_org_id, NEW.email, COALESCE(_full_name, 'Customer'), NEW.id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to link customer on auth user creation
DROP TRIGGER IF EXISTS on_auth_user_created_link_customer ON auth.users;
CREATE TRIGGER on_auth_user_created_link_customer
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_customer_to_auth_user();

-- RLS policy for customers to view their own data
CREATE POLICY "Customers can view their own data"
  ON public.customers FOR SELECT
  USING (user_id = auth.uid());

-- RLS policy for customers to update their own data
CREATE POLICY "Customers can update their own data"
  ON public.customers FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow customers to view their own loyalty transactions
CREATE POLICY "Customers can view their own transactions"
  ON public.loyalty_transactions FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE user_id = auth.uid()
    )
  );

-- Function to delete loyalty transactions older than 30 days
CREATE OR REPLACE FUNCTION public.delete_old_loyalty_transactions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.loyalty_transactions
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Create a cron job to run daily and delete old transactions (requires pg_cron extension)
-- Note: This needs to be enabled in Supabase dashboard under Database > Extensions
SELECT cron.schedule(
  'delete-old-loyalty-transactions',
  '0 3 * * *', -- Run at 3 AM every day
  $$SELECT public.delete_old_loyalty_transactions()$$
);