-- Fix security linter warnings for function search paths

-- Fix function search paths to prevent security issues
CREATE OR REPLACE FUNCTION public.is_valid_email_domain(email_address TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT email_address ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' AND
         LENGTH(email_address) <= 254;
$$;

CREATE OR REPLACE FUNCTION public.validate_profile_update()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.check_invitation_rate_limit(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;