-- Create admin user with known credentials
-- First, let's ensure we have a function to create admin users safely

-- Create or update admin user
-- Note: This will need to be done manually in Supabase dashboard under Authentication > Users
-- Email: admin@marineseguros.com.br
-- Password: admin123

-- For now, let's ensure the profile exists for the existing auth user
INSERT INTO public.profiles (user_id, nome, email, papel, ativo) 
VALUES (
  '8796adaf-bdf3-476e-aeb3-073bb8750c5e',
  'Administrador System',
  'admin@marineseguros.com.br', 
  'Administrador',
  true
) 
ON CONFLICT (user_id) DO UPDATE SET
  nome = EXCLUDED.nome,
  email = EXCLUDED.email,
  papel = EXCLUDED.papel,
  ativo = EXCLUDED.ativo;