import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile, UserRole } from '@/types';
import { loginSchema, signUpSchema } from '@/lib/validations';
import { toast } from 'sonner';

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, nome: string, papel?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutos em milissegundos

  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  // Monitorar inatividade
  useEffect(() => {
    if (!session) return;

    const checkInactivity = setInterval(() => {
      const inactiveTime = Date.now() - lastActivity;
      
      if (inactiveTime >= INACTIVITY_TIMEOUT) {
        toast.error('Sessão expirada por inatividade');
        logout();
      }
    }, 60000); // Verifica a cada minuto

    return () => clearInterval(checkInactivity);
  }, [session, lastActivity, logout, INACTIVITY_TIMEOUT]);

  // Monitorar atividade do usuário
  useEffect(() => {
    if (!session) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    
    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [session, updateActivity]);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        
        if (session?.user) {
          updateActivity(); // Reset activity on auth change
          // Defer profile fetching to avoid conflicts
          setTimeout(async () => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .single();
            
            if (profile) {
              // Use the papel from profiles table for display
              setUser({
                ...profile,
                papel: profile.papel
              });
            }
            setIsLoading(false);
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session once
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Let the auth state change handler deal with the session
      if (!session) {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [updateActivity]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Validate input
      const validationResult = loginSchema.safeParse({ email, password });
      if (!validationResult.success) {
        setIsLoading(false);
        return false;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: validationResult.data.email,
        password: validationResult.data.password
      });

      if (error) {
        setIsLoading(false);
        return false;
      }

      if (data.user) {
        // Profile will be set by the auth state change listener
        return true;
      }
      
      setIsLoading(false);
      return false;
    } catch (error) {
      setIsLoading(false);
      return false;
    }
  };

  const signUp = async (email: string, password: string, nome: string, papel: string = 'Produtor') => {
    setIsLoading(true);
    
    try {
      // Validate input
      const validationResult = signUpSchema.safeParse({ email, password, nome });
      if (!validationResult.success) {
        setIsLoading(false);
        return { success: false, error: 'Dados inválidos' };
      }

      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email: validationResult.data.email,
        password: validationResult.data.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            nome: validationResult.data.nome,
            papel
          }
        }
      });

      if (error) {
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Create profile in profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              user_id: data.user.id,
              nome: validationResult.data.nome,
              email: validationResult.data.email,
              papel,
              ativo: true
            }
          ]);

        if (profileError) {
          setIsLoading(false);
          return { success: false, error: 'Erro ao criar perfil do usuário' };
        }

        // Create role in user_roles table
        const appRole = papel === 'Administrador' ? 'admin' : papel === 'Faturamento' ? 'faturamento' : 'produtor';
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert([
            {
              user_id: data.user.id,
              role: appRole
            }
          ]);

        if (roleError) {
          setIsLoading(false);
          return { success: false, error: 'Erro ao atribuir papel ao usuário' };
        }
      }

      setIsLoading(false);
      return { success: true };
    } catch (error) {
      setIsLoading(false);
      return { success: false, error: 'Erro inesperado ao criar usuário' };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      // Validate email
      const validationResult = loginSchema.pick({ email: true }).safeParse({ email });
      if (!validationResult.success) {
        return { success: false, error: 'Email inválido' };
      }

      const currentUrl = window.location.origin;
      const redirectUrl = `${currentUrl}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(validationResult.data.email, {
        redirectTo: redirectUrl
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Erro inesperado ao solicitar redefinição de senha' };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      // Validate password
      const validationResult = loginSchema.pick({ password: true }).safeParse({ password });
      if (!validationResult.success) {
        return { success: false, error: 'Senha deve ter no mínimo 6 caracteres' };
      }

      const { error } = await supabase.auth.updateUser({
        password: validationResult.data.password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Erro inesperado ao atualizar senha' };
    }
  };


  return (
    <AuthContext.Provider value={{ user, session, login, signUp, logout, resetPassword, updatePassword, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};