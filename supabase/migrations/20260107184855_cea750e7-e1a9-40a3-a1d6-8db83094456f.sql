-- Create storage bucket for concession item images
INSERT INTO storage.buckets (id, name, public)
VALUES ('concession-images', 'concession-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view concession images
CREATE POLICY "Anyone can view concession images"
ON storage.objects FOR SELECT
USING (bucket_id = 'concession-images');

-- Allow authenticated users to upload concession images
CREATE POLICY "Authenticated users can upload concession images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'concession-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update concession images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'concession-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete concession images
CREATE POLICY "Authenticated users can delete concession images"
ON storage.objects FOR DELETE
USING (bucket_id = 'concession-images' AND auth.role() = 'authenticated');