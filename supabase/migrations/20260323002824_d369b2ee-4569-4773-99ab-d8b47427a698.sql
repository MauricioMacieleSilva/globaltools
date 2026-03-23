
-- Add 'financeiro' to user_role enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'financeiro';

-- Add financial parecer columns to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS finance_parecer text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS finance_consideracoes text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS finance_analyst_name text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS finance_parecer_at timestamptz;
