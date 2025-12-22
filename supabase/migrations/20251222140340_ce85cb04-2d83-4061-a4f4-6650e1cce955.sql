-- Drop existing restrictive policy for admins only
DROP POLICY IF EXISTS "Admins can manage transportadoras" ON public.transportadoras;

-- Create new policy that allows comercial users to manage transportadoras
CREATE POLICY "Comercial can manage transportadoras" 
ON public.transportadoras 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));