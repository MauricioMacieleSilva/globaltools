
-- Ticket attachments table
CREATE TABLE public.ticket_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view ticket attachments"
  ON public.ticket_attachments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert ticket attachments"
  ON public.ticket_attachments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Owner or admin can delete ticket attachments"
  ON public.ticket_attachments FOR DELETE
  TO authenticated
  USING (
    auth.uid() = uploaded_by
    OR has_role(auth.uid(), 'admin'::user_role)
    OR has_role(auth.uid(), 'financeiro'::user_role)
  );

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('ticket-attachments', 'ticket-attachments', true);

CREATE POLICY "Authenticated can upload ticket attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'ticket-attachments');

CREATE POLICY "Anyone can view ticket attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ticket-attachments');

CREATE POLICY "Owner or admin can delete ticket attachment files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'ticket-attachments');
