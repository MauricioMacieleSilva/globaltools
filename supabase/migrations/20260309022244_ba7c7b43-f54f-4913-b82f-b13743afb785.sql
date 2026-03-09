
CREATE TABLE public.estoque_report_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT false,
  send_time text NOT NULL DEFAULT '07:00',
  send_day text NOT NULL DEFAULT 'monday',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.estoque_report_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage estoque report schedule"
  ON public.estoque_report_schedule FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Authenticated users can view estoque report schedule"
  ON public.estoque_report_schedule FOR SELECT
  USING (true);

INSERT INTO public.estoque_report_schedule (is_active, send_time, send_day) VALUES (false, '07:00', 'monday');
