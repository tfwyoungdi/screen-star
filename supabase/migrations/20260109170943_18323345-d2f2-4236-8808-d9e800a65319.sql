-- Create a storage bucket for resumes
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload resumes (public job applications)
CREATE POLICY "Anyone can upload resumes"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'resumes');

-- Allow cinema admins to view/download resumes in their org
CREATE POLICY "Cinema admins can manage resumes"
  ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'resumes' 
    AND is_cinema_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

-- Allow staff to view resumes in their org
CREATE POLICY "Staff can view resumes in their org"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'resumes' 
    AND (storage.foldername(name))[1]::uuid = get_user_organization(auth.uid())
  );