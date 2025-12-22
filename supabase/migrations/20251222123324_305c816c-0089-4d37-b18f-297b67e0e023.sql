-- Create transportadoras table
CREATE TABLE public.transportadoras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  cidades_atendimento TEXT[] NOT NULL DEFAULT '{}',
  regioes_atendimento TEXT[] NOT NULL DEFAULT '{}',
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transportadoras ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view transportadoras"
ON public.transportadoras
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage transportadoras"
ON public.transportadoras
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

-- Create trigger for updated_at
CREATE TRIGGER update_transportadoras_updated_at
BEFORE UPDATE ON public.transportadoras
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();