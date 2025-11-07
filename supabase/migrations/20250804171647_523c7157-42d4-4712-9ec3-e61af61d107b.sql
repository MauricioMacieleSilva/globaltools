-- Create enum for follow-up types
CREATE TYPE public.followup_type AS ENUM ('lembrar', 'reuniao', 'cobrar', 'outros');

-- Create budget_followups table
CREATE TABLE public.budget_followups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_number TEXT NOT NULL,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  type public.followup_type NOT NULL DEFAULT 'lembrar',
  subject TEXT NOT NULL,
  scheduled_date TIMESTAMPTZ NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  show_today BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.budget_followups ENABLE ROW LEVEL SECURITY;

-- Create policies for budget_followups
CREATE POLICY "Users can create their own followups" 
ON public.budget_followups 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own followups" 
ON public.budget_followups 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own followups" 
ON public.budget_followups 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own followups" 
ON public.budget_followups 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all followups" 
ON public.budget_followups 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_budget_followups_updated_at
BEFORE UPDATE ON public.budget_followups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_budget_followups_user_id ON public.budget_followups(user_id);
CREATE INDEX idx_budget_followups_budget_number ON public.budget_followups(budget_number);
CREATE INDEX idx_budget_followups_scheduled_date ON public.budget_followups(scheduled_date);
CREATE INDEX idx_budget_followups_show_today ON public.budget_followups(show_today) WHERE show_today = true;