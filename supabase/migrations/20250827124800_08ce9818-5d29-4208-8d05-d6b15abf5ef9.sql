-- Fix security vulnerability: Restrict access to budget data
-- Remove the overly permissive policies and replace with role-based access

-- Drop existing permissive policies for client_budget_comments
DROP POLICY IF EXISTS "Users can view all budget comments" ON public.client_budget_comments;

-- Create restricted policies for client_budget_comments
CREATE POLICY "Authenticated users can view budget comments for their role" 
ON public.client_budget_comments 
FOR SELECT 
TO authenticated
USING (
  -- Admins can see all
  get_current_user_role() = 'admin' 
  OR 
  -- Comercial users can see all (business requirement)
  get_current_user_role() = 'comercial'
  OR
  -- Users can only see their own comments
  user_id = auth.uid()
);

-- Drop existing permissive policies for client_budget_ratings  
DROP POLICY IF EXISTS "Users can view all budget ratings" ON public.client_budget_ratings;

-- Create restricted policies for client_budget_ratings
CREATE POLICY "Authenticated users can view budget ratings for their role" 
ON public.client_budget_ratings 
FOR SELECT 
TO authenticated  
USING (
  -- Admins can see all
  get_current_user_role() = 'admin' 
  OR 
  -- Comercial users can see all (business requirement)
  get_current_user_role() = 'comercial'
  OR
  -- Users can only see their own ratings
  user_id = auth.uid()
);

-- Add missing INSERT policy for email_reports_config (improvement)
CREATE POLICY "Users can create their own email report configs" 
ON public.email_reports_config 
FOR INSERT 
TO authenticated
WITH CHECK (created_by = auth.uid());