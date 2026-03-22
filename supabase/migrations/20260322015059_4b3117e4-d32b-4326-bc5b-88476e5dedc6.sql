CREATE OR REPLACE FUNCTION public.get_admin_emails()
RETURNS TABLE(email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT up.email
  FROM user_roles ur
  JOIN user_profiles up ON up.id = ur.user_id
  WHERE ur.role = 'admin'
  AND up.email IS NOT NULL;
$$;