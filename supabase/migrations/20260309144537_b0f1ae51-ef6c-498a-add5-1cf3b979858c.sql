
-- Allow all authenticated users to view basic profile info (needed for vendor display on CRM cards, dashboards, etc.)
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;

CREATE POLICY "Authenticated users can view all profiles" ON public.user_profiles
FOR SELECT TO authenticated
USING (true);
