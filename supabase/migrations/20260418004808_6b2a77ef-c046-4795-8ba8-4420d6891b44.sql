CREATE TABLE IF NOT EXISTS public.crm_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view crm settings"
ON public.crm_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage crm settings"
ON public.crm_settings FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

INSERT INTO public.crm_settings (key, value)
VALUES ('stale_leads_blink', '{"enabled": false, "days_threshold": 2}'::jsonb)
ON CONFLICT (key) DO NOTHING;