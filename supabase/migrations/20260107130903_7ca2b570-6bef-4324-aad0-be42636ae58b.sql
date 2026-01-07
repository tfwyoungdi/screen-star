-- Create trigger function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  org_id uuid;
  cinema_name text;
  cinema_slug text;
BEGIN
  -- Get cinema info from user metadata
  cinema_name := NEW.raw_user_meta_data ->> 'cinema_name';
  cinema_slug := NEW.raw_user_meta_data ->> 'cinema_slug';
  
  -- Only proceed if this is a cinema admin signup (has cinema_name)
  IF cinema_name IS NOT NULL AND cinema_slug IS NOT NULL THEN
    -- Create the organization
    INSERT INTO public.organizations (name, slug)
    VALUES (cinema_name, cinema_slug)
    RETURNING id INTO org_id;
    
    -- Create the profile
    INSERT INTO public.profiles (id, organization_id, full_name, email)
    VALUES (
      NEW.id,
      org_id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
      NEW.email
    );
    
    -- Assign cinema_admin role
    INSERT INTO public.user_roles (user_id, organization_id, role)
    VALUES (NEW.id, org_id, 'cinema_admin');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();