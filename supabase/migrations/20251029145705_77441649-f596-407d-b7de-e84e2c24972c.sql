-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function with proper security context
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles table with the new user's data
  INSERT INTO public.profiles (
    user_id,
    nome,
    email,
    papel,
    modulo,
    ativo
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'papel', 'Produtor'),
    COALESCE((NEW.raw_user_meta_data->>'modulo')::modulo_tipo, 'Transportes'::modulo_tipo),
    true
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add a policy to allow the trigger function to insert profiles
DROP POLICY IF EXISTS "Allow trigger to insert profiles" ON public.profiles;
CREATE POLICY "Allow trigger to insert profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true);

-- Make sure existing policies don't conflict
-- The "Users can insert their own profile" policy should be updated to be less restrictive
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);