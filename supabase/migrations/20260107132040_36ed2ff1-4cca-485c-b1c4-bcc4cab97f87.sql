-- Create screens table (cinema halls with custom layouts)
CREATE TABLE public.screens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rows INTEGER NOT NULL DEFAULT 10,
  columns INTEGER NOT NULL DEFAULT 12,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create movies table
CREATE TABLE public.movies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  poster_url TEXT,
  genre TEXT,
  rating TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create showtimes table
CREATE TABLE public.showtimes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  screen_id UUID NOT NULL REFERENCES public.screens(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  vip_price DECIMAL(10,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create seat_layouts table for custom VIP sections
CREATE TABLE public.seat_layouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  screen_id UUID NOT NULL REFERENCES public.screens(id) ON DELETE CASCADE,
  row_label TEXT NOT NULL,
  seat_number INTEGER NOT NULL,
  seat_type TEXT NOT NULL DEFAULT 'standard',
  is_available BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (screen_id, row_label, seat_number)
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  showtime_id UUID NOT NULL REFERENCES public.showtimes(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  total_amount DECIMAL(10,2) NOT NULL,
  booking_reference TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create booked_seats table
CREATE TABLE public.booked_seats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  showtime_id UUID NOT NULL REFERENCES public.showtimes(id) ON DELETE CASCADE,
  row_label TEXT NOT NULL,
  seat_number INTEGER NOT NULL,
  seat_type TEXT NOT NULL DEFAULT 'standard',
  price DECIMAL(10,2) NOT NULL,
  UNIQUE (showtime_id, row_label, seat_number)
);

-- Enable RLS on all tables
ALTER TABLE public.screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showtimes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booked_seats ENABLE ROW LEVEL SECURITY;

-- RLS policies for screens
CREATE POLICY "Staff can view screens in their org" ON public.screens
FOR SELECT USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Cinema admins can manage screens" ON public.screens
FOR ALL USING (is_cinema_admin(auth.uid(), organization_id));

-- RLS policies for movies
CREATE POLICY "Staff can view movies in their org" ON public.movies
FOR SELECT USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Cinema admins can manage movies" ON public.movies
FOR ALL USING (is_cinema_admin(auth.uid(), organization_id));

CREATE POLICY "Public can view active movies" ON public.movies
FOR SELECT USING (is_active = true);

-- RLS policies for showtimes
CREATE POLICY "Staff can view showtimes in their org" ON public.showtimes
FOR SELECT USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Cinema admins can manage showtimes" ON public.showtimes
FOR ALL USING (is_cinema_admin(auth.uid(), organization_id));

CREATE POLICY "Public can view active showtimes" ON public.showtimes
FOR SELECT USING (is_active = true);

-- RLS policies for seat_layouts
CREATE POLICY "Anyone can view seat layouts" ON public.seat_layouts
FOR SELECT USING (true);

CREATE POLICY "Cinema admins can manage seat layouts" ON public.seat_layouts
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.screens s 
    WHERE s.id = screen_id 
    AND is_cinema_admin(auth.uid(), s.organization_id)
  )
);

-- RLS policies for bookings
CREATE POLICY "Staff can view bookings in their org" ON public.bookings
FOR SELECT USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Anyone can create bookings" ON public.bookings
FOR INSERT WITH CHECK (true);

CREATE POLICY "Cinema admins can manage bookings" ON public.bookings
FOR ALL USING (is_cinema_admin(auth.uid(), organization_id));

-- RLS policies for booked_seats
CREATE POLICY "Anyone can view booked seats" ON public.booked_seats
FOR SELECT USING (true);

CREATE POLICY "Anyone can create booked seats" ON public.booked_seats
FOR INSERT WITH CHECK (true);

-- Create booking reference generator function
CREATE OR REPLACE FUNCTION public.generate_booking_reference()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  ref TEXT;
BEGIN
  ref := upper(substring(md5(random()::text || now()::text) from 1 for 8));
  WHILE EXISTS (SELECT 1 FROM public.bookings WHERE booking_reference = ref) LOOP
    ref := upper(substring(md5(random()::text || now()::text) from 1 for 8));
  END LOOP;
  RETURN ref;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_screens_updated_at
BEFORE UPDATE ON public.screens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_movies_updated_at
BEFORE UPDATE ON public.movies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();