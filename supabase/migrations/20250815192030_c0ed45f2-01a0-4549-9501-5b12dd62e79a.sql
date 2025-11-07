-- Add RLS policy to allow authenticated users to view specialist profiles for lead assignment
CREATE POLICY "Authenticated users can view specialists for lead assignment" 
ON public.user_profiles 
FOR SELECT 
TO authenticated
USING (role IN ('comercial', 'admin'));