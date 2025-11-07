-- Primeiro, vamos remover as políticas restritivas existentes e criar uma política mais permissiva para teste
DROP POLICY IF EXISTS "SDRs podem criar leads" ON public.leads;
DROP POLICY IF EXISTS "Admins podem criar leads" ON public.leads;

-- Criar uma política temporária que permite qualquer usuário autenticado criar leads
CREATE POLICY "Usuários autenticados podem criar leads" 
ON public.leads 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Também vamos permitir que todos vejam todos os leads para teste
DROP POLICY IF EXISTS "SDRs podem ver seus próprios leads" ON public.leads;
DROP POLICY IF EXISTS "Comerciais podem ver todos os leads" ON public.leads;
DROP POLICY IF EXISTS "Admins podem ver todos os leads" ON public.leads;

CREATE POLICY "Usuários autenticados podem ver leads" 
ON public.leads 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Permitir updates também
DROP POLICY IF EXISTS "SDRs podem atualizar seus próprios leads" ON public.leads;

CREATE POLICY "Usuários autenticados podem atualizar leads" 
ON public.leads 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);