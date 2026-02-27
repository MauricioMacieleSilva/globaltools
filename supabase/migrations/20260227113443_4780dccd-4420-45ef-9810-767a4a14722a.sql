
-- Add status and client fields to fretes table
ALTER TABLE public.fretes 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES public.clientes(id),
  ADD COLUMN IF NOT EXISTS cliente_nome text;

-- Add approved_by and approved_at for approval tracking
ALTER TABLE public.fretes
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;
