-- Add missing columns to leads table
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS client_code TEXT,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- Update client_budget_ratings to include user_name
ALTER TABLE public.client_budget_ratings ADD COLUMN IF NOT EXISTS user_name TEXT;

-- Create admin_goals table
CREATE TABLE IF NOT EXISTS public.admin_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month_year TEXT NOT NULL UNIQUE,
  daily_contacts_goal INTEGER,
  monthly_contacts_goal INTEGER,
  qualified_leads_goal INTEGER,
  deals_goal INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create budget_followups table
CREATE TABLE IF NOT EXISTS public.budget_followups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_number TEXT NOT NULL,
  followup_date TIMESTAMP WITH TIME ZONE NOT NULL,
  description TEXT,
  user_id UUID NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lead_dispositions table
CREATE TABLE IF NOT EXISTS public.lead_dispositions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  disposition_type TEXT NOT NULL,
  reason TEXT,
  notes TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lead_activities table
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  result TEXT,
  next_action TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.admin_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_dispositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin_goals
CREATE POLICY "Authenticated users can view goals"
ON public.admin_goals FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage goals"
ON public.admin_goals FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

-- RLS policies for budget_followups
CREATE POLICY "Authenticated users can view followups"
ON public.budget_followups FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can manage own followups"
ON public.budget_followups FOR ALL
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Comercial can manage all followups"
ON public.budget_followups FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));

-- RLS policies for lead_dispositions
CREATE POLICY "Comercial can view dispositions"
ON public.lead_dispositions FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role) OR has_role(auth.uid(), 'sdr'::user_role));

CREATE POLICY "Comercial can manage dispositions"
ON public.lead_dispositions FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role) OR has_role(auth.uid(), 'sdr'::user_role));

-- RLS policies for lead_activities
CREATE POLICY "Comercial can view activities"
ON public.lead_activities FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role) OR has_role(auth.uid(), 'sdr'::user_role));

CREATE POLICY "Comercial can manage activities"
ON public.lead_activities FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role) OR has_role(auth.uid(), 'sdr'::user_role));

-- Add triggers for updated_at
CREATE TRIGGER update_admin_goals_updated_at
BEFORE UPDATE ON public.admin_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budget_followups_updated_at
BEFORE UPDATE ON public.budget_followups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();