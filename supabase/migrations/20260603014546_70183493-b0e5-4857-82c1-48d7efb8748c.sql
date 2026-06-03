-- 1) Add segregation flag and equivalent thicknesses to estoque_itens
ALTER TABLE public.estoque_itens
  ADD COLUMN IF NOT EXISTS segregado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS espessuras_equivalentes TEXT[] NOT NULL DEFAULT '{}'::text[];

-- 2) Create compras_report_schedule (mirrors estoque_report_schedule pattern)
CREATE TABLE IF NOT EXISTS public.compras_report_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN NOT NULL DEFAULT false,
  send_time TEXT NOT NULL DEFAULT '08:00',
  send_days TEXT[] NOT NULL DEFAULT '{seg,ter,qua,qui,sex}'::text[],
  last_sent_date TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.compras_report_schedule TO authenticated;
GRANT ALL ON public.compras_report_schedule TO service_role;

ALTER TABLE public.compras_report_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage compras report schedule"
  ON public.compras_report_schedule
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Authenticated users can view compras report schedule"
  ON public.compras_report_schedule
  FOR SELECT
  TO authenticated
  USING (true);

-- Seed single row
INSERT INTO public.compras_report_schedule (is_active, send_time, send_days)
SELECT false, '08:00', ARRAY['seg','ter','qua','qui','sex']
WHERE NOT EXISTS (SELECT 1 FROM public.compras_report_schedule);