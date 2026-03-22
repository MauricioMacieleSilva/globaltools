-- Fix lead_attachments table: ALL policy needs WITH CHECK for inserts to work
DROP POLICY IF EXISTS "CRM roles can manage lead attachments" ON public.lead_attachments;

CREATE POLICY "CRM roles can manage lead attachments"
ON public.lead_attachments
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'comercial'::user_role) OR 
  has_role(auth.uid(), 'sdr'::user_role) OR 
  has_role(auth.uid(), 'operacional'::user_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'comercial'::user_role) OR 
  has_role(auth.uid(), 'sdr'::user_role) OR 
  has_role(auth.uid(), 'operacional'::user_role)
);

-- Update SELECT policy to include operacional
DROP POLICY IF EXISTS "CRM roles can view lead attachments" ON public.lead_attachments;

CREATE POLICY "CRM roles can view lead attachments"
ON public.lead_attachments
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'comercial'::user_role) OR 
  has_role(auth.uid(), 'sdr'::user_role) OR 
  has_role(auth.uid(), 'operacional'::user_role)
);

-- Fix storage policies to include operacional role
DROP POLICY IF EXISTS "CRM roles can upload lead attachments" ON storage.objects;
CREATE POLICY "CRM roles can upload lead attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lead-attachments' AND (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'comercial'::user_role) OR 
    has_role(auth.uid(), 'sdr'::user_role) OR 
    has_role(auth.uid(), 'operacional'::user_role)
  )
);

DROP POLICY IF EXISTS "CRM roles can view lead attachment files" ON storage.objects;
CREATE POLICY "CRM roles can view lead attachment files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'lead-attachments' AND (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'comercial'::user_role) OR 
    has_role(auth.uid(), 'sdr'::user_role) OR 
    has_role(auth.uid(), 'operacional'::user_role)
  )
);

DROP POLICY IF EXISTS "CRM roles can delete lead attachment files" ON storage.objects;
CREATE POLICY "CRM roles can delete lead attachment files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'lead-attachments' AND (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'comercial'::user_role) OR 
    has_role(auth.uid(), 'sdr'::user_role) OR 
    has_role(auth.uid(), 'operacional'::user_role)
  )
);

-- Add UPDATE policy for storage
DROP POLICY IF EXISTS "CRM roles can update lead attachment files" ON storage.objects;
CREATE POLICY "CRM roles can update lead attachment files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lead-attachments' AND (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'comercial'::user_role) OR 
    has_role(auth.uid(), 'sdr'::user_role) OR 
    has_role(auth.uid(), 'operacional'::user_role)
  )
);