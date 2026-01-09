-- Add release_date and status fields to movies table
ALTER TABLE public.movies 
ADD COLUMN release_date date DEFAULT NULL,
ADD COLUMN status text NOT NULL DEFAULT 'now_showing' CHECK (status IN ('now_showing', 'coming_soon'));

-- Add comment for clarity
COMMENT ON COLUMN public.movies.status IS 'Movie status: now_showing or coming_soon';
COMMENT ON COLUMN public.movies.release_date IS 'Expected premiere/release date for coming soon movies';