
-- Drop existing restrictive policies on leads
DROP POLICY IF EXISTS "Comercial can manage leads" ON public.leads;
DROP POLICY IF EXISTS "Comercial can view all leads" ON public.leads;

-- Recreate with operacional included
CREATE POLICY "Comercial can view all leads" ON public.leads
FOR SELECT TO public
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'comercial'::user_role) OR 
  has_role(auth.uid(), 'sdr'::user_role) OR
  has_role(auth.uid(), 'operacional'::user_role)
);

CREATE POLICY "Comercial can manage leads" ON public.leads
FOR ALL TO public
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'comercial'::user_role) OR 
  has_role(auth.uid(), 'sdr'::user_role) OR
  has_role(auth.uid(), 'operacional'::user_role)
);

-- Also update lead_activities so they can log activities
DROP POLICY IF EXISTS "Comercial can manage activities" ON public.lead_activities;
DROP POLICY IF EXISTS "Comercial can view activities" ON public.lead_activities;

CREATE POLICY "Comercial can view activities" ON public.lead_activities
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'comercial'::user_role) OR 
  has_role(auth.uid(), 'sdr'::user_role) OR
  has_role(auth.uid(), 'operacional'::user_role)
);

CREATE POLICY "Comercial can manage activities" ON public.lead_activities
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'comercial'::user_role) OR 
  has_role(auth.uid(), 'sdr'::user_role) OR
  has_role(auth.uid(), 'operacional'::user_role)
);

-- Update crm_visits policies
DROP POLICY IF EXISTS "CRM roles can manage visits" ON public.crm_visits;
DROP POLICY IF EXISTS "CRM roles can view visits" ON public.crm_visits;

CREATE POLICY "CRM roles can view visits" ON public.crm_visits
FOR SELECT TO public
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'comercial'::user_role) OR 
  has_role(auth.uid(), 'sdr'::user_role) OR
  has_role(auth.uid(), 'operacional'::user_role)
);

CREATE POLICY "CRM roles can manage visits" ON public.crm_visits
FOR ALL TO public
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'comercial'::user_role) OR 
  has_role(auth.uid(), 'sdr'::user_role) OR
  has_role(auth.uid(), 'operacional'::user_role)
);

-- Update lead_history policies
DROP POLICY IF EXISTS "Comercial can manage lead history" ON public.lead_history;
DROP POLICY IF EXISTS "Comercial can view lead history" ON public.lead_history;

CREATE POLICY "Comercial can view lead history" ON public.lead_history
FOR SELECT TO public
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'comercial'::user_role) OR 
  has_role(auth.uid(), 'sdr'::user_role) OR
  has_role(auth.uid(), 'operacional'::user_role)
);

CREATE POLICY "Comercial can manage lead history" ON public.lead_history
FOR ALL TO public
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'comercial'::user_role) OR 
  has_role(auth.uid(), 'sdr'::user_role) OR
  has_role(auth.uid(), 'operacional'::user_role)
);

-- Update lead_dispositions policies  
DROP POLICY IF EXISTS "Comercial can manage lead dispositions" ON public.lead_dispositions;

CREATE POLICY "Operacional can manage lead dispositions" ON public.lead_dispositions
FOR ALL TO public
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'comercial'::user_role) OR 
  has_role(auth.uid(), 'sdr'::user_role) OR
  has_role(auth.uid(), 'operacional'::user_role)
);
