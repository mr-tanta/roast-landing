-- Fix 1: Add 'trial' to subscription_tier enum
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'trial';

-- Fix 2: Create user profile creation function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    name,
    avatar_url,
    subscription_tier,
    subscription_status,
    created_at,
    updated_at,
    last_active_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'free'::subscription_tier,
    'inactive'::subscription_status,
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 3: Create trigger to automatically create user profile
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Fix 4: Update RLS policies to allow user creation
DROP POLICY IF EXISTS users_insert ON users;
CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (
  auth.uid() = id OR 
  auth.role() = 'service_role'
);

-- Fix 5: Allow the trigger function to bypass RLS
ALTER FUNCTION handle_new_user() SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION handle_new_user() TO service_role;
