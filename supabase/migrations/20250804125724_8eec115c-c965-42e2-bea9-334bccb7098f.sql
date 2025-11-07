-- Corrigir warnings de segurança do linter

-- 1. Corrigir funções com search_path mutável
-- Atualizar função get_current_user_role para ter search_path seguro
CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM user_profiles WHERE id = auth.uid() LIMIT 1;
$function$;

-- Atualizar função handle_new_user para ter search_path seguro
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_global_email BOOLEAN;
  user_role TEXT;
BEGIN
  -- Check if email is from Global Aço domain
  is_global_email := NEW.email LIKE '%@globalaco.com.br';
  
  -- Set default role based on email domain
  user_role := CASE 
    WHEN is_global_email THEN 'operacional'
    ELSE 'visitante'
  END;
  
  -- Insert user profile
  INSERT INTO public.user_profiles (id, email, full_name, role, is_external)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    user_role,
    NOT is_global_email
  );
  
  RETURN NEW;
END;
$function$;

-- Atualizar função validate_profile_update para ter search_path seguro  
CREATE OR REPLACE FUNCTION public.validate_profile_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get current user role safely
  SELECT role INTO current_user_role 
  FROM public.user_profiles 
  WHERE id = auth.uid() 
  LIMIT 1;
  
  -- If user is trying to update their own profile
  IF NEW.id = auth.uid() THEN
    -- Prevent role escalation by non-admins
    IF OLD.role != NEW.role AND (current_user_role IS NULL OR current_user_role != 'admin') THEN
      RAISE EXCEPTION 'Insufficient permissions to change role';
    END IF;
    
    -- Prevent email changes by non-admins
    IF OLD.email != NEW.email AND (current_user_role IS NULL OR current_user_role != 'admin') THEN
      RAISE EXCEPTION 'Insufficient permissions to change email';
    END IF;
    
    -- Prevent is_external changes by non-admins
    IF OLD.is_external != NEW.is_external AND (current_user_role IS NULL OR current_user_role != 'admin') THEN
      RAISE EXCEPTION 'Insufficient permissions to change external status';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Atualizar função check_invitation_rate_limit para ter search_path seguro
CREATE OR REPLACE FUNCTION public.check_invitation_rate_limit(user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_count INTEGER;
  window_start_time TIMESTAMPTZ;
  max_invitations_per_hour INTEGER := 10;
BEGIN
  -- Get current count and window start
  SELECT invitation_count, window_start 
  INTO current_count, window_start_time
  FROM public.invitation_rate_limit 
  WHERE user_id = user_uuid;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.invitation_rate_limit (user_id, invitation_count, window_start)
    VALUES (user_uuid, 1, NOW());
    RETURN TRUE;
  END IF;
  
  -- If window has expired (more than 1 hour), reset
  IF window_start_time < NOW() - INTERVAL '1 hour' THEN
    UPDATE public.invitation_rate_limit 
    SET invitation_count = 1, window_start = NOW()
    WHERE user_id = user_uuid;
    RETURN TRUE;
  END IF;
  
  -- Check if limit is exceeded
  IF current_count >= max_invitations_per_hour THEN
    RETURN FALSE;
  END IF;
  
  -- Increment count
  UPDATE public.invitation_rate_limit 
  SET invitation_count = invitation_count + 1
  WHERE user_id = user_uuid;
  
  RETURN TRUE;
END;
$function$;