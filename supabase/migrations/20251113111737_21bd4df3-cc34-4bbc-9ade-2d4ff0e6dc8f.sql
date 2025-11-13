-- Create lead_business_types table
CREATE TABLE public.lead_business_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lead_product_interests table
CREATE TABLE public.lead_product_interests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client_budget_comments table
CREATE TABLE public.client_budget_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_number TEXT NOT NULL,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client_budget_ratings table
CREATE TABLE public.client_budget_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_number TEXT NOT NULL UNIQUE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add budget_number column to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS budget_number TEXT;

-- Create check_invitation_rate_limit function
CREATE OR REPLACE FUNCTION public.check_invitation_rate_limit(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_count INTEGER;
BEGIN
  -- Check how many invitations were sent by this user in the last 24 hours
  SELECT COUNT(*) INTO invitation_count
  FROM public.user_invitations
  WHERE invited_by = user_id
    AND created_at > now() - interval '24 hours';
  
  -- Return true if under limit (e.g., 10 invitations per day)
  RETURN invitation_count < 10;
END;
$$;

-- Enable RLS on new tables
ALTER TABLE public.lead_business_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_product_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_budget_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_budget_ratings ENABLE ROW LEVEL SECURITY;

-- RLS policies for lead_business_types
CREATE POLICY "Authenticated users can view business types"
ON public.lead_business_types FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage business types"
ON public.lead_business_types FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

-- RLS policies for lead_product_interests
CREATE POLICY "Authenticated users can view product interests"
ON public.lead_product_interests FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage product interests"
ON public.lead_product_interests FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

-- RLS policies for client_budget_comments
CREATE POLICY "Authenticated users can view comments"
ON public.client_budget_comments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create comments"
ON public.client_budget_comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- RLS policies for client_budget_ratings
CREATE POLICY "Authenticated users can view ratings"
ON public.client_budget_ratings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage ratings"
ON public.client_budget_ratings FOR ALL
TO authenticated
USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_lead_business_types_updated_at
BEFORE UPDATE ON public.lead_business_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_product_interests_updated_at
BEFORE UPDATE ON public.lead_product_interests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_budget_ratings_updated_at
BEFORE UPDATE ON public.client_budget_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default business types
INSERT INTO public.lead_business_types (name, label, display_order) VALUES
  ('industria', 'Indústria', 1),
  ('construcao', 'Construção Civil', 2),
  ('comercio', 'Comércio', 3),
  ('servicos', 'Serviços', 4);

-- Insert default product interests
INSERT INTO public.lead_product_interests (name, label, display_order) VALUES
  ('perfil_u', 'Perfil U', 1),
  ('perfil_cartola', 'Perfil Cartola', 2),
  ('chapa_blank', 'Chapa Blank', 3),
  ('outros', 'Outros', 4);