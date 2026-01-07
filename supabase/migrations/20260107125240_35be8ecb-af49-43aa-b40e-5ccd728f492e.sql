-- Create storage bucket for cinema logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('cinema-logos', 'cinema-logos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for cinema-logos bucket
CREATE POLICY "Anyone can view cinema logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'cinema-logos');

CREATE POLICY "Cinema admins can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'cinema-logos' 
  AND auth.role() = 'authenticated'
  AND is_cinema_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Cinema admins can update logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'cinema-logos' 
  AND auth.role() = 'authenticated'
  AND is_cinema_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Cinema admins can delete logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'cinema-logos' 
  AND auth.role() = 'authenticated'
  AND is_cinema_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
);

-- Create staff_invitations table
CREATE TABLE public.staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL,
  invited_by UUID NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_staff_role CHECK (role IN ('box_office', 'gate_staff', 'manager', 'accountant'))
);

-- Enable RLS on staff_invitations
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for staff_invitations
CREATE POLICY "Cinema admins can view invitations in their organization"
ON public.staff_invitations FOR SELECT
USING (is_cinema_admin(auth.uid(), organization_id));

CREATE POLICY "Cinema admins can create invitations"
ON public.staff_invitations FOR INSERT
WITH CHECK (is_cinema_admin(auth.uid(), organization_id));

CREATE POLICY "Cinema admins can delete invitations"
ON public.staff_invitations FOR DELETE
USING (is_cinema_admin(auth.uid(), organization_id));

-- Public can view invitation by token (for accepting)
CREATE POLICY "Anyone can view invitation by token"
ON public.staff_invitations FOR SELECT
USING (true);

-- Create index for faster token lookup
CREATE INDEX idx_staff_invitations_token ON public.staff_invitations(token);
CREATE INDEX idx_staff_invitations_org ON public.staff_invitations(organization_id);
CREATE INDEX idx_staff_invitations_email ON public.staff_invitations(email);