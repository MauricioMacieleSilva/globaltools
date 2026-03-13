
CREATE TABLE public.crm_vendor_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  month_year text NOT NULL,
  daily_contacts_goal integer NOT NULL DEFAULT 0,
  daily_visits_goal integer NOT NULL DEFAULT 0,
  daily_proposals_goal integer NOT NULL DEFAULT 0,
  daily_orders_goal integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, month_year)
);

ALTER TABLE public.crm_vendor_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage vendor goals"
  ON public.crm_vendor_goals
  FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));

CREATE POLICY "Authenticated users can view vendor goals"
  ON public.crm_vendor_goals
  FOR SELECT
  TO authenticated
  USING (true);
