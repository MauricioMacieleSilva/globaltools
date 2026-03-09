
-- Update SELECT policy to include operacional
DROP POLICY IF EXISTS "Admins and comercial can view prospecting results" ON public.lead_prospecting_results;
CREATE POLICY "All CRM roles can view prospecting results" ON public.lead_prospecting_results
FOR SELECT TO public
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'comercial'::user_role) OR 
  has_role(auth.uid(), 'sdr'::user_role) OR
  has_role(auth.uid(), 'operacional'::user_role)
);

-- Update UPDATE policy to include operacional
DROP POLICY IF EXISTS "Admins and comercial can update prospecting results" ON public.lead_prospecting_results;
CREATE POLICY "All CRM roles can update prospecting results" ON public.lead_prospecting_results
FOR UPDATE TO public
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'comercial'::user_role) OR 
  has_role(auth.uid(), 'sdr'::user_role) OR
  has_role(auth.uid(), 'operacional'::user_role)
);
