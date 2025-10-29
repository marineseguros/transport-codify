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
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img src="/marine-logo.png" alt="Marine Seguros Logo" className="h-16 w-auto" />
          </div>
          <h1 className="text-2xl font-bold">Sistema de Cotações</h1>
          <p className="text-muted-foreground">Faça login para acessar o sistema</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Entre com suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
              </div>
              
              <div>
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Digite sua senha" required />
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