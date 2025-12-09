-- Create table for vendor avatars (for vendors who may not have user accounts)
CREATE TABLE public.vendor_avatars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_name TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vendor_avatars ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view vendor avatars" 
ON public.vendor_avatars 
FOR SELECT 
USING (true);

CREATE POLICY "Admins and comercial can manage vendor avatars" 
ON public.vendor_avatars 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));

-- Create trigger for updated_at
CREATE TRIGGER update_vendor_avatars_updated_at
BEFORE UPDATE ON public.vendor_avatars
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();