
DROP POLICY IF EXISTS "Comercial can view all clients" ON public.clientes;
CREATE POLICY "Comercial can view all clients"
  ON public.clientes FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'comercial'::user_role) OR 
    has_role(auth.uid(), 'sdr'::user_role) OR
    has_role(auth.uid(), 'operacional'::user_role)
  );
