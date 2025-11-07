-- Fix security warnings: set search_path for functions

-- Update handle_new_user function with proper search_path
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Update update_updated_at_column function with proper search_path  
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';