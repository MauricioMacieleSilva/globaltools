-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Admins and comercial can manage vendor avatars" ON public.vendor_avatars;

-- Create new policy allowing any authenticated user to manage vendor avatars
CREATE POLICY "Authenticated users can manage vendor avatars" 
ON public.vendor_avatars 
FOR ALL 
USING (true)
WITH CHECK (true);