
-- Create ticket status enum
CREATE TYPE public.ticket_status AS ENUM ('aberto', 'em_andamento', 'concluido', 'cancelado');

-- Create ticket priority enum
CREATE TYPE public.ticket_priority AS ENUM ('baixa', 'media', 'alta', 'urgente');

-- Categories table with SLA
CREATE TABLE public.ticket_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  sla_minutes integer NOT NULL DEFAULT 240,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ticket categories"
  ON public.ticket_categories FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage ticket categories"
  ON public.ticket_categories FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Tickets table
CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE,
  category_id uuid REFERENCES public.ticket_categories(id) NOT NULL,
  title text NOT NULL,
  description text,
  status public.ticket_status NOT NULL DEFAULT 'aberto',
  priority public.ticket_priority NOT NULL DEFAULT 'media',
  valor numeric,
  requester_id uuid NOT NULL,
  requester_name text NOT NULL,
  assignee_id uuid,
  assignee_name text,
  sla_deadline timestamptz,
  resolved_at timestamptz,
  lead_id uuid,
  budget_number text,
  client_name text,
  client_cnpj text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Users can see their own tickets
CREATE POLICY "Users can view own tickets"
  ON public.tickets FOR SELECT TO authenticated
  USING (auth.uid() = requester_id);

-- Financeiro and admin can see all tickets
CREATE POLICY "Financeiro and admin can view all tickets"
  ON public.tickets FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));

-- Any authenticated user can create tickets
CREATE POLICY "Authenticated users can create tickets"
  ON public.tickets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);

-- Financeiro and admin can update any ticket
CREATE POLICY "Financeiro and admin can update tickets"
  ON public.tickets FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));

-- Users can update own tickets (e.g. cancel)
CREATE POLICY "Users can update own tickets"
  ON public.tickets FOR UPDATE TO authenticated
  USING (auth.uid() = requester_id);

-- Ticket comments table
CREATE TABLE public.ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  content text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

-- Users can view comments on their tickets
CREATE POLICY "Users can view comments on own tickets"
  ON public.ticket_comments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND t.requester_id = auth.uid()
  ));

-- Financeiro and admin can view all comments
CREATE POLICY "Financeiro and admin can view all comments"
  ON public.ticket_comments FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));

-- Any authenticated user can add comments to their own tickets
CREATE POLICY "Users can comment on own tickets"
  ON public.ticket_comments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND t.requester_id = auth.uid())
  );

-- Financeiro and admin can comment on any ticket
CREATE POLICY "Financeiro and admin can comment on any ticket"
  ON public.ticket_comments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role))
  );

-- Auto-generate ticket number
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 5) AS integer)), 0) + 1
  INTO next_num
  FROM public.tickets;
  
  NEW.ticket_number := 'TKT-' || LPAD(next_num::text, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_ticket_number();

-- Auto-calculate SLA deadline
CREATE OR REPLACE FUNCTION public.set_ticket_sla_deadline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sla_mins integer;
BEGIN
  SELECT sla_minutes INTO sla_mins
  FROM public.ticket_categories
  WHERE id = NEW.category_id;
  
  IF sla_mins IS NOT NULL THEN
    NEW.sla_deadline := NEW.created_at + (sla_mins || ' minutes')::interval;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_ticket_sla
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ticket_sla_deadline();

-- Updated_at trigger
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
