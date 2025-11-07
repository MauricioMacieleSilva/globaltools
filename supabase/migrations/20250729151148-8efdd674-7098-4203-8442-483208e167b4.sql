-- Fix critical security issues identified in security review

-- 1. First, create a better security definer function to get current user role
-- This prevents infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. Drop existing problematic policies and recreate them properly
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all invitations" ON user_invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON user_invitations;

-- 3. Create secure admin policies
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can delete profiles" ON user_profiles
  FOR DELETE USING (get_current_user_role() = 'admin');

-- 4. Create separate policies for role updates vs general profile updates
-- Only admins can update roles and critical fields
CREATE POLICY "Admins can update user roles and critical fields" ON user_profiles
  FOR UPDATE USING (get_current_user_role() = 'admin');

-- Users can only update non-critical fields (not role, email, is_external, invited_by)
CREATE POLICY "Users can update own profile limited fields" ON user_profiles
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Ensure role, email, is_external, and invited_by cannot be changed by users
    role = (SELECT role FROM user_profiles WHERE id = auth.uid()) AND
    email = (SELECT email FROM user_profiles WHERE id = auth.uid()) AND
    is_external = (SELECT is_external FROM user_profiles WHERE id = auth.uid()) AND
    invited_by = (SELECT invited_by FROM user_profiles WHERE id = auth.uid())
  );

-- 5. Secure invitation policies
CREATE POLICY "Admins can manage all invitations" ON user_invitations
  FOR ALL USING (get_current_user_role() = 'admin');

-- 6. Create function to validate email domains for security
CREATE OR REPLACE FUNCTION public.is_valid_email_domain(email_address TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT email_address ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' AND
         LENGTH(email_address) <= 254;
$$;

-- 7. Add constraint to ensure email validation
ALTER TABLE user_profiles 
ADD CONSTRAINT valid_email_format 
CHECK (is_valid_email_domain(email));

ALTER TABLE user_invitations 
ADD CONSTRAINT valid_invitation_email_format 
CHECK (is_valid_email_domain(email));

-- 8. Create function to prevent privilege escalation in profile updates
CREATE OR REPLACE FUNCTION public.validate_profile_update()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  -- If user is trying to update their own profile
  IF NEW.id = auth.uid() THEN
    -- Prevent role escalation by non-admins
    IF OLD.role != NEW.role AND get_current_user_role() != 'admin' THEN
      RAISE EXCEPTION 'Insufficient permissions to change role';
    END IF;
    
    -- Prevent email changes by non-admins
    IF OLD.email != NEW.email AND get_current_user_role() != 'admin' THEN
      RAISE EXCEPTION 'Insufficient permissions to change email';
    END IF;
    
    -- Prevent is_external changes by non-admins
    IF OLD.is_external != NEW.is_external AND get_current_user_role() != 'admin' THEN
      RAISE EXCEPTION 'Insufficient permissions to change external status';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 9. Create trigger to enforce profile update validation
CREATE TRIGGER validate_profile_update_trigger
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_profile_update();

-- 10. Add rate limiting table for invitation security
CREATE TABLE IF NOT EXISTS public.invitation_rate_limit (
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  invitation_count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id)
);

ALTER TABLE invitation_rate_limit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limit" ON invitation_rate_limit
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all rate limits" ON invitation_rate_limit
  FOR SELECT USING (get_current_user_role() = 'admin');

-- 11. Create function to check invitation rate limits
CREATE OR REPLACE FUNCTION public.check_invitation_rate_limit(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count INTEGER;
  window_start_time TIMESTAMPTZ;
  max_invitations_per_hour INTEGER := 10;
BEGIN
  -- Get current count and window start
  SELECT invitation_count, window_start 
  INTO current_count, window_start_time
  FROM invitation_rate_limit 
  WHERE user_id = user_uuid;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO invitation_rate_limit (user_id, invitation_count, window_start)
    VALUES (user_uuid, 1, NOW());
    RETURN TRUE;
  END IF;
  
  -- If window has expired (more than 1 hour), reset
  IF window_start_time < NOW() - INTERVAL '1 hour' THEN
    UPDATE invitation_rate_limit 
    SET invitation_count = 1, window_start = NOW()
    WHERE user_id = user_uuid;
    RETURN TRUE;
  END IF;
  
  -- Check if limit is exceeded
  IF current_count >= max_invitations_per_hour THEN
    RETURN FALSE;
  END IF;
  
  -- Increment count
  UPDATE invitation_rate_limit 
  SET invitation_count = invitation_count + 1
  WHERE user_id = user_uuid;
  
  RETURN TRUE;
END;
$$;