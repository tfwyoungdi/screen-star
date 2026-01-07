-- Add trailer_url column to movies
ALTER TABLE public.movies
ADD COLUMN IF NOT EXISTS trailer_url text;

-- Create movie-posters storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('movie-posters', 'movie-posters', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for movie-posters bucket
CREATE POLICY "Anyone can view movie posters"
ON storage.objects FOR SELECT
USING (bucket_id = 'movie-posters');

CREATE POLICY "Cinema admins can upload movie posters"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'movie-posters' AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'cinema_admin'
  )
);

CREATE POLICY "Cinema admins can update movie posters"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'movie-posters' AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'cinema_admin'
  )
);

CREATE POLICY "Cinema admins can delete movie posters"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'movie-posters' AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'cinema_admin'
  )
);