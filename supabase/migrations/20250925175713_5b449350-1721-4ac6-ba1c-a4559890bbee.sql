-- Corrigir função get_current_user_role para ter search_path seguro
CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM user_profiles WHERE id = auth.uid() LIMIT 1;
$function$;