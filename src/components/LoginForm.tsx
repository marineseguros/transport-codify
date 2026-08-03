import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';
import { ForgotPasswordModal } from '@/components/ForgotPasswordModal';
export const LoginForm = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const {
    login,
    isLoading
  } = useAuth();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(email, password);
    if (!success) {
      toast({
        title: "Erro de autenticação",
        description: "Email ou senha inválidos. Verifique suas credenciais.",
        variant: "destructive"
      });
    } else {
      // Redirecionar para o Dashboard após login bem-sucedido
      navigate('/');
    }
  };
  return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-8">
          <div className="flex justify-center">
            <img
              src="/marine-shield.png"
              alt="Marine Seguros"
              className="h-28 w-auto dark:drop-shadow-[0_0_4px_rgba(56,189,248,0.15)]"
            />
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-[3.5rem] leading-none font-serif font-bold tracking-wide text-slate-800 dark:text-slate-100">
                MARINE
              </h1>
              <p className="text-base leading-none font-sans tracking-[0.4em] text-slate-500 dark:text-slate-300 uppercase">
                SEGUROS
              </p>
            </div>

            <p className="text-sm text-muted-foreground dark:text-slate-400">
              Sistema de Gerenciamento
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Entre com suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" method="post" action="#" name="login-form">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
              </div>
              
              <div>
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Digite sua senha" required />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <ForgotPasswordModal>
                <Button variant="link" className="text-sm">
                  Esqueci minha senha
                </Button>
              </ForgotPasswordModal>
            </div>

            {/* Credenciais de teste para administrador */}
            
          </CardContent>
        </Card>
      </div>
    </div>;
};