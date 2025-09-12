import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, Truck } from 'lucide-react';

export const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const success = await login(email, password);
    if (!success) {
      toast({
        title: "Erro de autenticação",
        description: "Email ou senha inválidos. Verifique suas credenciais.",
        variant: "destructive",
      });
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <img src="/marine-logo.png" alt="Marine Seguros" className="h-16 w-auto" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Sistema de Cotações TRN</h1>
          <p className="text-muted-foreground">Marine Seguros - Faça login para acessar o sistema</p>
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
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm">Credenciais de Teste - Administrador</CardTitle>
            <CardDescription className="text-xs">
              Use estas credenciais para acessar como administrador
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <p><strong>Email:</strong> faturamento@marineseguros.com.br</p>
              <p><strong>Senha:</strong> Solicite ao desenvolvedor para configurar</p>
            </div>
            <div className="text-xs text-muted-foreground">
              <p>💡 Para criar seu próprio usuário administrador:</p>
              <p>1. Acesse Authentication &gt; Users no painel Supabase</p>
              <p>2. Crie um novo usuário com email e senha</p>
              <p>3. Adicione um registro na tabela 'profiles' com papel 'Administrador'</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};