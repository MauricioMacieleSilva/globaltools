
-- Table to store production report schedule configuration
CREATE TABLE public.production_report_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_active BOOLEAN NOT NULL DEFAULT false,
  send_time TEXT NOT NULL DEFAULT '08:00',
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.production_report_schedule ENABLE ROW LEVEL SECURITY;

-- Only admins can manage
CREATE POLICY "Admins can manage production report schedule"
ON public.production_report_schedule
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Anyone authenticated can read
CREATE POLICY "Authenticated users can read production report schedule"
ON public.production_report_schedule
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Insert default row
INSERT INTO public.production_report_schedule (is_active, send_time) VALUES (false, '08:00');
