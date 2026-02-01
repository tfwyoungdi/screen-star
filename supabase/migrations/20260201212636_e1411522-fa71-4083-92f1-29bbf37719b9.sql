-- Create storage bucket for platform email assets (images, logos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('platform-email-assets', 'platform-email-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow platform admins to upload assets
CREATE POLICY "Platform admins can upload email assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'platform-email-assets' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'platform_admin'
  )
);

-- Allow platform admins to update their assets
CREATE POLICY "Platform admins can update email assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'platform-email-assets' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'platform_admin'
  )
);

-- Allow platform admins to delete assets
CREATE POLICY "Platform admins can delete email assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'platform-email-assets' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'platform_admin'
  )
);

-- Allow public read access (needed for emails to display images)
CREATE POLICY "Platform email assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'platform-email-assets');