-- Drop the overly permissive "Allow trigger to insert profiles" policy
DROP POLICY IF EXISTS "Allow trigger to insert profiles" ON public.profiles;

-- Drop and recreate the "Users can insert their own profile" policy without the unauthenticated path
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);