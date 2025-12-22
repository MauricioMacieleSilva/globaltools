-- Allow operacional users (and comercial/admin) to insert/update/delete transportadoras

-- Drop the previous policy (comercial/admin only)
DROP POLICY IF EXISTS "Comercial can manage transportadoras" ON public.transportadoras;
DROP POLICY IF EXISTS "Admins can manage transportadoras" ON public.transportadoras;

-- Create a new policy including operacional
CREATE POLICY "Operacional e comercial can manage transportadoras"
ON public.transportadoras
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::user_role)
  OR has_role(auth.uid(), 'comercial'::user_role)
  OR has_role(auth.uid(), 'operacional'::user_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::user_role)
  OR has_role(auth.uid(), 'comercial'::user_role)
  OR has_role(auth.uid(), 'operacional'::user_role)
);
