
-- Create lead_attachments table
CREATE TABLE public.lead_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size bigint,
  uploaded_by uuid,
  uploaded_by_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CRM roles can manage lead attachments"
  ON public.lead_attachments FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::user_role) OR
    has_role(auth.uid(), 'comercial'::user_role) OR
    has_role(auth.uid(), 'sdr'::user_role)
  );

CREATE POLICY "CRM roles can view lead attachments"
  ON public.lead_attachments FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::user_role) OR
    has_role(auth.uid(), 'comercial'::user_role) OR
    has_role(auth.uid(), 'sdr'::user_role)
  );

-- Create storage bucket for lead attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('lead-attachments', 'lead-attachments', true, 10485760);

-- Storage policies
CREATE POLICY "CRM roles can upload lead attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'lead-attachments' AND (
      has_role(auth.uid(), 'admin'::user_role) OR
      has_role(auth.uid(), 'comercial'::user_role) OR
      has_role(auth.uid(), 'sdr'::user_role)
    )
  );

CREATE POLICY "CRM roles can view lead attachment files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'lead-attachments' AND (
      has_role(auth.uid(), 'admin'::user_role) OR
      has_role(auth.uid(), 'comercial'::user_role) OR
      has_role(auth.uid(), 'sdr'::user_role)
    )
  );

CREATE POLICY "CRM roles can delete lead attachment files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'lead-attachments' AND (
      has_role(auth.uid(), 'admin'::user_role) OR
      has_role(auth.uid(), 'comercial'::user_role) OR
      has_role(auth.uid(), 'sdr'::user_role)
    )
  );
