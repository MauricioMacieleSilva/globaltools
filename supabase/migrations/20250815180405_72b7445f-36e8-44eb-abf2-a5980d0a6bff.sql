-- Permitir que admins também possam criar leads
CREATE POLICY "Admins podem criar leads" 
ON public.leads 
FOR INSERT 
WITH CHECK (get_current_user_role() = 'admin');